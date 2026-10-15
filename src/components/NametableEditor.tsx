import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { NESGraphicsData, SubPalette } from '../types/nes';
import { NES_MASTER_PALETTE } from '../utils/nesPalette';
import {
  renderFullNametableImage,
  renderSingleTileImage,
  floodFillNametable,
  setAttributeSubpalette,
} from '../utils/nametableRenderer';
import {
  Grid,
  Paintbrush,
  Pipette,
  Undo2,
  Redo2,
  Trash2,
  Maximize2,
  Layers,
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  ZoomIn,
  Square,
  Crosshair,
  FileCheck,
} from 'lucide-react';

interface NametableEditorProps {
  graphics: NESGraphicsData | null;
  onUpdateGraphics: (updated: NESGraphicsData) => void;
  onResetToOriginal?: () => void;
}

type EditorTool = 'brush' | 'fill' | 'eyedropper' | 'attribute';

interface HistoryState {
  nametable: Uint8Array;
  attributeTable: Uint8Array;
}

export const NametableEditor: React.FC<NametableEditorProps> = ({
  graphics,
  onUpdateGraphics,
  onResetToOriginal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tilePickerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tools & State
  const [activeTool, setActiveTool] = useState<EditorTool>('brush');
  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [selectedAttrSubpalette, setSelectedAttrSubpalette] = useState<number>(0);
  const [activePatternTable, setActivePatternTable] = useState<number>(0); // 0 = $0000, 1 = $1000
  const [zoomLevel, setZoomLevel] = useState<number>(2); // 1x, 2x, 3x
  const [showTileGrid, setShowTileGrid] = useState<boolean>(true);
  const [showAttrGrid, setShowAttrGrid] = useState<boolean>(false);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  // Hover coordinate info
  const [hoveredCell, setHoveredCell] = useState<{
    tx: number;
    ty: number;
    tileId: number;
    subpalId: number;
    ppuAddr: string;
  } | null>(null);

  // Undo / Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Push current state to undo history before an edit
  const pushHistory = useCallback(
    (nametable: Uint8Array, attributeTable: Uint8Array) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, { nametable: new Uint8Array(nametable), attributeTable: new Uint8Array(attributeTable) }];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Undo action
  const handleUndo = () => {
    if (historyIndex <= 0 || !graphics) return;
    const targetState = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);

    const updatedGraphics: NESGraphicsData = {
      ...graphics,
      nametable: new Uint8Array(targetState.nametable),
      attributeTable: new Uint8Array(targetState.attributeTable),
    };
    updatedGraphics.previewImageData = renderFullNametableImage(updatedGraphics);
    onUpdateGraphics(updatedGraphics);
  };

  // Redo action
  const handleRedo = () => {
    if (historyIndex >= history.length - 1 || !graphics) return;
    const targetState = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);

    const updatedGraphics: NESGraphicsData = {
      ...graphics,
      nametable: new Uint8Array(targetState.nametable),
      attributeTable: new Uint8Array(targetState.attributeTable),
    };
    updatedGraphics.previewImageData = renderFullNametableImage(updatedGraphics);
    onUpdateGraphics(updatedGraphics);
  };

  // Initialize history when graphics are first loaded
  useEffect(() => {
    if (graphics && history.length === 0) {
      setHistory([{
        nametable: new Uint8Array(graphics.nametable),
        attributeTable: new Uint8Array(graphics.attributeTable),
      }]);
      setHistoryIndex(0);
    }
  }, [graphics, history.length]);

  // Re-render main 256x240 screen when graphics change
  useEffect(() => {
    if (!graphics || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = renderFullNametableImage(graphics);
    ctx.putImageData(img, 0, 0);
  }, [graphics]);

  // Render CHR tile picker (16x16 tiles = 256 tiles per pattern table)
  useEffect(() => {
    if (!graphics || !tilePickerCanvasRef.current) return;
    const canvas = tilePickerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pickerImg = ctx.createImageData(128, 128);
    const data = pickerImg.data;
    const pal = graphics.subPalettes[selectedAttrSubpalette]?.colors || graphics.subPalettes[0].colors;
    const baseOffset = activePatternTable * 256;

    for (let ty = 0; ty < 16; ty++) {
      for (let tx = 0; tx < 16; tx++) {
        const tileIndex = baseOffset + ty * 16 + tx;
        const byteOffset = tileIndex * 16;

        for (let row = 0; row < 8; row++) {
          const plane0 = graphics.patternTable[byteOffset + row] || 0;
          const plane1 = graphics.patternTable[byteOffset + row + 8] || 0;

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

    ctx.putImageData(pickerImg, 0, 0);
  }, [graphics, activePatternTable, selectedAttrSubpalette]);

  // Apply tool edit at tile coordinate (tx, ty)
  const applyToolAt = useCallback(
    (tx: number, ty: number) => {
      if (!graphics || tx < 0 || tx >= 32 || ty < 0 || ty >= 30) return;

      const currentTile = graphics.nametable[ty * 32 + tx];

      if (activeTool === 'eyedropper') {
        setSelectedTileId(currentTile);
        // Also sample subpalette
        const bx = Math.floor(tx / 2);
        const by = Math.floor(ty / 2);
        const attrIdx = Math.floor(by / 2) * 8 + Math.floor(bx / 2);
        const attrByte = graphics.attributeTable[attrIdx] || 0;
        const quadrant = ((by % 2) << 1) | (bx % 2);
        const subpalId = (attrByte >> (quadrant * 2)) & 0x03;
        setSelectedAttrSubpalette(subpalId);
        setActiveTool('brush');
        return;
      }

      if (activeTool === 'brush') {
        if (currentTile === selectedTileId) return; // No change needed
        pushHistory(graphics.nametable, graphics.attributeTable);

        const newNametable = new Uint8Array(graphics.nametable);
        newNametable[ty * 32 + tx] = selectedTileId;

        const updated: NESGraphicsData = {
          ...graphics,
          nametable: newNametable,
        };
        updated.previewImageData = renderFullNametableImage(updated);
        onUpdateGraphics(updated);
      } else if (activeTool === 'fill') {
        if (currentTile === selectedTileId) return;
        pushHistory(graphics.nametable, graphics.attributeTable);

        const filled = floodFillNametable(graphics.nametable, tx, ty, selectedTileId);
        const updated: NESGraphicsData = {
          ...graphics,
          nametable: filled,
        };
        updated.previewImageData = renderFullNametableImage(updated);
        onUpdateGraphics(updated);
      } else if (activeTool === 'attribute') {
        pushHistory(graphics.nametable, graphics.attributeTable);
        const updatedAttr = setAttributeSubpalette(
          graphics.attributeTable,
          tx,
          ty,
          selectedAttrSubpalette
        );
        const updated: NESGraphicsData = {
          ...graphics,
          attributeTable: updatedAttr,
        };
        updated.previewImageData = renderFullNametableImage(updated);
        onUpdateGraphics(updated);
      }
    },
    [graphics, activeTool, selectedTileId, selectedAttrSubpalette, pushHistory, onUpdateGraphics]
  );

  // Mouse handlers on main nametable canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true);
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 256 / rect.width;
    const scaleY = 240 / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const tx = Math.floor(x / 8);
    const ty = Math.floor(y / 8);

    applyToolAt(tx, ty);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graphics || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 256 / rect.width;
    const scaleY = 240 / rect.height;

    const x = Math.max(0, Math.min(255, Math.floor((e.clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(239, Math.floor((e.clientY - rect.top) * scaleY)));
    const tx = Math.floor(x / 8);
    const ty = Math.floor(y / 8);

    // Calculate hover information
    const tileId = graphics.nametable[ty * 32 + tx] ?? 0;
    const bx = Math.floor(tx / 2);
    const by = Math.floor(ty / 2);
    const attrIdx = Math.floor(by / 2) * 8 + Math.floor(bx / 2);
    const attrByte = graphics.attributeTable[attrIdx] || 0;
    const quadrant = ((by % 2) << 1) | (bx % 2);
    const subpalId = (attrByte >> (quadrant * 2)) & 0x03;
    const ppuAddr = '$' + (0x2000 + ty * 32 + tx).toString(16).toUpperCase();

    setHoveredCell({ tx, ty, tileId, subpalId, ppuAddr });

    if (isMouseDown && (activeTool === 'brush' || activeTool === 'attribute')) {
      applyToolAt(tx, ty);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleCanvasMouseLeave = () => {
    setIsMouseDown(false);
    setHoveredCell(null);
  };

  // Click on tile picker canvas
  const handleTilePickerClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tilePickerCanvasRef.current) return;
    const rect = tilePickerCanvasRef.current.getBoundingClientRect();
    const scaleX = 128 / rect.width;
    const scaleY = 128 / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const tx = Math.floor(x / 8);
    const ty = Math.floor(y / 8);

    const tileId = ty * 16 + tx;
    setSelectedTileId(tileId);
  };

  // Clear all cells in nametable to blank ($00)
  const handleClearAll = () => {
    if (!graphics) return;
    pushHistory(graphics.nametable, graphics.attributeTable);
    const cleared = new Uint8Array(32 * 30);
    const updated: NESGraphicsData = {
      ...graphics,
      nametable: cleared,
    };
    updated.previewImageData = renderFullNametableImage(updated);
    onUpdateGraphics(updated);
  };

  // Fill entire screen with selected tile
  const handleFillAll = () => {
    if (!graphics) return;
    pushHistory(graphics.nametable, graphics.attributeTable);
    const filled = new Uint8Array(32 * 30);
    filled.fill(selectedTileId);
    const updated: NESGraphicsData = {
      ...graphics,
      nametable: filled,
    };
    updated.previewImageData = renderFullNametableImage(updated);
    onUpdateGraphics(updated);
  };

  // Calculate unique tile usage frequency across screen
  const tileUsageCount = useMemo(() => {
    if (!graphics) return 0;
    let count = 0;
    for (let i = 0; i < graphics.nametable.length; i++) {
      if (graphics.nametable[i] === selectedTileId) count++;
    }
    return count;
  }, [graphics, selectedTileId]);

  if (!graphics) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-neutral-400">
        Load an image or preset to activate the interactive nametable tile editor.
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>Nametable Grid Editor & Tile Placer</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                32×30 Grid ($2000–$23BF)
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Directly place, paint, or flood-fill tiles and configure 16×16 attribute palettes before exporting the ROM.
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
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 border border-neutral-700 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-neutral-800 mx-1" />

          {/* Grid Toggles */}
          <button
            onClick={() => setShowTileGrid(!showTileGrid)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              showTileGrid
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>8×8 Tiles Grid</span>
          </button>

          <button
            onClick={() => setShowAttrGrid(!showAttrGrid)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              showAttrGrid
                ? 'bg-rose-600/20 border-rose-500/50 text-rose-300'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>16×16 Attr Grid</span>
          </button>

          {/* Zoom Level */}
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

          {/* Reset button if available */}
          {onResetToOriginal && (
            <button
              onClick={onResetToOriginal}
              className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors flex items-center gap-1"
              title="Re-run image quantization"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout: Tool Palette + Interactive Canvas + CHR Library */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Toolbar & Tool Controls (2 Cols on XL) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Tool Modes */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2.5">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
              Placement Tools
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setActiveTool('brush')}
                className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
                  activeTool === 'brush'
                    ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Paintbrush className="w-4 h-4 shrink-0" />
                <span>Tile Brush</span>
              </button>

              <button
                onClick={() => setActiveTool('fill')}
                className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
                  activeTool === 'fill'
                    ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Flood Fill</span>
              </button>

              <button
                onClick={() => setActiveTool('eyedropper')}
                className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
                  activeTool === 'eyedropper'
                    ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Pipette className="w-4 h-4 shrink-0" />
                <span>Eyedropper</span>
              </button>

              <button
                onClick={() => setActiveTool('attribute')}
                className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
                  activeTool === 'attribute'
                    ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Attr 16×16</span>
              </button>
            </div>
          </div>

          {/* Active Brush / Stamp Preview */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300">Active Selected Tile</span>
              <span className="font-mono text-amber-400 font-bold">
                ${selectedTileId.toString(16).padStart(2, '0').toUpperCase()} ({selectedTileId})
              </span>
            </div>

            <div className="flex items-center gap-3 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              {/* Scaled preview of selected tile */}
              <div className="w-12 h-12 bg-black border border-neutral-700 rounded overflow-hidden flex items-center justify-center shrink-0">
                <canvas
                  ref={(canvas) => {
                    if (canvas && graphics) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        const img = renderSingleTileImage(
                          selectedTileId,
                          graphics.patternTable,
                          graphics.subPalettes[selectedAttrSubpalette]
                        );
                        ctx.putImageData(img, 0, 0);
                      }
                    }
                  }}
                  width={8}
                  height={8}
                  style={{ imageRendering: 'pixelated', width: 48, height: 48 }}
                />
              </div>

              <div className="space-y-1 text-[11px] font-mono text-neutral-300 leading-tight">
                <div>Table: {activePatternTable === 0 ? '$0000' : '$1000'}</div>
                <div>Screen Count: <strong className="text-amber-400">{tileUsageCount}</strong> tiles</div>
                <div className="text-[10px] text-neutral-400">
                  Subpalette: #{selectedAttrSubpalette}
                </div>
              </div>
            </div>

            {/* Quick Bulk Fill Actions */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={handleFillAll}
                className="py-1 px-2 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
                title="Fill all 960 screen tiles with the active tile"
              >
                Fill Whole Screen
              </button>
              <button
                onClick={handleClearAll}
                className="py-1 px-2 text-[11px] font-medium bg-neutral-900 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-300 rounded border border-neutral-800 hover:border-rose-900/50 transition-colors flex items-center justify-center gap-1"
                title="Clear screen to tile $00"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear ($00)</span>
              </button>
            </div>
          </div>

          {/* Subpalette Selector for Attribute & Painting */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-rose-400" />
                <span>Active Subpalette</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                #{selectedAttrSubpalette}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((subId) => {
                const sub = graphics.subPalettes[subId];
                const isSelected = selectedAttrSubpalette === subId;
                return (
                  <button
                    key={subId}
                    onClick={() => setSelectedAttrSubpalette(subId)}
                    className={`p-1.5 rounded-lg border text-left flex flex-col items-center transition-all ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/50 text-white'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold mb-1">#{subId}</span>
                    <div className="grid grid-cols-2 gap-0.5 w-full">
                      {sub.colors.map((c, idx) => (
                        <div
                          key={idx}
                          className="w-full h-2.5 rounded-xs"
                          style={{ backgroundColor: NES_MASTER_PALETTE[c]?.hex || '#000' }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-neutral-400 leading-tight pt-1">
              Used when painting 16×16 attributes or previewing CHR pattern tiles.
            </p>
          </div>
        </div>

        {/* Center: Interactive Nametable Canvas Viewport (6 Cols on XL) */}
        <div className="xl:col-span-6 flex flex-col items-center justify-center p-4 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden relative">
          <div
            className="relative select-none"
            style={{
              width: 256 * zoomLevel,
              height: 240 * zoomLevel,
            }}
          >
            {/* Live Canvas */}
            <canvas
              ref={canvasRef}
              width={256}
              height={240}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
              style={{
                imageRendering: 'pixelated',
                width: '100%',
                height: '100%',
              }}
              className={`block rounded ${
                activeTool === 'eyedropper' ? 'cursor-copy' : 'cursor-crosshair'
              }`}
            />

            {/* 8×8 Tile Grid Lines */}
            {showTileGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)`,
                  backgroundSize: `${8 * zoomLevel}px ${8 * zoomLevel}px`,
                }}
              />
            )}

            {/* 16×16 Attribute Macroblock Grid Lines */}
            {showAttrGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(244,63,94,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,63,94,0.35) 1px, transparent 1px)`,
                  backgroundSize: `${16 * zoomLevel}px ${16 * zoomLevel}px`,
                }}
              />
            )}

            {/* Hover Bounding Box Cursor */}
            {hoveredCell && (
              <div
                className="absolute pointer-events-none border-2 border-amber-400 bg-amber-400/20 transition-none z-10"
                style={{
                  left: (activeTool === 'attribute' ? Math.floor(hoveredCell.tx / 2) * 16 : hoveredCell.tx * 8) * zoomLevel,
                  top: (activeTool === 'attribute' ? Math.floor(hoveredCell.ty / 2) * 16 : hoveredCell.ty * 8) * zoomLevel,
                  width: (activeTool === 'attribute' ? 16 : 8) * zoomLevel,
                  height: (activeTool === 'attribute' ? 16 : 8) * zoomLevel,
                }}
              />
            )}
          </div>

          {/* Coordinate & PPU Address Bar */}
          <div className="w-full mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            {hoveredCell ? (
              <div className="flex flex-wrap items-center gap-3 text-neutral-300">
                <span>
                  Tile: <strong className="text-amber-400">({hoveredCell.tx}, {hoveredCell.ty})</strong>
                </span>
                <span>
                  Tile ID: <strong className="text-blue-400">${hoveredCell.tileId.toString(16).padStart(2, '0').toUpperCase()}</strong> ({hoveredCell.tileId})
                </span>
                <span>
                  Attr Subpal: <strong className="text-rose-400">#{hoveredCell.subpalId}</strong>
                </span>
                <span className="text-neutral-400">
                  PPU: <strong className="text-emerald-400">{hoveredCell.ppuAddr}</strong>
                </span>
              </div>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" />
                Hover cursor over the screen to inspect and place tiles into the nametable
              </span>
            )}

            <div className="text-neutral-400 text-[11px]">
              Active Tool: <span className="uppercase text-amber-300">{activeTool}</span>
            </div>
          </div>
        </div>

        {/* Right: CHR Pattern Table Tile Library (3 Cols on XL) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>CHR Tile Picker</span>
              </h3>
              {/* Pattern table toggle */}
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-[10px] font-mono">
                <button
                  onClick={() => setActivePatternTable(0)}
                  className={`px-1.5 py-0.5 rounded ${
                    activePatternTable === 0 ? 'bg-amber-600 text-white font-bold' : 'text-neutral-400'
                  }`}
                >
                  $0000
                </button>
                <button
                  onClick={() => setActivePatternTable(1)}
                  className={`px-1.5 py-0.5 rounded ${
                    activePatternTable === 1 ? 'bg-amber-600 text-white font-bold' : 'text-neutral-400'
                  }`}
                >
                  $1000
                </button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400">
              Click any 8×8 tile below to select it for painting into the nametable.
            </p>

            {/* CHR Pattern Table Canvas (128x128 pixels representing 16x16 tiles) */}
            <div className="flex flex-col items-center justify-center p-2 bg-neutral-900/60 rounded-lg border border-neutral-800 relative">
              <canvas
                ref={tilePickerCanvasRef}
                width={128}
                height={128}
                onClick={handleTilePickerClick}
                style={{ imageRendering: 'pixelated', width: 192, height: 192 }}
                className="rounded border border-neutral-800 cursor-pointer bg-black"
                title="Click any tile to select"
              />

              {/* Highlight box around selected tile in picker */}
              {selectedTileId < 256 && (
                <div
                  className="absolute pointer-events-none border-2 border-amber-400 z-10"
                  style={{
                    left: 8 + (selectedTileId % 16) * 12,
                    top: 8 + Math.floor(selectedTileId / 16) * 12,
                    width: 12,
                    height: 12,
                  }}
                />
              )}
            </div>

            {/* Quick Tile ID Input */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-neutral-400">Jump to Tile ID:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-neutral-400">$</span>
                <input
                  type="text"
                  maxLength={2}
                  value={selectedTileId.toString(16).padStart(2, '0').toUpperCase()}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 16);
                    if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
                      setSelectedTileId(parsed);
                    }
                  }}
                  className="w-12 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-xs font-mono text-center text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Real-time sync feedback callout */}
          <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl text-xs space-y-1 text-amber-200/90">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Real-Time ROM Sync</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Every edit to this nametable immediately updates the bootable 6502 ROM payload, the PPU display, and the ROM binary layout before export.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
