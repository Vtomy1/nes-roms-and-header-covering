import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NESGraphicsData, SubPalette } from '../types/nes';
import { NES_MASTER_PALETTE } from '../utils/nesPalette';
import { encodeTile2bpp, decodeTile2bpp } from '../utils/imageToNes';
import { renderFullNametableImage } from '../utils/nametableRenderer';
import {
  Layers,
  Edit3,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Undo2,
  Redo2,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Hash,
  Eye,
  Check,
  Binary,
  Palette,
  Info,
} from 'lucide-react';

interface PatternTableEditorProps {
  graphics: NESGraphicsData | null;
  onUpdateGraphics: (updated: NESGraphicsData) => void;
}

interface TileHistoryState {
  tileId: number;
  pixels: Uint8Array; // 64 elements (0..3)
}

export const PatternTableEditor: React.FC<PatternTableEditorProps> = ({
  graphics,
  onUpdateGraphics,
}) => {
  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [activePatternTable, setActivePatternTable] = useState<number>(0); // 0 = $0000, 1 = $1000
  const [activeDrawColor, setActiveDrawColor] = useState<number>(1); // 0, 1, 2, 3
  const [drawMode, setDrawMode] = useState<'paint' | 'cycle'>('paint'); // 'paint' with activeDrawColor or 'cycle' 0->1->2->3->0
  const [previewSubpaletteId, setPreviewSubpaletteId] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number; val: number } | null>(null);

  const tileSheetCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Effective tile ID in 0..511 range
  const fullTileId = activePatternTable * 256 + (selectedTileId % 256);

  // Extract current 64 pixels (0..3) for selected tile from patternTable
  const currentPixels = useMemo(() => {
    if (!graphics) return new Uint8Array(64);
    const byteOffset = fullTileId * 16;
    const tileBytes = graphics.patternTable.subarray(byteOffset, byteOffset + 16);
    return decodeTile2bpp(tileBytes);
  }, [graphics, fullTileId]);

  // Working copy of 64 pixels for immediate interactive editing
  const [pixels, setPixels] = useState<Uint8Array>(new Uint8Array(64));

  // Sync working pixels whenever selected tile changes or graphics reload
  useEffect(() => {
    setPixels(new Uint8Array(currentPixels));
  }, [currentPixels, fullTileId]);

  // Undo / Redo history for tile edits
  const [history, setHistory] = useState<TileHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Push to history
  const pushHistory = useCallback((tileId: number, currentPx: Uint8Array) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, { tileId, pixels: new Uint8Array(currentPx) }];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Commit updated 64 pixels to the global graphics state
  const commitPixels = useCallback(
    (newPixels: Uint8Array) => {
      if (!graphics) return;

      const encodedBytes = encodeTile2bpp(newPixels);
      const newPatternTable = new Uint8Array(graphics.patternTable);
      const byteOffset = fullTileId * 16;
      newPatternTable.set(encodedBytes, byteOffset);

      const updatedGraphics: NESGraphicsData = {
        ...graphics,
        patternTable: newPatternTable,
      };
      // Re-render full nametable image preview
      updatedGraphics.previewImageData = renderFullNametableImage(updatedGraphics);
      onUpdateGraphics(updatedGraphics);
    },
    [graphics, fullTileId, onUpdateGraphics]
  );

  // Handle Undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
    setSelectedTileId(prev.tileId % 256);
    setActivePatternTable(Math.floor(prev.tileId / 256));
    setPixels(new Uint8Array(prev.pixels));
    commitPixels(prev.pixels);
  }, [historyIndex, history, commitPixels]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
    setSelectedTileId(next.tileId % 256);
    setActivePatternTable(Math.floor(next.tileId / 256));
    setPixels(new Uint8Array(next.pixels));
    commitPixels(next.pixels);
  }, [historyIndex, history, commitPixels]);

  // Modify pixel at (px, py)
  const setPixelAt = useCallback(
    (px: number, py: number) => {
      if (px < 0 || px >= 8 || py < 0 || py >= 8) return;
      const idx = py * 8 + px;
      const oldVal = pixels[idx];

      let newVal = activeDrawColor;
      if (drawMode === 'cycle') {
        newVal = (oldVal + 1) % 4;
      } else {
        if (oldVal === activeDrawColor) return; // No change needed
      }

      pushHistory(fullTileId, pixels);

      const nextPixels = new Uint8Array(pixels);
      nextPixels[idx] = newVal;
      setPixels(nextPixels);
      commitPixels(nextPixels);
    },
    [pixels, activeDrawColor, drawMode, fullTileId, pushHistory, commitPixels]
  );

  // Render 16x16 tile sheet for the active pattern table ($0000 or $1000)
  useEffect(() => {
    if (!graphics || !tileSheetCanvasRef.current) return;
    const canvas = tileSheetCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sheetImg = ctx.createImageData(128, 128);
    const data = sheetImg.data;
    const pal = graphics.subPalettes[previewSubpaletteId]?.colors || graphics.subPalettes[0].colors;
    const baseOffset = activePatternTable * 256;

    for (let ty = 0; ty < 16; ty++) {
      for (let tx = 0; tx < 16; tx++) {
        const tIndex = baseOffset + ty * 16 + tx;
        const bOffset = tIndex * 16;

        for (let row = 0; row < 8; row++) {
          const plane0 = graphics.patternTable[bOffset + row] || 0;
          const plane1 = graphics.patternTable[bOffset + row + 8] || 0;

          for (let col = 0; col < 8; col++) {
            const shift = 7 - col;
            const bit0 = (plane0 >> shift) & 1;
            const bit1 = (plane1 >> shift) & 1;
            const color2bit = bit0 | (bit1 << 1);

            const nesCol = NES_MASTER_PALETTE[pal[color2bit]] || NES_MASTER_PALETTE[0x0F];
            const px = tx * 8 + col;
            const py = ty * 8 + row;
            const idx = (py * 128 + px) * 4;

            data[idx + 0] = nesCol.r;
            data[idx + 1] = nesCol.g;
            data[idx + 2] = nesCol.b;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(sheetImg, 0, 0);
  }, [graphics, activePatternTable, previewSubpaletteId, pixels]);

  // Click on tile sheet canvas to pick tile
  const handleTileSheetClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tileSheetCanvasRef.current) return;
    const rect = tileSheetCanvasRef.current.getBoundingClientRect();
    const scaleX = 128 / rect.width;
    const scaleY = 128 / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const tx = Math.floor(x / 8);
    const ty = Math.floor(y / 8);

    const tileId = ty * 16 + tx;
    setSelectedTileId(tileId);
  };

  // Transformations
  const rotateTile90 = useCallback(() => {
    pushHistory(fullTileId, pixels);
    const rotated = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        rotated[x * 8 + (7 - y)] = pixels[y * 8 + x];
      }
    }
    setPixels(rotated);
    commitPixels(rotated);
  }, [fullTileId, pixels, pushHistory, commitPixels]);

  const flipTileH = useCallback(() => {
    pushHistory(fullTileId, pixels);
    const flipped = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        flipped[y * 8 + (7 - x)] = pixels[y * 8 + x];
      }
    }
    setPixels(flipped);
    commitPixels(flipped);
  }, [fullTileId, pixels, pushHistory, commitPixels]);

  const flipTileV = useCallback(() => {
    pushHistory(fullTileId, pixels);
    const flipped = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        flipped[(7 - y) * 8 + x] = pixels[y * 8 + x];
      }
    }
    setPixels(flipped);
    commitPixels(flipped);
  }, [fullTileId, pixels, pushHistory, commitPixels]);

  // Keyboard shortcuts for H-flip, V-flip, Rotate, Undo, Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          flipTileH();
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          flipTileV();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          rotateTile90();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, flipTileH, flipTileV, rotateTile90]);

  const shiftTile = (dx: number, dy: number) => {
    pushHistory(fullTileId, pixels);
    const shifted = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const nx = (x + dx + 8) % 8;
        const ny = (y + dy + 8) % 8;
        shifted[ny * 8 + nx] = pixels[y * 8 + x];
      }
    }
    setPixels(shifted);
    commitPixels(shifted);
  };

  const invertColors = () => {
    pushHistory(fullTileId, pixels);
    const inverted = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      inverted[i] = (pixels[i] + 1) % 4;
    }
    setPixels(inverted);
    commitPixels(inverted);
  };

  const clearTile = () => {
    pushHistory(fullTileId, pixels);
    const cleared = new Uint8Array(64);
    setPixels(cleared);
    commitPixels(cleared);
  };

  const fillTile = () => {
    pushHistory(fullTileId, pixels);
    const filled = new Uint8Array(64);
    filled.fill(activeDrawColor);
    setPixels(filled);
    commitPixels(filled);
  };

  // Count how many times this tile is referenced in the nametable
  const screenUsageCount = useMemo(() => {
    if (!graphics) return 0;
    let count = 0;
    const targetId = selectedTileId % 256;
    for (let i = 0; i < graphics.nametable.length; i++) {
      if (graphics.nametable[i] === targetId) count++;
    }
    return count;
  }, [graphics, selectedTileId]);

  // Calculate raw 16 bytes for 2bpp inspector
  const currentTileBytes = useMemo(() => {
    return encodeTile2bpp(pixels);
  }, [pixels]);

  // Active subpalette colors
  const activeSubpal = graphics?.subPalettes[previewSubpaletteId] || {
    id: 0,
    colors: [0x0F, 0x16, 0x27, 0x30],
  };

  if (!graphics) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-neutral-400">
        Load an image or preset to activate the Pattern Table (Tile Pixel) Editor.
      </div>
    );
  }

  const ppuChrAddress = '$' + (activePatternTable * 0x1000 + (selectedTileId % 256) * 16).toString(16).padStart(4, '0').toUpperCase();

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>Pattern Table Editor (8×8 Tile Pixel Studio)</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                CHR VRAM {ppuChrAddress}
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Modify individual 8×8 pixel patterns in 2bpp planar format with real-time PPU & ROM synchronization.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 border border-neutral-700 transition-colors"
            title="Undo Tile Edit (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 border border-neutral-700 transition-colors"
            title="Redo Tile Edit (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-neutral-800 mx-1" />

          {/* Previous / Next Tile */}
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            <button
              onClick={() => setSelectedTileId((prev) => (prev > 0 ? prev - 1 : 255))}
              className="p-1 text-neutral-400 hover:text-white rounded"
              title="Previous Tile (Tile ID - 1)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-cyan-300 px-1.5">
              ${(selectedTileId % 256).toString(16).padStart(2, '0').toUpperCase()}
            </span>
            <button
              onClick={() => setSelectedTileId((prev) => (prev < 255 ? prev + 1 : 0))}
              className="p-1 text-neutral-400 hover:text-white rounded"
              title="Next Tile (Tile ID + 1)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Pattern Table Switcher ($0000 vs $1000) */}
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px] font-mono">
            <button
              onClick={() => setActivePatternTable(0)}
              className={`px-2 py-1 rounded transition-colors ${
                activePatternTable === 0 ? 'bg-cyan-600 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Table $0000
            </button>
            <button
              onClick={() => setActivePatternTable(1)}
              className={`px-2 py-1 rounded transition-colors ${
                activePatternTable === 1 ? 'bg-cyan-600 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Table $1000
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pixel Color Palette & Tools (3 Cols on XL) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Active 2-Bit Color Swatches */}
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>2-Bit Tile Palette</span>
              </span>
              <span className="text-[10px] text-neutral-400">Subpal #{previewSubpaletteId}</span>
            </div>

            {/* 4 Swatch Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((cIndex) => {
                const nesColorIdx = activeSubpal.colors[cIndex];
                const nesCol = NES_MASTER_PALETTE[nesColorIdx] || NES_MASTER_PALETTE[0x0F];
                const isSelected = activeDrawColor === cIndex && drawMode === 'paint';

                return (
                  <button
                    key={cIndex}
                    onClick={() => {
                      setActiveDrawColor(cIndex);
                      setDrawMode('paint');
                    }}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/50 text-white shadow-sm'
                        : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded shadow border border-black/40 shrink-0"
                      style={{ backgroundColor: nesCol.hex }}
                    />
                    <div className="min-w-0 font-mono leading-tight">
                      <div className="text-[11px] font-bold">
                        Color {cIndex}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        ${nesColorIdx.toString(16).padStart(2, '0').toUpperCase()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mode Toggle: Paint with Color vs Cycle on Click */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-neutral-400">Click Action:</span>
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-[11px]">
                <button
                  onClick={() => setDrawMode('paint')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    drawMode === 'paint' ? 'bg-cyan-600 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Paint Color
                </button>
                <button
                  onClick={() => setDrawMode('cycle')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    drawMode === 'cycle' ? 'bg-cyan-600 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Cycle 0 → 1 → 2 → 3 on click"
                >
                  Cycle (0-3)
                </button>
              </div>
            </div>

            {/* Subpalette Selector for preview */}
            <div className="pt-1 border-t border-neutral-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>Preview Subpalette:</span>
                <span className="font-mono">#{previewSubpaletteId}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[0, 1, 2, 3].map((subId) => (
                  <button
                    key={subId}
                    onClick={() => setPreviewSubpaletteId(subId)}
                    className={`py-1 text-[11px] font-mono rounded border transition-colors ${
                      previewSubpaletteId === subId
                        ? 'bg-cyan-600 border-cyan-500 text-white font-bold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    #{subId}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tile Transformations */}
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2.5">
            <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider text-[11px]">
              Tile Operations
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={rotateTile90}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex flex-col items-center gap-1 transition-colors group"
                title="Rotate 90° Clockwise (Shortcut: R)"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
                <span className="text-[10px]">Rot 90°</span>
              </button>
              <button
                onClick={flipTileH}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex flex-col items-center gap-1 transition-colors group"
                title="Flip Horizontal (Mirror X) (Shortcut: H)"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px]">Flip H (H)</span>
              </button>
              <button
                onClick={flipTileV}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex flex-col items-center gap-1 transition-colors group"
                title="Flip Vertical (Mirror Y) (Shortcut: V)"
              >
                <FlipVertical className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px]">Flip V (V)</span>
              </button>
            </div>

            {/* Shift Directional Buttons */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-neutral-400">Shift 1px (Wrap):</span>
              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={() => shiftTile(0, -1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center"
                  title="Shift Up"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => shiftTile(0, 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center"
                  title="Shift Down"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  onClick={() => shiftTile(-1, 0)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center"
                  title="Shift Left"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => shiftTile(1, 0)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center"
                  title="Shift Right"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Bulk Fill / Clear / Invert */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                onClick={invertColors}
                className="py-1 px-1.5 text-[10px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
                title="Invert / Cycle all colors"
              >
                Cycle
              </button>
              <button
                onClick={fillTile}
                className="py-1 px-1.5 text-[10px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
                title="Fill whole tile with active color"
              >
                Fill All
              </button>
              <button
                onClick={clearTile}
                className="py-1 px-1.5 text-[10px] bg-neutral-900 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-300 rounded border border-neutral-800 hover:border-rose-900/50 transition-colors"
                title="Clear tile to Color 0"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Tile Preview Scaler (1x, 2x, 4x) */}
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
            <span className="text-xs font-semibold text-neutral-200">Scale Preview</span>
            <div className="flex items-center justify-around p-3 bg-neutral-900/80 rounded-lg border border-neutral-800">
              {/* 1x (8x8) */}
              <div className="flex flex-col items-center gap-1 text-[9px] text-neutral-400 font-mono">
                <canvas
                  ref={(c) => {
                    if (!c) return;
                    const ctx = c.getContext('2d');
                    if (!ctx) return;
                    const img = ctx.createImageData(8, 8);
                    for (let i = 0; i < 64; i++) {
                      const col = NES_MASTER_PALETTE[activeSubpal.colors[pixels[i]]] || NES_MASTER_PALETTE[0x0F];
                      img.data[i * 4 + 0] = col.r;
                      img.data[i * 4 + 1] = col.g;
                      img.data[i * 4 + 2] = col.b;
                      img.data[i * 4 + 3] = 255;
                    }
                    ctx.putImageData(img, 0, 0);
                  }}
                  width={8}
                  height={8}
                  className="border border-neutral-700 bg-black"
                />
                <span>1x (8px)</span>
              </div>

              {/* 2x (16x16) */}
              <div className="flex flex-col items-center gap-1 text-[9px] text-neutral-400 font-mono">
                <canvas
                  ref={(c) => {
                    if (!c) return;
                    const ctx = c.getContext('2d');
                    if (!ctx) return;
                    const img = ctx.createImageData(8, 8);
                    for (let i = 0; i < 64; i++) {
                      const col = NES_MASTER_PALETTE[activeSubpal.colors[pixels[i]]] || NES_MASTER_PALETTE[0x0F];
                      img.data[i * 4 + 0] = col.r;
                      img.data[i * 4 + 1] = col.g;
                      img.data[i * 4 + 2] = col.b;
                      img.data[i * 4 + 3] = 255;
                    }
                    ctx.putImageData(img, 0, 0);
                  }}
                  width={8}
                  height={8}
                  style={{ imageRendering: 'pixelated', width: 24, height: 24 }}
                  className="border border-neutral-700 bg-black rounded-xs"
                />
                <span>2x (24px)</span>
              </div>

              {/* 4x (48x48) */}
              <div className="flex flex-col items-center gap-1 text-[9px] text-neutral-400 font-mono">
                <canvas
                  ref={(c) => {
                    if (!c) return;
                    const ctx = c.getContext('2d');
                    if (!ctx) return;
                    const img = ctx.createImageData(8, 8);
                    for (let i = 0; i < 64; i++) {
                      const col = NES_MASTER_PALETTE[activeSubpal.colors[pixels[i]]] || NES_MASTER_PALETTE[0x0F];
                      img.data[i * 4 + 0] = col.r;
                      img.data[i * 4 + 1] = col.g;
                      img.data[i * 4 + 2] = col.b;
                      img.data[i * 4 + 3] = 255;
                    }
                    ctx.putImageData(img, 0, 0);
                  }}
                  width={8}
                  height={8}
                  style={{ imageRendering: 'pixelated', width: 44, height: 44 }}
                  className="border border-neutral-700 bg-black rounded"
                />
                <span>4x (44px)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Interactive 8×8 Pixel Grid Canvas (5 Cols on XL) */}
        <div className="xl:col-span-5 flex flex-col items-center justify-center p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between w-full gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <span>8×8 Pixel Matrix</span>
                <span className="font-mono text-cyan-400">
                  (${selectedTileId.toString(16).padStart(2, '0').toUpperCase()} / {selectedTileId})
                </span>
              </span>

              {/* Direct H-Flip and V-Flip Action Buttons above Canvas */}
              <div className="flex items-center gap-1 ml-1.5">
                <button
                  type="button"
                  onClick={flipTileH}
                  className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-cyan-600/50 text-neutral-300 hover:text-cyan-200 text-[11px] font-medium flex items-center gap-1 transition-colors shadow-xs"
                  title="Flip Tile Horizontally (Shortcut: H)"
                >
                  <FlipHorizontal className="w-3 h-3 text-cyan-400" />
                  <span>H-Flip</span>
                </button>
                <button
                  type="button"
                  onClick={flipTileV}
                  className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-cyan-600/50 text-neutral-300 hover:text-cyan-200 text-[11px] font-medium flex items-center gap-1 transition-colors shadow-xs"
                  title="Flip Tile Vertically (Shortcut: V)"
                >
                  <FlipVertical className="w-3 h-3 text-cyan-400" />
                  <span>V-Flip</span>
                </button>
              </div>
            </div>

            <span className="text-[11px] text-neutral-400 font-mono">
              Screen instances: <strong className="text-cyan-300">{screenUsageCount}</strong>
            </span>
          </div>

          {/* 8×8 Large Interactive Grid */}
          <div
            className="relative select-none p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 shadow-inner"
            onMouseLeave={() => {
              setIsMouseDown(false);
              setHoveredPixel(null);
            }}
            onMouseUp={() => setIsMouseDown(false)}
          >
            {/* Column coordinate numbers */}
            <div className="grid grid-cols-8 gap-1 mb-1.5 text-center font-mono text-[10px] text-neutral-400">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((col) => (
                <div key={col} className="w-8 sm:w-9">
                  {col}
                </div>
              ))}
            </div>

            {/* 8 Rows of 8 Pixels */}
            <div className="flex flex-col gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
                <div key={row} className="flex items-center gap-1.5">
                  {/* Row coordinate number */}
                  <span className="w-3 text-right font-mono text-[10px] text-neutral-400">
                    {row}
                  </span>

                  <div className="grid grid-cols-8 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((col) => {
                      const idx = row * 8 + col;
                      const pixelVal = pixels[idx] ?? 0;
                      const nesColorIdx = activeSubpal.colors[pixelVal];
                      const hexColor = NES_MASTER_PALETTE[nesColorIdx]?.hex || '#000000';
                      const isHovered = hoveredPixel?.x === col && hoveredPixel?.y === row;

                      return (
                        <button
                          key={col}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setIsMouseDown(true);
                            setPixelAt(col, row);
                          }}
                          onMouseEnter={() => {
                            setHoveredPixel({ x: col, y: row, val: pixelVal });
                            if (isMouseDown) {
                              setPixelAt(col, row);
                            }
                          }}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md transition-all relative flex items-center justify-center font-mono text-[10px] font-bold border ${
                            isHovered
                              ? 'scale-105 z-10 ring-2 ring-cyan-400 border-white'
                              : 'border-black/30 hover:border-neutral-500'
                          }`}
                          style={{
                            backgroundColor: hexColor,
                            color: pixelVal >= 2 ? '#000' : '#FFF',
                          }}
                          title={`Pixel (${col}, ${row}): Color ${pixelVal} ($${nesColorIdx.toString(16).padStart(2, '0').toUpperCase()})`}
                        >
                          <span className="opacity-40">{pixelVal}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pixel Status HUD */}
          <div className="w-full pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between text-xs font-mono">
            {hoveredPixel ? (
              <div className="flex items-center gap-3 text-neutral-300">
                <span>
                  Pixel: <strong className="text-cyan-400">({hoveredPixel.x}, {hoveredPixel.y})</strong>
                </span>
                <span>
                  Color: <strong className="text-amber-400">#{hoveredPixel.val}</strong>
                </span>
                <span className="text-[11px] text-neutral-400">
                  Bit0: {(hoveredPixel.val & 1)}, Bit1: {((hoveredPixel.val >> 1) & 1)}
                </span>
              </div>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Click or drag across pixels to toggle / paint patterns
              </span>
            )}

            <div className="text-[11px] text-neutral-400">
              PPU Offset: <span className="text-cyan-400 font-bold">{ppuChrAddress}</span>
            </div>
          </div>
        </div>

        {/* Right Column: CHR Pattern Table Sheet & 2bpp Planar Hex (4 Cols on XL) */}
        <div className="xl:col-span-4 space-y-4">
          {/* CHR 16x16 Tile Sheet Picker */}
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>CHR Tile Library ({activePatternTable === 0 ? '$0000' : '$1000'})</span>
              </h3>
              <span className="text-[10px] text-neutral-400">256 Tiles</span>
            </div>

            <p className="text-[11px] text-neutral-400">
              Click any tile in the bank below to load and modify its pixels.
            </p>

            {/* 128x128 pixel canvas (16x16 tiles of 8x8) */}
            <div className="flex flex-col items-center justify-center p-2 bg-neutral-900/60 rounded-lg border border-neutral-800 relative">
              <canvas
                ref={tileSheetCanvasRef}
                width={128}
                height={128}
                onClick={handleTileSheetClick}
                style={{ imageRendering: 'pixelated', width: 200, height: 200 }}
                className="rounded border border-neutral-800 cursor-pointer bg-black"
                title="Click any tile to load for editing"
              />

              {/* Selected tile indicator box */}
              <div
                className="absolute pointer-events-none border-2 border-cyan-400 z-10 transition-all duration-75"
                style={{
                  left: 8 + ((selectedTileId % 256) % 16) * 12.5,
                  top: 8 + Math.floor((selectedTileId % 256) / 16) * 12.5,
                  width: 12.5,
                  height: 12.5,
                }}
              />
            </div>

            {/* Jump by hex ID input */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-neutral-400">Jump to Tile ID:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-neutral-400">$</span>
                <input
                  type="text"
                  maxLength={2}
                  value={(selectedTileId % 256).toString(16).padStart(2, '0').toUpperCase()}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 16);
                    if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
                      setSelectedTileId(parsed);
                    }
                  }}
                  className="w-12 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-xs font-mono text-center text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* 16-Byte 2bpp Planar Raw Hex Inspector */}
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-indigo-400" />
                <span>NES 2bpp Planar Encoding (16 Bytes)</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Row 0..7</span>
            </div>

            <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 font-mono text-[10px] space-y-1 overflow-x-auto select-text leading-tight">
              <div className="flex justify-between pb-1 mb-1 border-b border-neutral-800 text-neutral-400 font-bold">
                <span>ROW</span>
                <span>PLANE 0 (D0)</span>
                <span>PLANE 1 (D1)</span>
              </div>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => {
                const p0 = currentTileBytes[row];
                const p1 = currentTileBytes[row + 8];
                const p0Hex = '$' + p0.toString(16).padStart(2, '0').toUpperCase();
                const p1Hex = '$' + p1.toString(16).padStart(2, '0').toUpperCase();
                const p0Bin = '%' + p0.toString(2).padStart(8, '0');
                const p1Bin = '%' + p1.toString(2).padStart(8, '0');

                return (
                  <div key={row} className="flex justify-between hover:bg-neutral-800/60 px-1 py-0.5 rounded text-neutral-300">
                    <span className="text-neutral-400">R{row}:</span>
                    <span className="text-blue-300">
                      {p0Hex} <span className="text-neutral-400 hidden sm:inline">{p0Bin}</span>
                    </span>
                    <span className="text-cyan-300">
                      {p1Hex} <span className="text-neutral-400 hidden sm:inline">{p1Bin}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              NES PPU interleaves bitplane 0 (bytes 0–7) and bitplane 1 (bytes 8–15) to compose 2-bit color indices per pixel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
