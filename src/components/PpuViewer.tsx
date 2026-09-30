import React, { useRef, useEffect, useState } from 'react';
import { NESGraphicsData, SubPalette } from '../types/nes';
import { NES_MASTER_PALETTE } from '../utils/nesPalette';
import {
  Tv,
  Grid3X3,
  Layers,
  ZoomIn,
  Palette as PaletteIcon,
  Eye,
  Info,
} from 'lucide-react';

interface PpuViewerProps {
  graphics: NESGraphicsData | null;
  onUpdateSubpaletteColor?: (subpalId: number, colorSlot: number, newNesColorIndex: number) => void;
}

export const PpuViewer: React.FC<PpuViewerProps> = ({
  graphics,
  onUpdateSubpaletteColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [crtEffect, setCrtEffect] = useState<boolean>(true);
  const [showTileGrid, setShowTileGrid] = useState<boolean>(false);
  const [showAttrGrid, setShowAttrGrid] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(2); // 1, 2, 3
  const [patternTableIndex, setPatternTableIndex] = useState<number>(0); // 0 = $0000, 1 = $1000
  const [activePaletteIndex, setActivePaletteIndex] = useState<number>(0); // 0..3 for pattern preview

  const [hoveredTile, setHoveredTile] = useState<{
    tx: number;
    ty: number;
    tileId: number;
    attrSubpal: number;
    nesColor: number;
  } | null>(null);

  const [editingPaletteSlot, setEditingPaletteSlot] = useState<{
    subpalId: number;
    slot: number;
  } | null>(null);

  // Render main NES 256x240 screen
  useEffect(() => {
    if (!graphics || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (graphics.previewImageData) {
      ctx.putImageData(graphics.previewImageData, 0, 0);
    }
  }, [graphics]);

  // Render 128x128 Pattern Table ($0000-$0FFF or $1000-$1FFF)
  useEffect(() => {
    if (!graphics || !patternCanvasRef.current) return;
    const canvas = patternCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const patternW = 128;
    const patternH = 128;
    const imgData = ctx.createImageData(patternW, patternH);

    const baseTileOffset = patternTableIndex * 256;
    const pal = graphics.subPalettes[activePaletteIndex].colors;

    // 16x16 tiles of 8x8 pixels = 128x128 pixels
    for (let ty = 0; ty < 16; ty++) {
      for (let tx = 0; tx < 16; tx++) {
        const tileIndex = baseTileOffset + ty * 16 + tx;
        const byteOffset = tileIndex * 16;

        // Decode 16 bytes (2bpp planar)
        for (let row = 0; row < 8; row++) {
          const plane0 = graphics.patternTable[byteOffset + row] || 0;
          const plane1 = graphics.patternTable[byteOffset + row + 8] || 0;

          for (let col = 0; col < 8; col++) {
            const shift = 7 - col;
            const bit0 = (plane0 >> shift) & 1;
            const bit1 = (plane1 >> shift) & 1;
            const color2bit = bit0 | (bit1 << 1);

            const nesColorIdx = pal[color2bit];
            const nesCol = NES_MASTER_PALETTE[nesColorIdx] || NES_MASTER_PALETTE[0x0F];

            const px = tx * 8 + col;
            const py = ty * 8 + row;
            const pixelIdx = (py * patternW + px) * 4;

            imgData.data[pixelIdx + 0] = nesCol.r;
            imgData.data[pixelIdx + 1] = nesCol.g;
            imgData.data[pixelIdx + 2] = nesCol.b;
            imgData.data[pixelIdx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [graphics, patternTableIndex, activePaletteIndex]);

  // Handle mouse move over canvas to show tile coordinates and attribute metadata
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graphics || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 256 / rect.width;
    const scaleY = 240 / rect.height;

    const x = Math.max(0, Math.min(255, Math.floor((e.clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(239, Math.floor((e.clientY - rect.top) * scaleY)));

    const tx = Math.floor(x / 8);
    const ty = Math.floor(y / 8);
    const bx = Math.floor(x / 16);
    const by = Math.floor(y / 16);

    const tileId = graphics.nametable[ty * 32 + tx] ?? 0;

    // Calculate attribute quadrant
    const attrByteIdx = Math.floor(by / 2) * 8 + Math.floor(bx / 2);
    const attrByte = graphics.attributeTable[attrByteIdx] || 0;
    const quadrant = ((by % 2) << 1) | (bx % 2);
    const subpalId = (attrByte >> (quadrant * 2)) & 0x03;

    setHoveredTile({
      tx,
      ty,
      tileId,
      attrSubpal: subpalId,
      nesColor: graphics.subPalettes[subpalId]?.colors[0] ?? 0x0F,
    });
  };

  const handleMouseLeave = () => {
    setHoveredTile(null);
  };

  if (!graphics) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-neutral-400">
        No graphics generated yet. Load a sample preset or upload an image to view PPU output.
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>NES 2C02 PPU Screen Display</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                256×240 NTSC
              </span>
            </h2>
            <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
              <span>{graphics.uniqueTilesCount} Unique Tiles Used</span>
              <span>·</span>
              <span>{graphics.uniqueTilesCount <= 256 ? 'Fits 1 Pattern Table' : 'Uses Both Pattern Tables'}</span>
            </div>
          </div>
        </div>

        {/* Viewport Display Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCrtEffect(!crtEffect)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              crtEffect
                ? 'bg-rose-600/20 border-rose-500/50 text-rose-300'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>CRT Scanlines</span>
          </button>

          <button
            onClick={() => setShowTileGrid(!showTileGrid)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              showTileGrid
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>8×8 Tiles</span>
          </button>

          <button
            onClick={() => setShowAttrGrid(!showAttrGrid)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              showAttrGrid
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>16×16 Attributes</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {[1, 2, 3].map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-2 py-1 text-[11px] font-mono rounded ${
                  zoomLevel === z
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Screen & Inspection Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Main Canvas Viewport (8 Cols on XL) */}
        <div className="xl:col-span-8 flex flex-col items-center justify-center p-4 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden relative">
          <div
            className="relative select-none transition-all duration-150"
            style={{
              width: 256 * zoomLevel,
              height: 240 * zoomLevel,
            }}
          >
            {/* Real Canvas */}
            <canvas
              ref={canvasRef}
              width={256}
              height={240}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                imageRendering: 'pixelated',
                width: '100%',
                height: '100%',
              }}
              className="block cursor-crosshair rounded"
            />

            {/* 8x8 Tile Grid Overlay */}
            {showTileGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)`,
                  backgroundSize: `${8 * zoomLevel}px ${8 * zoomLevel}px`,
                }}
              />
            )}

            {/* 16x16 Attribute Block Overlay */}
            {showAttrGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(244,63,94,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,63,94,0.3) 1px, transparent 1px)`,
                  backgroundSize: `${16 * zoomLevel}px ${16 * zoomLevel}px`,
                }}
              />
            )}

            {/* Authentic CRT Scanline Simulation */}
            {crtEffect && (
              <div
                className="absolute inset-0 pointer-events-none rounded mix-blend-overlay opacity-75"
                style={{
                  backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent ${zoomLevel * 2}px)`,
                }}
              />
            )}
          </div>

          {/* Tile Hover Tooltip / Status Strip */}
          <div className="w-full mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            {hoveredTile ? (
              <div className="flex flex-wrap items-center gap-3 text-neutral-300">
                <span>
                  Tile: <strong className="text-rose-400">({hoveredTile.tx}, {hoveredTile.ty})</strong>
                </span>
                <span>
                  Tile ID: <strong className="text-blue-400">0x{hoveredTile.tileId.toString(16).padStart(2, '0').toUpperCase()}</strong> ({hoveredTile.tileId})
                </span>
                <span>
                  Subpalette: <strong className="text-emerald-400">#{hoveredTile.attrSubpal}</strong>
                </span>
              </div>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Hover cursor over the screen to inspect individual tile indices and attribute blocks
              </span>
            )}

            <div className="text-neutral-400 text-[11px]">
              32×30 Nametable · 1024B Total
            </div>
          </div>
        </div>

        {/* Right Side: Subpalettes & Pattern Table Viewer (4 Cols on XL) */}
        <div className="xl:col-span-4 space-y-5">
          {/* Subpalette Display */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <PaletteIcon className="w-3.5 h-3.5 text-rose-400" />
                <span>NES Subpalettes (4×4 Colors)</span>
              </h3>
              <span className="text-[10px] text-neutral-400">Click swatch to reassign</span>
            </div>

            <div className="space-y-2.5">
              {graphics.subPalettes.map((subpal) => (
                <div key={subpal.id} className="p-2 bg-neutral-900/80 rounded-lg border border-neutral-800 text-xs">
                  <div className="flex items-center justify-between mb-1.5 text-[11px] text-neutral-400">
                    <span className="font-mono">Subpalette #{subpal.id}</span>
                    <span className="text-[10px]">{subpal.id === 0 ? 'Backdrop + 3 Accent' : 'Shared Backdrop'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {subpal.colors.map((colorIndex, slot) => {
                      const colorObj = NES_MASTER_PALETTE[colorIndex] || NES_MASTER_PALETTE[0x0F];
                      return (
                        <button
                          key={slot}
                          onClick={() => setEditingPaletteSlot({ subpalId: subpal.id, slot })}
                          className="group relative flex flex-col items-center p-1 rounded border border-neutral-700/60 hover:border-rose-500 transition-all text-left"
                          title={`${colorObj.name} ($${colorIndex.toString(16).padStart(2, '0').toUpperCase()})`}
                        >
                          <div
                            className="w-full h-6 rounded shadow-inner mb-1"
                            style={{ backgroundColor: colorObj.hex }}
                          />
                          <span className="text-[10px] font-mono text-neutral-300">
                            ${colorIndex.toString(16).padStart(2, '0').toUpperCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHR Pattern Table Viewer */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <h3 className="text-xs font-semibold text-neutral-200">
                  CHR Pattern Table
                </h3>
              </div>
              {/* Tab between Table 0 and Table 1 */}
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-[10px] font-mono">
                <button
                  onClick={() => setPatternTableIndex(0)}
                  className={`px-1.5 py-0.5 rounded ${patternTableIndex === 0 ? 'bg-rose-600 text-white' : 'text-neutral-400'}`}
                >
                  $0000
                </button>
                <button
                  onClick={() => setPatternTableIndex(1)}
                  className={`px-1.5 py-0.5 rounded ${patternTableIndex === 1 ? 'bg-rose-600 text-white' : 'text-neutral-400'}`}
                >
                  $1000
                </button>
              </div>
            </div>

            {/* Pattern Table Canvas */}
            <div className="flex flex-col items-center justify-center p-2 bg-neutral-900/50 rounded-lg border border-neutral-800">
              <canvas
                ref={patternCanvasRef}
                width={128}
                height={128}
                style={{ imageRendering: 'pixelated' }}
                className="w-48 h-48 rounded border border-neutral-800 bg-black"
              />
            </div>

            {/* Palette Preview Selector for Pattern Table */}
            <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
              <span>Preview Subpalette:</span>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                {[0, 1, 2, 3].map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePaletteIndex(p)}
                    className={`w-6 h-6 rounded flex items-center justify-center border ${
                      activePaletteIndex === p
                        ? 'border-rose-500 bg-rose-950/60 text-white font-bold'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    #{p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Palette Color Picker Modal */}
      {editingPaletteSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Select Master NES Color
                </h3>
                <p className="text-xs text-neutral-400">
                  Subpalette #{editingPaletteSlot.subpalId}, Slot #{editingPaletteSlot.slot}
                </p>
              </div>
              <button
                onClick={() => setEditingPaletteSlot(null)}
                className="text-xs text-neutral-400 hover:text-neutral-100 p-1"
              >
                ✕ Close
              </button>
            </div>

            {/* 64 Master Palette Color Swatches */}
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 p-2 bg-neutral-950 rounded-lg border border-neutral-800">
              {NES_MASTER_PALETTE.map((col) => (
                <button
                  key={col.index}
                  onClick={() => {
                    if (onUpdateSubpaletteColor) {
                      onUpdateSubpaletteColor(
                        editingPaletteSlot.subpalId,
                        editingPaletteSlot.slot,
                        col.index
                      );
                    }
                    setEditingPaletteSlot(null);
                  }}
                  className="group relative flex flex-col items-center p-1 rounded hover:scale-110 hover:z-10 transition-transform"
                  title={`${col.name} ($${col.index.toString(16).padStart(2, '0').toUpperCase()})`}
                >
                  <div
                    className="w-5 h-5 rounded shadow"
                    style={{ backgroundColor: col.hex }}
                  />
                  <span className="text-[8px] font-mono text-neutral-400 mt-0.5">
                    ${col.index.toString(16).padStart(2, '0').toUpperCase()}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEditingPaletteSlot(null)}
                className="px-4 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
