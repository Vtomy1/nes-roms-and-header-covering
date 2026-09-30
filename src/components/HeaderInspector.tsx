import React, { useState } from 'react';
import { NESHeader, MirroringType, TvSystem } from '../types/nes';
import {
  COMMON_MAPPERS,
  HEADER_PRESETS,
  getMapperName,
  serializeNESHeader,
} from '../utils/nesHeader';
import { Cpu, Check, AlertCircle, ShieldCheck, RefreshCw, FileCode2 } from 'lucide-react';

interface HeaderInspectorProps {
  header: NESHeader;
  onChange: (updated: NESHeader) => void;
}

export const HeaderInspector: React.FC<HeaderInspectorProps> = ({ header, onChange }) => {
  const [selectedByteIndex, setSelectedByteIndex] = useState<number>(4);

  const rawBytes = serializeNESHeader(header);

  const updateField = (fields: Partial<NESHeader>) => {
    onChange({
      ...header,
      ...fields,
      rawBytes: serializeNESHeader({ ...header, ...fields }),
    });
  };

  const applyPreset = (presetHeader: Partial<NESHeader>) => {
    onChange({
      ...header,
      ...presetHeader,
      rawBytes: serializeNESHeader({ ...header, ...presetHeader }),
    });
  };

  const toggleFormat = () => {
    const nextIsNES20 = !header.isNES20;
    updateField({ isNES20: nextIsNES20 });
  };

  // Byte documentation
  const getByteDescription = (idx: number) => {
    switch (idx) {
      case 0: return { name: "Magic 'N'", desc: "ASCII 'N' (0x4E) - NES ROM file signature", role: "header_id" };
      case 1: return { name: "Magic 'E'", desc: "ASCII 'E' (0x45) - NES ROM file signature", role: "header_id" };
      case 2: return { name: "Magic 'S'", desc: "ASCII 'S' (0x53) - NES ROM file signature", role: "header_id" };
      case 3: return { name: "Magic '^Z'", desc: "MS-DOS EOF (0x1A) - Prevents CLI display dumps", role: "header_id" };
      case 4: return { name: "PRG ROM Units", desc: `PRG size in 16KB units: ${header.prgRomSize16K} (${header.prgRomSize16K * 16} KB)`, role: "rom_size" };
      case 5: return { name: "CHR ROM Units", desc: header.chrRomSize8K === 0 ? "0 (Uses CHR-RAM 8KB)" : `CHR size in 8KB units: ${header.chrRomSize8K} (${header.chrRomSize8K * 8} KB)`, role: "rom_size" };
      case 6: return { name: "Flags 6", desc: `Mapper D0-D3 (${header.mapper & 0x0F}), Mirroring (${header.mirroring}), Battery (${header.hasBattery}), Trainer (${header.hasTrainer})`, role: "flags" };
      case 7: return { name: "Flags 7", desc: `Mapper D4-D7 (${(header.mapper >> 4) & 0x0F}), Format: ${header.isNES20 ? 'NES 2.0 (bit 2-3 = 0x08)' : 'iNES 1.0'}`, role: "flags" };
      case 8: return { name: "Flags 8", desc: header.isNES20 ? `Mapper D8-D11 (${(header.mapper >> 8) & 0x0F}), Submapper: ${header.submapper}` : `iNES PRG-RAM Size: ${header.prgRamSizeKb} KB`, role: "extended" };
      case 9: return { name: "Flags 9", desc: header.isNES20 ? "PRG / CHR ROM MSB nibbles" : `TV System: ${header.tvSystem.toUpperCase()}`, role: "extended" };
      case 10: return { name: "Flags 10", desc: header.isNES20 ? `PRG-RAM: ${header.prgRamSizeKb}KB, PRG-NVRAM: ${header.prgNvramSizeKb}KB` : "Legacy TV/PRG-RAM flags", role: "extended" };
      case 11: return { name: "Flags 11", desc: header.isNES20 ? `CHR-RAM: ${header.chrRamSizeKb}KB, CHR-NVRAM: ${header.chrNvramSizeKb}KB` : "Zero padding", role: "extended" };
      case 12: return { name: "Flags 12", desc: header.isNES20 ? `CPU/PPU Timing: ${header.tvSystem.toUpperCase()}` : "Zero padding", role: "extended" };
      case 13: return { name: "Flags 13", desc: header.isNES20 ? `VS / Extended Console: ${header.extendedConsoleType}` : "Zero padding", role: "extended" };
      case 14: return { name: "Flags 14", desc: header.isNES20 ? `Miscellaneous ROMs: ${header.miscRoms}` : "Zero padding", role: "extended" };
      case 15: return { name: "Flags 15", desc: header.isNES20 ? `Expansion Device: ${header.expansionDevice}` : "Zero padding", role: "extended" };
      default: return { name: "Unknown", desc: "", role: "unknown" };
    }
  };

  const selectedDesc = getByteDescription(selectedByteIndex);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>ROM Header Architect</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                16 Bytes iNES / NES 2.0
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Inspect and configure byte-by-byte hardware registers for real NES emulators & flashcarts.
            </p>
          </div>
        </div>

        {/* Format switch button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={toggleFormat}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              header.isNES20
                ? 'bg-rose-600/20 border-rose-500/50 text-rose-300 hover:bg-rose-600/30'
                : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Format: {header.isNES20 ? 'NES 2.0 (Modern)' : 'iNES 1.0 (Classic)'}</span>
          </button>
        </div>
      </div>

      {/* Preset Pickers */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-neutral-400 flex items-center justify-between">
          <span>Standard Hardware Presets</span>
          <span className="text-[11px] text-neutral-400">Click to apply configuration</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {HEADER_PRESETS.map((preset) => {
            const isCurrent =
              header.mapper === preset.header.mapper &&
              header.prgRomSize16K === preset.header.prgRomSize16K &&
              header.chrRomSize8K === preset.header.chrRomSize8K;
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.header)}
                className={`p-2.5 rounded-lg text-left border transition-all ${
                  isCurrent
                    ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
                    : 'bg-neutral-800/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                }`}
              >
                <div className="text-xs font-semibold truncate">{preset.name.split(' ')[0]}</div>
                <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                  {preset.header.prgRomSize16K! * 16}K PRG · {preset.header.chrRomSize8K! * 8}K CHR
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 16-Byte Hex Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono">Hex Header Byte Array ($00 - $0F)</span>
          <span className="text-[11px] text-neutral-400">Select any byte to inspect bitmask</span>
        </div>
        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 p-2 bg-neutral-950 rounded-lg border border-neutral-800/80 font-mono">
          {Array.from({ length: 16 }).map((_, idx) => {
            const byteVal = rawBytes[idx];
            const hexVal = byteVal.toString(16).padStart(2, '0').toUpperCase();
            const isSelected = selectedByteIndex === idx;

            let badgeColor = 'border-neutral-800 bg-neutral-900/60 text-neutral-300';
            if (idx < 4) badgeColor = 'border-amber-900/50 bg-amber-950/20 text-amber-300';
            else if (idx === 4 || idx === 5) badgeColor = 'border-blue-900/50 bg-blue-950/20 text-blue-300';
            else if (idx === 6 || idx === 7) badgeColor = 'border-rose-900/50 bg-rose-950/20 text-rose-300';
            else badgeColor = 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300';

            return (
              <button
                key={idx}
                onClick={() => setSelectedByteIndex(idx)}
                className={`flex flex-col items-center justify-center p-2 rounded border text-center transition-all ${
                  isSelected
                    ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-950/50 text-white font-bold'
                    : badgeColor
                }`}
              >
                <span className="text-[9px] text-neutral-400 mb-0.5">
                  +{idx.toString(16).toUpperCase()}
                </span>
                <span className="text-xs tracking-wider">{hexVal}</span>
                <span className="text-[9px] text-neutral-400 mt-0.5">
                  {idx < 4 ? String.fromCharCode(byteVal) : byteVal}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Byte Detail Callout */}
      <div className="p-3.5 bg-neutral-950/80 rounded-lg border border-neutral-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-rose-400 font-semibold">
              Byte {selectedByteIndex} ($0{selectedByteIndex.toString(16).toUpperCase()}):
            </span>
            <span className="text-neutral-200 font-medium">{selectedDesc.name}</span>
            <span className="font-mono text-[11px] text-neutral-400">
              = 0x{rawBytes[selectedByteIndex].toString(16).padStart(2, '0').toUpperCase()} (
              {rawBytes[selectedByteIndex]} dec) [
              {rawBytes[selectedByteIndex].toString(2).padStart(8, '0')} bin]
            </span>
          </div>
          <p className="text-neutral-400 text-[11px]">{selectedDesc.desc}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/40 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Valid NES Specification</span>
        </div>
      </div>

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {/* Mapper Control */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
            <span>NES Mapper Chip</span>
            <span className="font-mono text-[11px] text-rose-400">ID #{header.mapper}</span>
          </label>
          <select
            value={header.mapper}
            onChange={(e) => updateField({ mapper: parseInt(e.target.value, 10) })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-rose-500 font-mono"
          >
            {COMMON_MAPPERS.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.id} - {m.name} ({m.board})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-400">
            {COMMON_MAPPERS.find((m) => m.id === header.mapper)?.desc || 'Custom NES mapper configuration.'}
          </p>
        </div>

        {/* PRG ROM Size */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
            <span>PRG ROM Size</span>
            <span className="font-mono text-[11px] text-blue-400">
              {header.prgRomSize16K * 16} KB ({header.prgRomSize16K}x 16KB)
            </span>
          </label>
          <select
            value={header.prgRomSize16K}
            onChange={(e) => updateField({ prgRomSize16K: parseInt(e.target.value, 10) })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-rose-500 font-mono"
          >
            <option value={1}>16 KB (1 unit - NROM-128 / Displayer)</option>
            <option value={2}>32 KB (2 units - NROM-256)</option>
            <option value={4}>64 KB (4 units)</option>
            <option value={8}>128 KB (8 units - MMC1 / UxROM)</option>
            <option value={16}>256 KB (16 units - MMC3)</option>
            <option value={32}>512 KB (32 units)</option>
          </select>
          <p className="text-[11px] text-neutral-400">
            Program code capacity. 16KB is ideal for instant image displayers.
          </p>
        </div>

        {/* CHR ROM Size */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
            <span>CHR ROM Size</span>
            <span className="font-mono text-[11px] text-blue-400">
              {header.chrRomSize8K === 0 ? 'CHR-RAM' : `${header.chrRomSize8K * 8} KB`}
            </span>
          </label>
          <select
            value={header.chrRomSize8K}
            onChange={(e) => updateField({ chrRomSize8K: parseInt(e.target.value, 10) })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-rose-500 font-mono"
          >
            <option value={0}>0 KB (CHR-RAM - UxROM / AxROM)</option>
            <option value={1}>8 KB (1 unit - Standard 512 tiles)</option>
            <option value={2}>16 KB (2 units)</option>
            <option value={4}>32 KB (4 units - CNROM)</option>
            <option value={8}>64 KB (8 units)</option>
            <option value={16}>128 KB (16 units - MMC3)</option>
          </select>
          <p className="text-[11px] text-neutral-400">
            Graphic tiles storage. 8KB holds 512 8x8 pattern tiles.
          </p>
        </div>

        {/* Mirroring */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300">Nametable Mirroring</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'horizontal', label: 'Horizontal' },
              { id: 'vertical', label: 'Vertical' },
              { id: 'four_screen', label: '4-Screen' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => updateField({ mirroring: m.id as MirroringType })}
                className={`py-1.5 px-2 text-xs rounded border transition-colors ${
                  header.mirroring === m.id
                    ? 'bg-rose-600 border-rose-500 text-white font-medium'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-neutral-400">
            Horizontal (vertical scroll) vs Vertical (horizontal scroll).
          </p>
        </div>

        {/* TV System */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300">TV / Timing System</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'ntsc', label: 'NTSC (60Hz)' },
              { id: 'pal', label: 'PAL (50Hz)' },
              { id: 'multi', label: 'Multi' },
            ].map((tv) => (
              <button
                key={tv.id}
                onClick={() => updateField({ tvSystem: tv.id as TvSystem })}
                className={`py-1.5 px-2 text-xs rounded border transition-colors ${
                  header.tvSystem === tv.id
                    ? 'bg-rose-600 border-rose-500 text-white font-medium'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                {tv.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-neutral-400">
            60 Hz for US/Japan NTSC consoles; 50 Hz for Europe PAL.
          </p>
        </div>

        {/* Hardware Flags */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300">Hardware Flags</label>
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={header.hasBattery}
                onChange={(e) => updateField({ hasBattery: e.target.checked })}
                className="rounded border-neutral-700 bg-neutral-950 text-rose-600 focus:ring-rose-500"
              />
              <span>Battery-Backed RAM ($6000-$7FFF)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={header.hasTrainer}
                onChange={(e) => updateField({ hasTrainer: e.target.checked })}
                className="rounded border-neutral-700 bg-neutral-950 text-rose-600 focus:ring-rose-500"
              />
              <span>512-byte Trainer ($7000-$71FF)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
