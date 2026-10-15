import { NESHeader } from '../types/nes';

export interface RomBlockInfo {
  id: string;
  name: string;
  shortName: string;
  category: 'header' | 'trainer' | 'prg' | 'chr' | 'padding';
  startOffset: number;
  endOffset: number; // inclusive
  size: number;
  cpuAddress?: string;
  ppuAddress?: string;
  colorBg: string;
  colorText: string;
  colorBorder: string;
  badgeColor: string;
  description: string;
  subBlocks?: RomBlockInfo[];
}

export interface RomStructureAnalysis {
  totalBytes: number;
  headerSize: number;
  trainerSize: number;
  prgSize: number;
  chrSize: number;
  blocks: RomBlockInfo[];
  prgVectors: {
    nmi: number;
    reset: number;
    irq: number;
    fileOffset: number;
  };
  isValid: boolean;
  warnings: string[];
}

export function calculateRomStructure(
  romBytes: Uint8Array,
  header: NESHeader,
  isGeneratedDisplayer: boolean = false
): RomStructureAnalysis {
  const totalBytes = romBytes.length;
  const blocks: RomBlockInfo[] = [];
  const warnings: string[] = [];

  // 1. Header Block (Always 16 bytes)
  const headerBlock: RomBlockInfo = {
    id: 'header',
    name: header.isNES20 ? 'NES 2.0 Header' : 'iNES 1.0 Header',
    shortName: 'Header',
    category: 'header',
    startOffset: 0,
    endOffset: 15,
    size: 16,
    cpuAddress: 'N/A (Host File Meta)',
    colorBg: 'bg-rose-500/15',
    colorText: 'text-rose-300',
    colorBorder: 'border-rose-500/40',
    badgeColor: 'bg-rose-500 text-white',
    description: `16-byte ${header.isNES20 ? 'NES 2.0' : 'iNES'} ROM descriptor specifying Mapper #${header.mapper}, ${header.prgRomSize16K * 16}KB PRG, ${header.chrRomSize8K * 8}KB CHR.`,
  };
  blocks.push(headerBlock);

  let currentOffset = 16;

  // 2. Trainer Block (512 bytes, if enabled)
  let trainerSize = 0;
  if (header.hasTrainer) {
    trainerSize = 512;
    blocks.push({
      id: 'trainer',
      name: 'Trainer Data',
      shortName: 'Trainer',
      category: 'trainer',
      startOffset: currentOffset,
      endOffset: currentOffset + trainerSize - 1,
      size: trainerSize,
      cpuAddress: '$7000 - $71FF (SRAM)',
      colorBg: 'bg-purple-500/15',
      colorText: 'text-purple-300',
      colorBorder: 'border-purple-500/40',
      badgeColor: 'bg-purple-500 text-white',
      description: '512-byte compatibility trainer loaded into cartridge SRAM space before game launch.',
    });
    currentOffset += trainerSize;
  }

  // 3. PRG-ROM Blocks
  const prgSize = Math.max(1, header.prgRomSize16K) * 16384;
  const prgStartOffset = currentOffset;
  const prgEndOffset = prgStartOffset + prgSize - 1;

  // Extract vectors from end of PRG ROM
  const vectorOffset = prgEndOffset - 5;
  let nmiVec = 0;
  let resetVec = 0;
  let irqVec = 0;

  if (romBytes.length >= prgEndOffset + 1) {
    nmiVec = romBytes[vectorOffset] | (romBytes[vectorOffset + 1] << 8);
    resetVec = romBytes[vectorOffset + 2] | (romBytes[vectorOffset + 3] << 8);
    irqVec = romBytes[vectorOffset + 4] | (romBytes[vectorOffset + 5] << 8);
  }

  if (isGeneratedDisplayer) {
    // Sub-segment breakdown for the synthesized 6502 image displayer:
    // Code: 86 instructions bytes
    // Palettes: 32 bytes
    // Nametable: 1024 bytes
    // Padding: up to vectorOffset
    // Vectors: 6 bytes
    const codeSize = 88;
    const palSize = 32;
    const ntSize = 1024;
    const vectorsSize = 6;
    const paddingSize = Math.max(0, prgSize - codeSize - palSize - ntSize - vectorsSize);

    // PRG Code Block
    blocks.push({
      id: 'prg_code',
      name: 'PRG Boot & Displayer Code',
      shortName: 'PRG Code',
      category: 'prg',
      startOffset: prgStartOffset,
      endOffset: prgStartOffset + codeSize - 1,
      size: codeSize,
      cpuAddress: `$C000 - $${(0xC000 + codeSize - 1).toString(16).toUpperCase()}`,
      colorBg: 'bg-blue-500/15',
      colorText: 'text-blue-300',
      colorBorder: 'border-blue-500/40',
      badgeColor: 'bg-blue-500 text-white',
      description: '6502 machine code: SEI, stack init, dual VBlank wait, RAM zeroing, and PPU streaming loader.',
    });

    // PRG Palettes Block
    const palStart = prgStartOffset + codeSize;
    blocks.push({
      id: 'prg_pal',
      name: 'PRG NES Palette Table',
      shortName: 'Palettes',
      category: 'prg',
      startOffset: palStart,
      endOffset: palStart + palSize - 1,
      size: palSize,
      cpuAddress: `$${(0xC000 + codeSize).toString(16).toUpperCase()} → PPU $3F00-$3F1F`,
      ppuAddress: '$3F00 - $3F1F',
      colorBg: 'bg-amber-500/15',
      colorText: 'text-amber-300',
      colorBorder: 'border-amber-500/40',
      badgeColor: 'bg-amber-500 text-white',
      description: '32-byte color palette data: 16 bytes background subpalettes + 16 bytes sprite palette mirror.',
    });

    // PRG Nametable Block
    const ntStart = palStart + palSize;
    blocks.push({
      id: 'prg_nametable',
      name: 'PRG Nametable & Attributes',
      shortName: 'Nametable',
      category: 'prg',
      startOffset: ntStart,
      endOffset: ntStart + ntSize - 1,
      size: ntSize,
      cpuAddress: `$${(0xC000 + codeSize + palSize).toString(16).toUpperCase()} → PPU $2000-$23FF`,
      ppuAddress: '$2000 - $23FF',
      colorBg: 'bg-emerald-500/15',
      colorText: 'text-emerald-300',
      colorBorder: 'border-emerald-500/40',
      badgeColor: 'bg-emerald-500 text-white',
      description: '1024-byte screen data: 960 tile index bytes (32×30) + 64 attribute bytes (16×16 color groups).',
    });

    // PRG Padding Block (if any)
    if (paddingSize > 0) {
      blocks.push({
        id: 'prg_padding',
        name: 'PRG Unused Padding ($00)',
        shortName: 'PRG Fill',
        category: 'padding',
        startOffset: ntStart + ntSize,
        endOffset: prgEndOffset - vectorsSize,
        size: paddingSize,
        cpuAddress: `$${(0xC000 + codeSize + palSize + ntSize).toString(16).toUpperCase()} - $FFF9`,
        colorBg: 'bg-neutral-800/20',
        colorText: 'text-neutral-400',
        colorBorder: 'border-neutral-800',
        badgeColor: 'bg-neutral-700 text-neutral-300',
        description: `${paddingSize.toLocaleString()} bytes of empty ROM space zero-filled to maintain 16KB bank alignment.`,
      });
    }

    // PRG Vectors Block
    blocks.push({
      id: 'prg_vectors',
      name: '6502 CPU Interrupt Vectors',
      shortName: 'Vectors',
      category: 'prg',
      startOffset: vectorOffset,
      endOffset: prgEndOffset,
      size: vectorsSize,
      cpuAddress: '$FFFA - $FFFF',
      colorBg: 'bg-rose-600/20',
      colorText: 'text-rose-300',
      colorBorder: 'border-rose-600/50',
      badgeColor: 'bg-rose-600 text-white',
      description: `Hardware jump vectors: NMI ($${nmiVec.toString(16).toUpperCase()}), Reset ($${resetVec.toString(16).toUpperCase()}), IRQ/BRK ($${irqVec.toString(16).toUpperCase()}).`,
    });
  } else {
    // For general / uploaded ROMs:
    // Split into 16KB PRG Banks
    const bankCount = header.prgRomSize16K;
    for (let b = 0; b < bankCount; b++) {
      const bStart = prgStartOffset + b * 16384;
      const bEnd = bStart + 16383;
      const isLastBank = b === bankCount - 1;

      blocks.push({
        id: `prg_bank_${b}`,
        name: `PRG-ROM Bank #${b} (16KB)`,
        shortName: `PRG #${b}`,
        category: 'prg',
        startOffset: bStart,
        endOffset: bEnd,
        size: 16384,
        cpuAddress: bankCount === 1 ? '$C000 - $FFFF' : (b === 0 ? '$8000 - $BFFF' : (isLastBank ? '$C000 - $FFFF' : 'Bankswitched $8000+')),
        colorBg: 'bg-blue-500/15',
        colorText: 'text-blue-300',
        colorBorder: 'border-blue-500/40',
        badgeColor: 'bg-blue-500 text-white',
        description: `16,384 bytes of program execution code, audio music drivers, and level tables.`,
      });
    }
  }

  currentOffset += prgSize;

  // 4. CHR-ROM Block
  const chrSize = header.chrRomSize8K * 8192;
  if (chrSize > 0) {
    const chrStartOffset = currentOffset;
    // Divide into 4KB Pattern Tables
    const patternTableCount = (chrSize / 4096);
    for (let p = 0; p < Math.min(patternTableCount, 8); p++) {
      const pStart = chrStartOffset + p * 4096;
      const pEnd = pStart + 4095;
      const ppuAddr = p % 2 === 0 ? '$0000 - $0FFF' : '$1000 - $1FFF';

      blocks.push({
        id: `chr_pattern_${p}`,
        name: `CHR Pattern Table #${p} (4KB)`,
        shortName: `CHR #${p}`,
        category: 'chr',
        startOffset: pStart,
        endOffset: pEnd,
        size: 4096,
        ppuAddress: ppuAddr,
        colorBg: 'bg-cyan-500/15',
        colorText: 'text-cyan-300',
        colorBorder: 'border-cyan-500/40',
        badgeColor: 'bg-cyan-500 text-neutral-950',
        description: `4,096 bytes: 256 tiles × 16 bytes (2bpp planar graphics mapped to PPU ${ppuAddr}).`,
      });
    }
    currentOffset += chrSize;
  } else {
    // CHR-RAM note
    warnings.push('Header specifies CHR ROM Size = 0 (Cartridge uses CHR-RAM). No CHR data is appended to ROM file.');
  }

  // Validate integrity
  const expectedTotal = 16 + trainerSize + prgSize + chrSize;
  let isValid = true;
  if (totalBytes !== expectedTotal) {
    warnings.push(`File size (${totalBytes.toLocaleString()} bytes) differs from calculated header size (${expectedTotal.toLocaleString()} bytes).`);
    isValid = false;
  }

  return {
    totalBytes,
    headerSize: 16,
    trainerSize,
    prgSize,
    chrSize,
    blocks,
    prgVectors: {
      nmi: nmiVec,
      reset: resetVec,
      irq: irqVec,
      fileOffset: vectorOffset,
    },
    isValid,
    warnings,
  };
}

export function formatOffset(offset: number): string {
  return '0x' + offset.toString(16).padStart(6, '0').toUpperCase();
}

export function formatHexByte(byte: number): string {
  return byte.toString(16).padStart(2, '0').toUpperCase();
}
