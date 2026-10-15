import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NESHeader, NESGraphicsData } from '../types/nes';
import {
  RomBlockInfo,
  calculateRomStructure,
  formatOffset,
  formatHexByte,
} from '../utils/romLayout';
import {
  Binary,
  Layers,
  Cpu,
  Search,
  Check,
  Copy,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Info,
  Hash,
  Database,
  ExternalLink,
} from 'lucide-react';

interface RomStructureVisualizerProps {
  romBytes: Uint8Array;
  header: NESHeader;
  graphics: NESGraphicsData | null;
  isGeneratedDisplayer: boolean;
  onSelectBlock?: (blockId: string) => void;
}

export const RomStructureVisualizer: React.FC<RomStructureVisualizerProps> = ({
  romBytes,
  header,
  graphics,
  isGeneratedDisplayer,
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string>('header');
  const [hexStartRow, setHexStartRow] = useState<number>(0);
  const [jumpOffsetInput, setJumpOffsetInput] = useState<string>('');
  const [showCpuAddress, setShowCpuAddress] = useState<boolean>(true);
  const [copiedHex, setCopiedHex] = useState<boolean>(false);
  const hexContainerRef = useRef<HTMLDivElement | null>(null);

  const ROWS_PER_PAGE = 32; // 32 rows * 16 bytes = 512 bytes per page view

  // Calculate ROM structure analysis
  const structure = useMemo(() => {
    return calculateRomStructure(romBytes, header, isGeneratedDisplayer);
  }, [romBytes, header, isGeneratedDisplayer]);

  // Selected block object
  const activeBlock = useMemo(() => {
    return (
      structure.blocks.find((b) => b.id === selectedBlockId) ||
      structure.blocks[0]
    );
  }, [structure, selectedBlockId]);

  // Total 16-byte rows in ROM
  const totalRows = Math.ceil(romBytes.length / 16);

  // When block is selected, jump hex view to its start offset
  const handleSelectBlock = (block: RomBlockInfo) => {
    setSelectedBlockId(block.id);
    const targetRow = Math.floor(block.startOffset / 16);
    setHexStartRow(Math.max(0, Math.min(totalRows - ROWS_PER_PAGE, targetRow)));
  };

  // Jump by input hex offset (e.g. "0x20", "C000", "10")
  const handleJumpOffset = (e: React.FormEvent) => {
    e.preventDefault();
    let clean = jumpOffsetInput.trim().toLowerCase();
    if (clean.startsWith('0x') || clean.startsWith('$')) {
      clean = clean.slice(1).replace('x', '');
    }
    const parsed = parseInt(clean, 16);
    if (!isNaN(parsed) && parsed >= 0 && parsed < romBytes.length) {
      const targetRow = Math.floor(parsed / 16);
      setHexStartRow(Math.max(0, Math.min(totalRows - ROWS_PER_PAGE, targetRow)));

      // Also highlight containing block
      const matching = structure.blocks.find(
        (b) => parsed >= b.startOffset && parsed <= b.endOffset
      );
      if (matching) setSelectedBlockId(matching.id);
    }
  };

  // Helper to get which block a byte offset belongs to
  const getBlockForOffset = (offset: number): RomBlockInfo | undefined => {
    return structure.blocks.find(
      (b) => offset >= b.startOffset && offset <= b.endOffset
    );
  };

  // Generate rows for currently visible hex page
  const visibleRows = useMemo(() => {
    const rows = [];
    const endRow = Math.min(totalRows, hexStartRow + ROWS_PER_PAGE);

    for (let r = hexStartRow; r < endRow; r++) {
      const offset = r * 16;
      const bytes = romBytes.subarray(offset, Math.min(offset + 16, romBytes.length));

      // Calculate CPU address if in PRG range
      let cpuAddrStr = '';
      if (isGeneratedDisplayer && offset >= 16) {
        const prgRelative = offset - 16;
        if (prgRelative < structure.prgSize) {
          const addr = 0xC000 + prgRelative;
          cpuAddrStr = '$' + addr.toString(16).toUpperCase();
        }
      }

      rows.push({
        offset,
        offsetStr: formatOffset(offset),
        cpuAddrStr,
        bytes,
      });
    }
    return rows;
  }, [romBytes, hexStartRow, totalRows, isGeneratedDisplayer, structure.prgSize]);

  // Copy active block's hex bytes
  const handleCopyBlockHex = () => {
    if (!activeBlock) return;
    const blockBytes = romBytes.subarray(activeBlock.startOffset, activeBlock.endOffset + 1);
    let hexStr = '';
    for (let i = 0; i < blockBytes.length; i++) {
      hexStr += formatHexByte(blockBytes[i]) + ' ';
      if ((i + 1) % 16 === 0) hexStr += '\n';
    }
    navigator.clipboard.writeText(hexStr.trim());
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Binary className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>ROM Structure & Calculated Hex Layout</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {(romBytes.length / 1024).toFixed(1)} KB Total
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live byte-level visualization of Header, PRG-ROM, and CHR-ROM binary blocks before final export.
            </p>
          </div>
        </div>

        {/* Quick ROM Metrics Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>16B Header</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{structure.prgSize / 1024}KB PRG</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>{structure.chrSize > 0 ? `${structure.chrSize / 1024}KB CHR` : 'CHR-RAM'}</span>
          </div>
        </div>
      </div>

      {/* 1. Proportional ROM Memory Map Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-medium text-neutral-300">Physical ROM Binary Map</span>
            <span className="text-[11px] text-neutral-400">({romBytes.length.toLocaleString()} Bytes)</span>
          </div>
          <span className="text-[11px] text-neutral-400">Click any block to inspect and jump hex view</span>
        </div>

        {/* Visual Segmented Bar */}
        <div className="w-full h-11 bg-neutral-950 rounded-xl p-1 border border-neutral-800 flex gap-1 overflow-x-auto select-none">
          {structure.blocks.map((block) => {
            const isSelected = block.id === selectedBlockId;
            // Calculate proportional width with minimum visible size
            const percentage = (block.size / romBytes.length) * 100;
            const minWidthPx = block.category === 'header' ? 36 : block.size < 64 ? 28 : 48;

            return (
              <button
                key={block.id}
                onClick={() => handleSelectBlock(block)}
                title={`${block.name}: ${block.size.toLocaleString()} bytes (${formatOffset(block.startOffset)} - ${formatOffset(block.endOffset)})`}
                style={{
                  flexGrow: block.size,
                  minWidth: `${minWidthPx}px`,
                }}
                className={`h-full rounded-lg text-left px-2 flex flex-col justify-center transition-all relative group cursor-pointer border ${
                  isSelected
                    ? `${block.colorBg} ${block.colorBorder} ring-2 ring-indigo-500 shadow-md`
                    : `${block.colorBg} border-transparent hover:border-neutral-600/60 opacity-85 hover:opacity-100`
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[11px] font-bold truncate ${block.colorText}`}>
                    {block.shortName}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-400 hidden group-hover:inline-block ml-1">
                    {block.size < 1024 ? `${block.size}B` : `${Math.round(block.size / 1024)}K`}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-neutral-400 truncate">
                  {formatOffset(block.startOffset).slice(2, 6)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Block Inspector Detail Card */}
      {activeBlock && (
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${activeBlock.badgeColor}`}>
                {activeBlock.category.toUpperCase()} BLOCK
              </span>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                <span>{activeBlock.name}</span>
              </h3>
              <span className="font-mono text-xs text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                {formatOffset(activeBlock.startOffset)} – {formatOffset(activeBlock.endOffset)}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                ({activeBlock.size.toLocaleString()} bytes)
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {activeBlock.description}
            </p>
            {activeBlock.cpuAddress && (
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono pt-0.5">
                <span className="text-neutral-400">Memory Map:</span>
                <span className="text-indigo-400 font-semibold">{activeBlock.cpuAddress}</span>
                {activeBlock.ppuAddress && (
                  <>
                    <span className="text-neutral-400">·</span>
                    <span className="text-cyan-400">PPU {activeBlock.ppuAddress}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyBlockHex}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors"
            >
              {copiedHex ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Block Hex</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. Block Directory Chips */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-neutral-400">Calculated Block Directory:</span>
        <div className="flex flex-wrap gap-1.5">
          {structure.blocks.map((b) => (
            <button
              key={b.id}
              onClick={() => handleSelectBlock(b)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border flex items-center gap-1.5 ${
                b.id === selectedBlockId
                  ? 'bg-neutral-800 border-indigo-500 text-white shadow-sm'
                  : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${b.colorText.replace('text-', 'bg-')}`} />
              <span>{b.shortName}</span>
              <span className="text-[10px] text-neutral-400">{formatOffset(b.startOffset)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Live Calculated Hex Layout Viewer */}
      <div className="space-y-3 pt-2">
        {/* Hex Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-mono">
              <Hash className="w-4 h-4 text-indigo-400" />
              <span>
                Hex Rows: {hexStartRow * 16} –{' '}
                {Math.min(romBytes.length - 1, (hexStartRow + ROWS_PER_PAGE) * 16 - 1)} of{' '}
                {romBytes.length} B
              </span>
            </div>

            {/* CPU Address Column Toggle */}
            <button
              onClick={() => setShowCpuAddress(!showCpuAddress)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                showCpuAddress
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              CPU Addr: {showCpuAddress ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Jump to Offset input */}
          <form onSubmit={handleJumpOffset} className="flex items-center gap-1.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Jump hex (e.g. 0x10, C000)"
                value={jumpOffsetInput}
                onChange={(e) => setJumpOffsetInput(e.target.value)}
                className="w-48 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs font-mono text-neutral-200 focus:outline-none focus:border-indigo-500 placeholder:text-neutral-400"
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium border border-neutral-700 transition-colors"
            >
              Go
            </button>
          </form>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setHexStartRow(Math.max(0, hexStartRow - ROWS_PER_PAGE))}
              disabled={hexStartRow === 0}
              className="px-2.5 py-1 text-xs font-medium rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 border border-neutral-800"
            >
              ◀ Prev 512B
            </button>
            <button
              onClick={() =>
                setHexStartRow(
                  Math.min(totalRows - ROWS_PER_PAGE, hexStartRow + ROWS_PER_PAGE)
                )
              }
              disabled={hexStartRow + ROWS_PER_PAGE >= totalRows}
              className="px-2.5 py-1 text-xs font-medium rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 border border-neutral-800"
            >
              Next 512B ▶
            </button>
          </div>
        </div>

        {/* Live Hex Grid Display */}
        <div
          ref={hexContainerRef}
          className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-xs overflow-x-auto select-text leading-relaxed"
        >
          {/* Column Header */}
          <div className="flex items-center pb-2 mb-2 border-b border-neutral-800/80 text-[11px] text-neutral-400 font-semibold tracking-wider">
            <span className="w-24">FILE OFFSET</span>
            {showCpuAddress && <span className="w-20 text-indigo-400">CPU ADDR</span>}
            <div className="flex-1 grid grid-cols-16 gap-1 text-center max-w-xl">
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i} className="text-neutral-400">
                  {i.toString(16).toUpperCase()}
                </span>
              ))}
            </div>
            <span className="w-36 text-right pl-4">ASCII DECODE</span>
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {visibleRows.map((row) => {
              // Build ASCII preview
              let asciiStr = '';
              for (let i = 0; i < row.bytes.length; i++) {
                const b = row.bytes[i];
                asciiStr += b >= 32 && b <= 126 ? String.fromCharCode(b) : '·';
              }

              return (
                <div
                  key={row.offset}
                  className="flex items-center hover:bg-neutral-900/60 px-1 py-0.5 rounded transition-colors"
                >
                  {/* File Offset */}
                  <span className="w-24 text-neutral-400 select-none">
                    {row.offsetStr.slice(2)}:
                  </span>

                  {/* CPU Address */}
                  {showCpuAddress && (
                    <span className="w-20 text-indigo-400/90 select-none text-[11px]">
                      {row.cpuAddrStr || '—'}
                    </span>
                  )}

                  {/* 16 Hex Values */}
                  <div className="flex-1 grid grid-cols-16 gap-1 text-center max-w-xl">
                    {Array.from({ length: 16 }).map((_, col) => {
                      if (col >= row.bytes.length) {
                        return <span key={col} className="text-neutral-400">..</span>;
                      }
                      const byteVal = row.bytes[col];
                      const byteOffset = row.offset + col;
                      const block = getBlockForOffset(byteOffset);
                      const isHighlighted = block?.id === selectedBlockId;

                      let colorClass = 'text-neutral-300';
                      if (block?.category === 'header') colorClass = 'text-rose-400 font-bold';
                      else if (block?.id === 'prg_code') colorClass = 'text-blue-300';
                      else if (block?.id === 'prg_pal') colorClass = 'text-amber-300 font-semibold';
                      else if (block?.id === 'prg_nametable') colorClass = 'text-emerald-300';
                      else if (block?.id === 'prg_vectors') colorClass = 'text-red-400 font-bold';
                      else if (block?.category === 'chr') colorClass = 'text-cyan-300';
                      else if (byteVal === 0x00) colorClass = 'text-neutral-400';

                      return (
                        <span
                          key={col}
                          title={`Offset: ${formatOffset(byteOffset)} | Byte: 0x${formatHexByte(byteVal)} (${byteVal}) | ${block?.name || 'Unknown'}`}
                          onClick={() => block && handleSelectBlock(block)}
                          className={`cursor-pointer rounded transition-colors ${
                            isHighlighted ? 'bg-indigo-950/70 ring-1 ring-indigo-500/80 font-bold' : ''
                          } ${colorClass}`}
                        >
                          {formatHexByte(byteVal)}
                        </span>
                      );
                    })}
                  </div>

                  {/* ASCII column */}
                  <span className="w-36 text-right font-mono text-[11px] text-neutral-400 pl-4 tracking-widest truncate select-none">
                    |{asciiStr}|
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6502 Interrupt Vectors Callout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1">
            <div className="text-[10px] text-neutral-400 uppercase">NMI Vector ($FFFA)</div>
            <div className="text-sm font-bold text-neutral-100">
              ${structure.prgVectors.nmi.toString(16).padStart(4, '0').toUpperCase()}
            </div>
            <div className="text-[10px] text-neutral-400">PPU Vertical Blank Interrupt</div>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1">
            <div className="text-[10px] text-neutral-400 uppercase">Reset Vector ($FFFC)</div>
            <div className="text-sm font-bold text-rose-400">
              ${structure.prgVectors.reset.toString(16).padStart(4, '0').toUpperCase()}
            </div>
            <div className="text-[10px] text-neutral-400">Initial CPU Boot Entry Point</div>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1">
            <div className="text-[10px] text-neutral-400 uppercase">IRQ / BRK Vector ($FFFE)</div>
            <div className="text-sm font-bold text-neutral-100">
              ${structure.prgVectors.irq.toString(16).padStart(4, '0').toUpperCase()}
            </div>
            <div className="text-[10px] text-neutral-400">Hardware & Mapper IRQ Handler</div>
          </div>
        </div>
      </div>
    </div>
  );
};
