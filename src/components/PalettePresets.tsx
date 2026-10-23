import React, { useState, useMemo } from 'react';
import { SubPalette } from '../types/nes';
import { NES_MASTER_PALETTE } from '../utils/nesPalette';
import {
  HISTORICAL_PALETTES,
  HistoricalPalettePreset,
  convertPresetToSubpalettes,
} from '../utils/historicalPalettes';
import {
  Sparkles,
  Search,
  Filter,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface PalettePresetsProps {
  currentSubpalettes: [SubPalette, SubPalette, SubPalette, SubPalette];
  currentBackdrop: number;
  onApplyPreset: (
    presetSubpalettes: [SubPalette, SubPalette, SubPalette, SubPalette],
    backdrop: number
  ) => void;
  onApplySingleSubpalette?: (
    subpalId: number,
    colors: [number, number, number, number]
  ) => void;
  onResetOriginal?: () => void;
  hasOriginalBackup?: boolean;
}

type CategoryFilter = 'All' | 'Platformer' | 'Adventure' | 'Action / Sci-Fi' | 'Arcade' | 'RPG';

export const PalettePresets: React.FC<PalettePresetsProps> = ({
  currentSubpalettes,
  currentBackdrop,
  onApplyPreset,
  onApplySingleSubpalette,
  onResetOriginal,
  hasOriginalBackup = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('smb-overworld');
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  // Filtered preset list
  const filteredPresets = useMemo(() => {
    return HISTORICAL_PALETTES.filter((preset) => {
      const matchesCategory =
        selectedCategory === 'All' || preset.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        preset.name.toLowerCase().includes(query) ||
        preset.game.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const activePreset = useMemo(() => {
    return (
      HISTORICAL_PALETTES.find((p) => p.id === selectedPresetId) ||
      HISTORICAL_PALETTES[0]
    );
  }, [selectedPresetId]);

  // Check if current graphics palette matches a preset
  const isPresetActive = (preset: HistoricalPalettePreset) => {
    if (currentBackdrop !== preset.backdrop) return false;
    for (let s = 0; s < 4; s++) {
      for (let c = 0; c < 4; c++) {
        if (currentSubpalettes[s].colors[c] !== preset.subPalettes[s].colors[c]) {
          return false;
        }
      }
    }
    return true;
  };

  const handleApplyAll = (preset: HistoricalPalettePreset) => {
    const newSubpalettes = convertPresetToSubpalettes(preset);
    onApplyPreset(newSubpalettes, preset.backdrop);
    setAppliedPresetId(preset.id);
  };

  const handleApplySubpal = (
    preset: HistoricalPalettePreset,
    sourceSubpalIndex: number,
    targetSubpalIndex: number
  ) => {
    if (!onApplySingleSubpalette) return;
    const colors = preset.subPalettes[sourceSubpalIndex].colors;
    onApplySingleSubpalette(targetSubpalIndex, colors);
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden text-neutral-200">
      {/* Header bar */}
      <div className="p-3.5 bg-neutral-900 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-neutral-100 uppercase tracking-wider">
                Historical NES Palette Profiles
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/50 text-rose-300 font-mono">
                14 Authentic 2C02 Presets
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Select classic NES game color profiles to instantly re-theme subpalettes and backdrop
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasOriginalBackup && onResetOriginal && (
            <button
              onClick={onResetOriginal}
              className="px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700/80 transition-all flex items-center gap-1.5"
              title="Revert back to the image's original quantized palette"
            >
              <RotateCcw className="w-3 h-3 text-neutral-400" />
              <span>Restore Image Colors</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-neutral-400 hover:text-neutral-200 rounded hover:bg-neutral-800"
            title={isExpanded ? 'Collapse Presets' : 'Expand Presets'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Quick Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1">
              {(['All', 'Platformer', 'Adventure', 'Action / Sci-Fi', 'Arcade', 'RPG'] as CategoryFilter[]).map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                      selectedCategory === cat
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/40'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search games, levels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-rose-500 font-sans"
              />
            </div>
          </div>

          {/* Quick Preset Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {filteredPresets.map((preset) => {
              const active = isPresetActive(preset);
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'border-rose-500 bg-rose-950/20 shadow-sm'
                      : active
                      ? 'border-emerald-500/60 bg-emerald-950/20'
                      : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-950'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-medium text-neutral-200 truncate">
                      {preset.game}
                    </span>
                    {active ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" title="Active in PPU" />
                    ) : (
                      <span className="text-[9px] font-mono text-neutral-500">{preset.year}</span>
                    )}
                  </div>

                  {/* 4-subpalette miniature color swatches */}
                  <div className="grid grid-cols-4 gap-0.5 w-full bg-black/40 p-1 rounded">
                    {preset.subPalettes.map((sub, sIdx) => (
                      <div key={sIdx} className="flex flex-col gap-0.5">
                        {sub.colors.map((cIdx, cSlot) => {
                          const col = NES_MASTER_PALETTE[cIdx] || NES_MASTER_PALETTE[0x0f];
                          return (
                            <div
                              key={cSlot}
                              className="h-1.5 w-full rounded-[1px]"
                              style={{ backgroundColor: col.hex }}
                              title={`Sub #${sIdx} Slot ${cSlot}: ${col.name} ($${cIdx.toString(16).padStart(2, '0').toUpperCase()})`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <span className="text-[10px] text-neutral-400 truncate">
                    {preset.name.replace(preset.game, '').replace(/[()]/g, '').trim() || preset.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Preset Detail Inspector & Apply Bar */}
          {activePreset && (
            <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
                      <span>{activePreset.name}</span>
                      <span className="text-[10px] font-normal text-neutral-400">({activePreset.year})</span>
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                      {activePreset.category}
                    </span>
                    {isPresetActive(activePreset) && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 flex items-center gap-1 font-medium">
                        <Check className="w-3 h-3" />
                        Currently Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {activePreset.description}
                  </p>
                </div>

                {/* Primary Apply Button */}
                <button
                  onClick={() => handleApplyAll(activePreset)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-950/50 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply All 4 Subpalettes</span>
                </button>
              </div>

              {/* 4 Subpalette Cards with Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {activePreset.subPalettes.map((sub, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-2.5 bg-neutral-900/90 rounded-lg border border-neutral-800/80 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-0.5">
                        <span>Subpalette #{sIdx}</span>
                        {sIdx === 0 && (
                          <span className="text-[9px] px-1 rounded bg-neutral-800 text-neutral-400 font-sans">
                            Backdrop Master
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-neutral-200 truncate" title={sub.label}>
                        {sub.label}
                      </div>
                    </div>

                    {/* Color Swatches */}
                    <div className="grid grid-cols-4 gap-1">
                      {sub.colors.map((cIdx, cSlot) => {
                        const col = NES_MASTER_PALETTE[cIdx] || NES_MASTER_PALETTE[0x0f];
                        const isBackdrop = cSlot === 0;
                        return (
                          <div
                            key={cSlot}
                            className="flex flex-col items-center p-1 rounded bg-neutral-950 border border-neutral-800"
                            title={`${col.name} ($${cIdx.toString(16).padStart(2, '0').toUpperCase()})${isBackdrop ? ' [Backdrop]' : ''}`}
                          >
                            <div
                              className="w-full h-5 rounded-sm shadow-inner"
                              style={{ backgroundColor: col.hex }}
                            />
                            <span className="text-[9px] font-mono text-neutral-400 mt-0.5">
                              ${cIdx.toString(16).padStart(2, '0').toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Target Specific Subpalette Apply Buttons */}
                    {onApplySingleSubpalette && (
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-800/60 text-[10px]">
                        <span className="text-neutral-500">Apply to:</span>
                        <div className="flex items-center gap-1 font-mono">
                          {[0, 1, 2, 3].map((targetId) => (
                            <button
                              key={targetId}
                              onClick={() => handleApplySubpal(activePreset, sIdx, targetId)}
                              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors border border-neutral-700/60"
                              title={`Apply this palette directly to Subpalette #${targetId}`}
                            >
                              #{targetId}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
