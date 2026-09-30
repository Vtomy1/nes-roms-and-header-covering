import React, { useState, useRef, useEffect } from 'react';
import { ConversionSettings, DitherMethod } from '../types/nes';
import { SAMPLE_PRESETS, SamplePreset } from '../utils/sampleImages';
import {
  Upload,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  RefreshCw,
  Maximize2,
  FileCheck2,
} from 'lucide-react';

interface ImageConverterProps {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
  onProcessImage: (source: HTMLImageElement | ImageData) => void;
  isProcessing: boolean;
}

export const ImageConverter: React.FC<ImageConverterProps> = ({
  settings,
  onSettingsChange,
  onProcessImage,
  isProcessing,
}) => {
  const [currentImageSource, setCurrentImageSource] = useState<HTMLImageElement | ImageData | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('sample_title_screen.png');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize with the first sample preset on mount
  useEffect(() => {
    const defaultPreset = SAMPLE_PRESETS[0];
    const imgData = defaultPreset.generate();
    setCurrentImageSource(imgData);
    setImageFileName(`${defaultPreset.id}.png`);
    onProcessImage(imgData);
  }, []);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFromFile(file);
  };

  const loadFromFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCurrentImageSource(img);
        onProcessImage(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            loadFromFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      loadFromFile(file);
    }
  };

  const loadPreset = (preset: SamplePreset) => {
    const imgData = preset.generate();
    setCurrentImageSource(imgData);
    setImageFileName(`${preset.id}.png`);
    onProcessImage(imgData);
  };

  const updateSetting = <K extends keyof ConversionSettings>(
    key: K,
    val: ConversionSettings[K]
  ) => {
    const updated = { ...settings, [key]: val };
    onSettingsChange(updated);
    if (currentImageSource) {
      onProcessImage(currentImageSource);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Top Title & Presets Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>Image to NES Graphics Pipeline</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                PPU Quantizer
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Converts full-color images into 2bpp CHR pattern tables and 16×16 attribute nametables.
            </p>
          </div>
        </div>

        {/* Re-process Button */}
        {currentImageSource && (
          <button
            onClick={() => onProcessImage(currentImageSource)}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Converting...' : 'Reconvert Image'}</span>
          </button>
        )}
      </div>

      {/* Preset Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-medium">Curated NES Presets</span>
          <span className="text-[11px] text-neutral-400">Instant demonstration graphics</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => loadPreset(preset)}
              className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950/60 hover:border-emerald-500/60 hover:bg-neutral-900 transition-all text-left group"
            >
              <div className="text-xs font-semibold text-neutral-200 group-hover:text-emerald-300 truncate">
                {preset.name}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {preset.category}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-950/20'
            : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/40 hover:bg-neutral-950/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-neutral-800 rounded-full text-neutral-300">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-200">
              Click to upload or drag & drop image here
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              PNG, JPG, BMP, WebP or paste clipboard screenshot directly (Ctrl+V)
            </p>
          </div>
          {imageFileName && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50 mt-1">
              <FileCheck2 className="w-3 h-3" />
              <span>Loaded: {imageFileName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Conversion Settings Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
        {/* Dithering Algorithm */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
            <span>Dithering Method</span>
            <span className="font-mono text-[11px] text-neutral-400">
              {settings.ditherMethod.replace('_', ' ')}
            </span>
          </label>
          <select
            value={settings.ditherMethod}
            onChange={(e) => updateSetting('ditherMethod', e.target.value as DitherMethod)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="none">None (Posterized / Clean Solids)</option>
            <option value="floyd_steinberg">Floyd-Steinberg (Error Diffusion)</option>
            <option value="atkinson">Atkinson (Classic Retro Mac/GameBoy)</option>
            <option value="bayer_4x4">Bayer 4×4 (Ordered Crosshatch)</option>
            <option value="bayer_8x8">Bayer 8×8 (Fine Dot Matrix)</option>
          </select>
          <p className="text-[11px] text-neutral-400">
            Atkinson and Bayer provide clean 8-bit retro texture without noise.
          </p>
        </div>

        {/* Dither Strength Slider */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
            <span>Dither Intensity</span>
            <span className="font-mono text-[11px] text-neutral-400">
              {settings.ditherStrength}%
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.ditherStrength}
            onChange={(e) => updateSetting('ditherStrength', parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>0% (Off)</span>
            <span>50%</span>
            <span>100% (Full)</span>
          </div>
        </div>

        {/* Crop / Fit Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300">Scaling & Aspect Ratio</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'fit_border', label: 'Fit Border' },
              { id: 'crop_center', label: 'Center Crop' },
              { id: 'stretch', label: 'Stretch' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => updateSetting('cropMode', m.id as any)}
                className={`py-1.5 px-2 text-xs rounded border transition-colors ${
                  settings.cropMode === m.id
                    ? 'bg-emerald-600 border-emerald-500 text-white font-medium'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-neutral-400">
            Fit Border adds black bars to preserve native 256×240 proportions.
          </p>
        </div>

        {/* Brightness */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
            <span>Brightness</span>
            <span className="font-mono text-[11px] text-neutral-400">
              {settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}
            </span>
          </label>
          <input
            type="range"
            min={-50}
            max={50}
            value={settings.brightness}
            onChange={(e) => updateSetting('brightness', parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
            <span>Contrast</span>
            <span className="font-mono text-[11px] text-neutral-400">
              {settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}
            </span>
          </label>
          <input
            type="range"
            min={-50}
            max={50}
            value={settings.contrast}
            onChange={(e) => updateSetting('contrast', parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
            <span>Saturation</span>
            <span className="font-mono text-[11px] text-neutral-400">
              {settings.saturation > 0 ? `+${settings.saturation}` : settings.saturation}
            </span>
          </label>
          <input
            type="range"
            min={-50}
            max={50}
            value={settings.saturation}
            onChange={(e) => updateSetting('saturation', parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
