/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { NESHeader, NESGraphicsData, ConversionSettings } from './types/nes';
import { createDefaultHeader } from './utils/nesHeader';
import { convertImageToNES } from './utils/imageToNes';
import { buildCompleteNESRom, downloadBlob } from './utils/romBuilder';
import { HeaderInspector } from './components/HeaderInspector';
import { ImageConverter } from './components/ImageConverter';
import { PpuViewer } from './components/PpuViewer';
import { RomHeaderConverter } from './components/RomHeaderConverter';
import {
  Cpu,
  Layers,
  Download,
  Tv,
  FileCode,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export default function App() {
  const [header, setHeader] = useState<NESHeader>(() => createDefaultHeader(true));
  const [graphics, setGraphics] = useState<NESGraphicsData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentImageSource, setCurrentImageSource] = useState<HTMLImageElement | ImageData | null>(null);

  const [settings, setSettings] = useState<ConversionSettings>({
    ditherMethod: 'atkinson',
    ditherStrength: 75,
    brightness: 0,
    contrast: 10,
    saturation: 15,
    cropMode: 'fit_border',
    maxTiles: 256,
  });

  // Re-run conversion when image or settings change
  const handleProcessImage = useCallback(
    async (source: HTMLImageElement | ImageData) => {
      setCurrentImageSource(source);
      setIsProcessing(true);
      try {
        const result = await convertImageToNES(source, settings);
        setGraphics(result);
      } catch (err) {
        console.error('Image conversion error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [settings]
  );

  // Update a subpalette color directly from PPU inspector
  const handleUpdateSubpaletteColor = (
    subpalId: number,
    colorSlot: number,
    newNesColorIndex: number
  ) => {
    if (!graphics) return;
    const updatedSubpalettes = [...graphics.subPalettes] as [any, any, any, any];
    updatedSubpalettes[subpalId] = {
      ...updatedSubpalettes[subpalId],
      colors: [...updatedSubpalettes[subpalId].colors] as [number, number, number, number],
    };
    updatedSubpalettes[subpalId].colors[colorSlot] = newNesColorIndex;

    // If colorSlot is 0 (universal backdrop), sync all subpalettes
    if (colorSlot === 0) {
      for (let i = 0; i < 4; i++) {
        updatedSubpalettes[i].colors[0] = newNesColorIndex;
      }
    }

    setGraphics({
      ...graphics,
      universalBackdrop: colorSlot === 0 ? newNesColorIndex : graphics.universalBackdrop,
      subPalettes: updatedSubpalettes,
    });
  };

  const handleDownloadQuickRom = () => {
    if (!graphics) return;
    const { romBytes } = buildCompleteNESRom(graphics, header);
    downloadBlob(romBytes, 'nes_studio_rom.nes');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* Top Bar (Universal Frontend Design Top Bar Contract) */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Zone 1: Single text element wordmark */}
          <a href="#" className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span>NES ROM Studio</span>
          </a>

          {/* Zone 2: 4-6 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
            <a href="#pipeline" className="hover:text-white transition-colors">
              Graphics Pipeline
            </a>
            <a href="#ppu-screen" className="hover:text-white transition-colors">
              PPU Display
            </a>
            <a href="#header-architect" className="hover:text-white transition-colors">
              Header Architect
            </a>
            <a href="#exporter" className="hover:text-white transition-colors">
              ROM Exporter
            </a>
            <a href="#specs" className="hover:text-white transition-colors">
              Hardware Specs
            </a>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadQuickRom}
              disabled={!graphics}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-950 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Build .NES ROM</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Workspace Intro Hero Banner */}
        <section className="p-6 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 rounded-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-2">
            <div className="flex items-center gap-2 text-xs text-rose-400 font-mono">
              <span>Nintendo Entertainment System & Famicom</span>
              <span aria-hidden="true">·</span>
              <span>2C02 PPU Architecture</span>
              <span aria-hidden="true">·</span>
              <span>iNES 1.0 & NES 2.0 Compliant</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white text-balance">
              Image to NES ROM Header Converter & PPU Studio
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Transform standard images into authentic 2bpp NES pattern tables and nametables.
              Inspect and configure 16-byte ROM headers with bitmask accuracy, and export bootable 6502 machine code ROMs that run on hardware flashcarts and emulators.
            </p>
          </div>
        </section>

        {/* Section 1: Image to NES Graphics Pipeline */}
        <section id="pipeline" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
              <h2 className="text-sm font-semibold text-neutral-200">
                Image Ingestion & PPU Quantization
              </h2>
            </div>
            <div className="text-xs text-neutral-400">
              <span>32×30 Macroblocks</span>
              <span className="mx-1.5">·</span>
              <span>2bpp Planar Encoding</span>
            </div>
          </div>
          <ImageConverter
            settings={settings}
            onSettingsChange={(newSettings) => {
              setSettings(newSettings);
            }}
            onProcessImage={handleProcessImage}
            isProcessing={isProcessing}
          />
        </section>

        {/* Section 2: PPU Display & Subpalettes */}
        <section id="ppu-screen" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
              <h2 className="text-sm font-semibold text-neutral-200">
                PPU Screen Output & Pattern Tables
              </h2>
            </div>
            <div className="text-xs text-neutral-400">
              <span>64 Master Palette Colors</span>
              <span className="mx-1.5">·</span>
              <span>4 Background Subpalettes</span>
            </div>
          </div>
          <PpuViewer
            graphics={graphics}
            onUpdateSubpaletteColor={handleUpdateSubpaletteColor}
          />
        </section>

        {/* Section 3: ROM Header Architect */}
        <section id="header-architect" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-rose-500 rounded-full" />
              <h2 className="text-sm font-semibold text-neutral-200">
                ROM Header Architect & Bitmask Inspector
              </h2>
            </div>
            <div className="text-xs text-neutral-400">
              <span>16-Byte Header</span>
              <span className="mx-1.5">·</span>
              <span>NES 2.0 Extended Specifications</span>
            </div>
          </div>
          <HeaderInspector
            header={header}
            onChange={(newHeader) => setHeader(newHeader)}
          />
        </section>

        {/* Section 4: ROM Header Converter & Exporter */}
        <section id="exporter" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-purple-500 rounded-full" />
              <h2 className="text-sm font-semibold text-neutral-200">
                ROM Header Converter & Production Exporter
              </h2>
            </div>
            <div className="text-xs text-neutral-400">
              <span>.NES</span>
              <span className="mx-1">/</span>
              <span>.HDR</span>
              <span className="mx-1">/</span>
              <span>.CHR</span>
              <span className="mx-1">/</span>
              <span>.NAM</span>
              <span className="mx-1">/</span>
              <span>.PAL</span>
            </div>
          </div>
          <RomHeaderConverter
            header={header}
            graphics={graphics}
            onHeaderLoaded={(loadedHeader) => setHeader(loadedHeader)}
          />
        </section>

        {/* Section 5: NES Technical Reference & Specifications */}
        <section id="specs" className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm font-semibold text-neutral-200">
              NES Hardware & Header Specification Reference
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1.5">
              <h4 className="font-semibold text-neutral-200">iNES 1.0 vs NES 2.0</h4>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                iNES 1.0 (created in 1996) supported 8-bit mapper numbers (0-255). NES 2.0 extends this to 12-bit mappers (0-4095), adds 4-bit submappers, PRG/CHR RAM sizes in exact powers of two, and region/console flags indicated by bytes 7 bits 2-3 equal to <code className="text-rose-400">0x08</code>.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1.5">
              <h4 className="font-semibold text-neutral-200">2C02 PPU Attribute Constraints</h4>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                NES background graphics divide 256×240 into 32×30 8×8 tiles. Color is restricted by the 16×16 attribute table: every 2×2 tile area must share one of 4 subpalettes. Each subpalette has 3 custom colors plus 1 globally shared background color.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1.5">
              <h4 className="font-semibold text-neutral-200">6502 Displayer Architecture</h4>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                The exported <code className="text-blue-400">.nes</code> ROM contains 16KB of assembled 6502 machine code. It initializes the stack, waits two PPU vblanks, copies the 32-byte palette into PPU <code className="text-emerald-400">$3F00</code>, writes the 1024-byte nametable into <code className="text-emerald-400">$2000</code>, and activates rendering.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 px-6 py-6 mt-12 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">NES ROM & Header Studio</span>
            <span>·</span>
            <span>Hardware-compliant iNES & NES 2.0 image pipeline</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#pipeline" className="hover:text-neutral-200 transition-colors">
              Converter
            </a>
            <a href="#header-architect" className="hover:text-neutral-200 transition-colors">
              Header
            </a>
            <a href="#exporter" className="hover:text-neutral-200 transition-colors">
              Export
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
