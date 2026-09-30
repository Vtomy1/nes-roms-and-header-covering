import React, { useState, useRef } from 'react';
import { NESHeader, NESGraphicsData } from '../types/nes';
import { parseNESHeader, serializeNESHeader } from '../utils/nesHeader';
import { buildCompleteNESRom, downloadBlob } from '../utils/romBuilder';
import {
  generateCHeader,
  generateAsmCode,
  generateHexDump,
} from '../utils/codeGenerators';
import {
  Download,
  Copy,
  Check,
  FileCode,
  Binary,
  Layers,
  FileUp,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Disc,
} from 'lucide-react';

interface RomHeaderConverterProps {
  header: NESHeader;
  graphics: NESGraphicsData | null;
  onHeaderLoaded: (newHeader: NESHeader) => void;
}

export const RomHeaderConverter: React.FC<RomHeaderConverterProps> = ({
  header,
  graphics,
  onHeaderLoaded,
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'c' | 'asm' | 'hex' | 'header'>('c');
  const [copied, setCopied] = useState<boolean>(false);
  const [uploadedRomMeta, setUploadedRomMeta] = useState<{
    fileName: string;
    originalSize: number;
    originalHeader: NESHeader;
    romPayload: Uint8Array; // PRG + CHR without header
  } | null>(null);

  const romInputRef = useRef<HTMLInputElement | null>(null);

  // Handle uploading an existing .nes ROM to convert or edit its header
  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const allBytes = new Uint8Array(buffer);
      if (allBytes.length < 16) return;

      const parsed = parseNESHeader(allBytes);
      if (parsed.isValid) {
        onHeaderLoaded(parsed);
        setUploadedRomMeta({
          fileName: file.name,
          originalSize: file.size,
          originalHeader: parsed,
          romPayload: allBytes.subarray(16),
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Download converted / updated .nes ROM
  const handleDownloadRom = () => {
    if (uploadedRomMeta) {
      // Reassemble uploaded ROM with currently active header
      const newHeaderBytes = serializeNESHeader(header);
      const combined = new Uint8Array(16 + uploadedRomMeta.romPayload.length);
      combined.set(newHeaderBytes, 0);
      combined.set(uploadedRomMeta.romPayload, 16);
      const baseName = uploadedRomMeta.fileName.replace(/\.nes$/i, '');
      const outName = `${baseName}_converted_${header.isNES20 ? 'nes20' : 'ines'}.nes`;
      downloadBlob(combined, outName);
    } else if (graphics) {
      // Build complete playable NES image displayer ROM
      const { romBytes } = buildCompleteNESRom(graphics, header);
      downloadBlob(romBytes, 'nes_image_displayer.nes');
    }
  };

  // Download Standalone 16-byte Header (.hdr)
  const handleDownloadHeader = () => {
    const headerBytes = serializeNESHeader(header);
    downloadBlob(headerBytes, `${header.isNES20 ? 'header_nes20' : 'header_ines'}.hdr`);
  };

  // Download 8KB CHR-ROM (.chr)
  const handleDownloadChr = () => {
    if (!graphics) return;
    downloadBlob(graphics.patternTable.subarray(0, 8192), 'tiles.chr');
  };

  // Download 1KB Nametable (.nam)
  const handleDownloadNametable = () => {
    if (!graphics) return;
    const nam = new Uint8Array(1024);
    nam.set(graphics.nametable.subarray(0, 960), 0);
    nam.set(graphics.attributeTable.subarray(0, 64), 960);
    downloadBlob(nam, 'screen.nam');
  };

  // Download 32-byte Palette (.pal)
  const handleDownloadPalette = () => {
    if (!graphics) return;
    const pal = new Uint8Array(32);
    for (let s = 0; s < 4; s++) {
      for (let c = 0; c < 4; c++) {
        pal[s * 4 + c] = graphics.subPalettes[s].colors[c];
        pal[16 + s * 4 + c] = graphics.subPalettes[s].colors[c];
      }
    }
    downloadBlob(pal, 'palette.pal');
  };

  const getActiveCodeContent = (): string => {
    if (!graphics) return '// Generate graphics to view export code';
    if (activeCodeTab === 'c') return generateCHeader(graphics, header);
    if (activeCodeTab === 'asm') return generateAsmCode(graphics, header);
    if (activeCodeTab === 'hex') return generateHexDump(serializeNESHeader(header));
    if (activeCodeTab === 'header') {
      const bytes = serializeNESHeader(header);
      return `// 16-Byte ROM Header\nconst uint8_t ines_header[16] = {\n  ${Array.from(bytes)
        .map((b) => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
        .join(', ')}\n};`;
    }
    return '';
  };

  const handleCopyCode = () => {
    const code = getActiveCodeContent();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
            <Disc className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>ROM Header Converter & Production Exporter</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Playable .NES / .HDR / .CHR
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Export playable 6502 NES ROMs, convert between iNES & NES 2.0, or generate cc65 / ca65 code.
            </p>
          </div>
        </div>

        {/* Existing ROM File Upload Button */}
        <div>
          <input
            ref={romInputRef}
            type="file"
            accept=".nes,.bin,.rom"
            onChange={handleRomUpload}
            className="hidden"
          />
          <button
            onClick={() => romInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors"
          >
            <FileUp className="w-3.5 h-3.5 text-purple-400" />
            <span>Upload Existing .NES ROM to Convert Header</span>
          </button>
        </div>
      </div>

      {/* Uploaded ROM Notification */}
      {uploadedRomMeta && (
        <div className="p-3 bg-purple-950/30 border border-purple-800/60 rounded-lg text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Disc className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="font-semibold text-purple-200">Loaded ROM File:</span>{' '}
              <span className="font-mono text-purple-300">{uploadedRomMeta.fileName}</span>{' '}
              <span className="text-neutral-400">({(uploadedRomMeta.originalSize / 1024).toFixed(1)} KB)</span>
            </div>
          </div>
          <button
            onClick={() => setUploadedRomMeta(null)}
            className="text-[11px] text-neutral-400 hover:text-neutral-200 underline"
          >
            Switch back to Image ROM mode
          </button>
        </div>
      )}

      {/* Primary Export Actions Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Playable .NES ROM */}
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
              <Disc className="w-4 h-4 text-rose-400" />
              <span>{uploadedRomMeta ? 'Updated .NES ROM' : 'Playable .NES ROM'}</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              {uploadedRomMeta
                ? 'Replaces header with your new configuration and saves .nes file.'
                : 'Contains bootable 6502 displayer code + converted image & nametable.'}
            </p>
          </div>
          <button
            onClick={handleDownloadRom}
            className="w-full py-2 px-3 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .NES ROM</span>
          </button>
        </div>

        {/* Card 2: Standalone 16-Byte Header */}
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
              <Binary className="w-4 h-4 text-blue-400" />
              <span>16-Byte Header (.HDR)</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Pure 16-byte raw binary header file for romhackers, hex patching, or build scripts.
            </p>
          </div>
          <button
            onClick={handleDownloadHeader}
            className="w-full py-2 px-3 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .HDR (16B)</span>
          </button>
        </div>

        {/* Card 3: CHR Pattern Table */}
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>8KB CHR-ROM (.CHR)</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Standard 8,192 byte pattern table for NES Screen Tool, YY-CHR, and Tile Layer Pro.
            </p>
          </div>
          <button
            onClick={handleDownloadChr}
            disabled={!graphics}
            className="w-full py-2 px-3 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded-lg border border-neutral-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .CHR (8KB)</span>
          </button>
        </div>

        {/* Card 4: Nametable & Palette */}
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>Nametable & Palette</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Raw 1KB nametable (.nam) and 32-byte NES color palette (.pal) binaries.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleDownloadNametable}
              disabled={!graphics}
              className="py-1.5 px-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded border border-neutral-700 transition-colors"
            >
              .NAM (1KB)
            </button>
            <button
              onClick={handleDownloadPalette}
              disabled={!graphics}
              className="py-1.5 px-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded border border-neutral-700 transition-colors"
            >
              .PAL (32B)
            </button>
          </div>
        </div>
      </div>

      {/* Code Export Tabs & Viewer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {/* Segmented Tab Controls */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {[
              { id: 'c', label: 'C Header (.h)' },
              { id: 'asm', label: '6502 ASM (.asm)' },
              { id: 'hex', label: 'Hex View' },
              { id: 'header', label: 'Header Array' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCodeTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeCodeTab === tab.id
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Box */}
        <div className="relative">
          <pre className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto max-h-72 selection:bg-rose-600 selection:text-white leading-relaxed">
            {getActiveCodeContent()}
          </pre>
        </div>
      </div>
    </div>
  );
};
