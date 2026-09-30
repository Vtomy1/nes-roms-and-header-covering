import { NESHeader, MirroringType, TvSystem } from '../types/nes';

export const NES_MAGIC = [0x4E, 0x45, 0x53, 0x1A]; // "NES\x1A"

export interface MapperInfo {
  id: number;
  name: string;
  board: string;
  desc: string;
}

export const COMMON_MAPPERS: MapperInfo[] = [
  { id: 0, name: 'NROM', board: 'NROM-128 / NROM-256', desc: 'No mapper chip, 16K/32K PRG, 8K CHR (Super Mario Bros, Donkey Kong)' },
  { id: 1, name: 'MMC1 / SxROM', board: 'SAROM, SBROM, SCROM, SGROM, SKROM', desc: 'Bankswitching for PRG & CHR, configurable mirroring (Zelda, Metroid, Mega Man 2)' },
  { id: 2, name: 'UxROM', board: 'UNROM, UOROM', desc: 'PRG bankswitching, 8KB CHR-RAM (Castlevania, Mega Man, Contra)' },
  { id: 3, name: 'CNROM', board: 'CNROM', desc: 'CHR bankswitching up to 32KB, fixed PRG (Solomon\'s Key, Cybernoid)' },
  { id: 4, name: 'MMC3 / TxROM', board: 'TBROM, TEROM, TFROM, TGROM, TKROM, TSROM', desc: 'Scanline IRQ counter, PRG & CHR banking (Super Mario Bros 3, Mega Man 3-6)' },
  { id: 5, name: 'MMC5 / ExROM', board: 'EKROM, ELROM, ETROM, EWROM', desc: 'Advanced ASIC with scanline IRQ, 8x8 attribute tables, stereo audio (Castlevania III)' },
  { id: 7, name: 'AxROM', board: 'AMROM, ANROM, AOROM', desc: 'Single-screen mirroring, 32KB PRG banking, CHR-RAM (Battletoads, Marble Madness)' },
  { id: 9, name: 'MMC2 / PxROM', board: 'PNROM', desc: 'Tile-triggered CHR switching (Mike Tyson\'s Punch-Out!!)' },
  { id: 10, name: 'MMC4 / FxROM', board: 'FJROM, FKROM', desc: 'MMC2 variant with 16KB PRG banking (Fire Emblem)' },
  { id: 11, name: 'Color Dreams', board: 'COLORDREAMS', desc: 'Unlicensed hardware with PRG and CHR banking (Crystal Mines)' },
  { id: 13, name: 'CPROM', board: 'CPROM', desc: 'CHR-RAM banking for graphics manipulation (Videomation)' },
  { id: 19, name: 'Namco 163', board: 'NAMCOT-163', desc: 'Expansion wavetable sound, scanline IRQ, PRG/CHR banking' },
  { id: 24, name: 'VRC6a', board: 'KONAMI-VRC-6', desc: 'Konami custom ASIC with pulse and sawtooth expansion audio (Akumajou Densetsu)' },
  { id: 69, name: 'Sunsoft FME-7', board: 'SUNSOFT-5B', desc: 'FME-7 with scanline IRQ and AY-3-8910 sound (Gimmick!)' },
  { id: 71, name: 'Camerica / BF9093', board: 'CAMERICA', desc: 'Codemasters unlicensed games (Micro Machines, Dizzy)' },
  { id: 79, name: 'NINA-03 / NINA-06', board: 'AVE-NINA', desc: 'American Video Entertainment mapper' },
];

export function getMapperName(id: number): string {
  const found = COMMON_MAPPERS.find(m => m.id === id);
  return found ? `${found.name} (#${id})` : `Mapper ${id}`;
}

export function parseNESHeader(bytes: Uint8Array): NESHeader {
  const rawBytes = new Uint8Array(16);
  rawBytes.set(bytes.subarray(0, 16));

  const isValid =
    rawBytes[0] === NES_MAGIC[0] &&
    rawBytes[1] === NES_MAGIC[1] &&
    rawBytes[2] === NES_MAGIC[2] &&
    rawBytes[3] === NES_MAGIC[3];

  const prgRomSize16K = rawBytes[4];
  const chrRomSize8K = rawBytes[5];

  const flag6 = rawBytes[6];
  const flag7 = rawBytes[7];
  const flag8 = rawBytes[8];
  const flag9 = rawBytes[9];
  const flag10 = rawBytes[10];

  const mirroringBit = (flag6 & 0x01) !== 0;
  const fourScreen = (flag6 & 0x08) !== 0;
  let mirroring: MirroringType = mirroringBit ? 'vertical' : 'horizontal';
  if (fourScreen) mirroring = 'four_screen';

  const hasBattery = (flag6 & 0x02) !== 0;
  const hasTrainer = (flag6 & 0x04) !== 0;

  // NES 2.0 check: (byte 7 & 0x0C) === 0x08
  const isNES20 = (flag7 & 0x0C) === 0x08;

  let mapper = ((flag6 >> 4) & 0x0F) | (flag7 & 0xF0);
  let submapper = 0;
  let prgRamSizeKb = 0;
  let prgNvramSizeKb = hasBattery ? 8 : 0;
  let chrRamSizeKb = chrRomSize8K === 0 ? 8 : 0;
  let chrNvramSizeKb = 0;
  let tvSystem: TvSystem = 'ntsc';
  let vsSystemType = 0;
  let extendedConsoleType = 0;
  let miscRoms = 0;
  let expansionDevice = 0;

  if (isNES20) {
    // NES 2.0 Mapper (12-bit)
    const mapperHigh = flag8 & 0x0F;
    mapper = mapper | (mapperHigh << 8);
    submapper = (flag8 >> 4) & 0x0F;

    // Byte 9: PRG / CHR ROM size high nibbles
    // (prgRomSize16K can be extended if byte 9 & 0x0F != 0)
    const prgHigh = flag9 & 0x0F;
    const chrHigh = (flag9 >> 4) & 0x0F;
    // We keep standard 16K/8K multiplier for now

    // Byte 10: PRG RAM / NVRAM size
    const prgRamShift = flag10 & 0x0F;
    const prgNvramShift = (flag10 >> 4) & 0x0F;
    prgRamSizeKb = prgRamShift > 0 ? (64 << prgRamShift) / 1024 : 0;
    prgNvramSizeKb = prgNvramShift > 0 ? (64 << prgNvramShift) / 1024 : 0;

    // Byte 11: CHR RAM / NVRAM size
    const chrRamShift = rawBytes[11] & 0x0F;
    const chrNvramShift = (rawBytes[11] >> 4) & 0x0F;
    chrRamSizeKb = chrRamShift > 0 ? (64 << chrRamShift) / 1024 : (chrRomSize8K === 0 ? 8 : 0);
    chrNvramSizeKb = chrNvramShift > 0 ? (64 << chrNvramShift) / 1024 : 0;

    // Byte 12: Timing
    const timing = rawBytes[12] & 0x03;
    if (timing === 0) tvSystem = 'ntsc';
    else if (timing === 1) tvSystem = 'pal';
    else if (timing === 2) tvSystem = 'multi';
    else tvSystem = 'dendy';

    // Byte 13: System Type
    extendedConsoleType = rawBytes[13] & 0x0F;
    vsSystemType = (rawBytes[13] >> 4) & 0x0F;

    // Byte 14: Misc ROMs
    miscRoms = rawBytes[14] & 0x03;

    // Byte 15: Expansion Device
    expansionDevice = rawBytes[15] & 0x3F;
  } else {
    // Legacy iNES
    prgRamSizeKb = flag8 === 0 ? 8 : flag8 * 8; // byte 8 is 8KB units in iNES
    tvSystem = (flag9 & 0x01) === 1 ? 'pal' : 'ntsc';
  }

  return {
    isValid,
    isNES20,
    rawBytes,
    prgRomSize16K: prgRomSize16K || 1,
    chrRomSize8K,
    mapper,
    submapper,
    mirroring,
    hasBattery,
    hasTrainer,
    fourScreenVram: fourScreen,
    prgRamSizeKb,
    prgNvramSizeKb,
    chrRamSizeKb,
    chrNvramSizeKb,
    tvSystem,
    vsSystemType,
    extendedConsoleType,
    miscRoms,
    expansionDevice,
  };
}

export function serializeNESHeader(header: NESHeader): Uint8Array {
  const bytes = new Uint8Array(16);

  // Bytes 0-3: Magic
  bytes[0] = NES_MAGIC[0];
  bytes[1] = NES_MAGIC[1];
  bytes[2] = NES_MAGIC[2];
  bytes[3] = NES_MAGIC[3];

  // Byte 4: PRG ROM size in 16KB units
  bytes[4] = Math.max(1, Math.min(255, header.prgRomSize16K));

  // Byte 5: CHR ROM size in 8KB units
  bytes[5] = Math.max(0, Math.min(255, header.chrRomSize8K));

  // Byte 6: Flags 6
  let f6 = 0;
  if (header.mirroring === 'vertical') f6 |= 0x01;
  if (header.hasBattery) f6 |= 0x02;
  if (header.hasTrainer) f6 |= 0x04;
  if (header.mirroring === 'four_screen' || header.fourScreenVram) f6 |= 0x08;
  f6 |= (header.mapper & 0x0F) << 4; // Mapper lower nibble
  bytes[6] = f6;

  // Byte 7: Flags 7
  let f7 = (header.mapper & 0xF0); // Mapper middle nibble
  if (header.isNES20) {
    f7 |= 0x08; // NES 2.0 identifier in bits 2-3
  }
  bytes[7] = f7;

  if (header.isNES20) {
    // Byte 8: Mapper MSB & Submapper
    const mapperMsb = (header.mapper >> 8) & 0x0F;
    const submapper = header.submapper & 0x0F;
    bytes[8] = (submapper << 4) | mapperMsb;

    // Byte 9: PRG / CHR size MSB
    bytes[9] = 0; // For <= 4MB ROMs

    // Byte 10: PRG-RAM / PRG-NVRAM
    // 0 = none, otherwise log2(size / 64)
    const encodeRam = (kb: number) => {
      if (kb <= 0) return 0;
      const bytesCount = kb * 1024;
      const shift = Math.round(Math.log2(bytesCount / 64));
      return Math.max(1, Math.min(15, shift));
    };
    bytes[10] = (encodeRam(header.prgNvramSizeKb) << 4) | encodeRam(header.prgRamSizeKb);

    // Byte 11: CHR-RAM / CHR-NVRAM
    bytes[11] = (encodeRam(header.chrNvramSizeKb) << 4) | encodeRam(header.chrRamSizeKb);

    // Byte 12: Timing
    let timingByte = 0;
    if (header.tvSystem === 'ntsc') timingByte = 0;
    else if (header.tvSystem === 'pal') timingByte = 1;
    else if (header.tvSystem === 'multi') timingByte = 2;
    else if (header.tvSystem === 'dendy') timingByte = 3;
    bytes[12] = timingByte;

    // Byte 13: Extended console / VS system
    bytes[13] = (header.vsSystemType << 4) | (header.extendedConsoleType & 0x0F);

    // Byte 14: Misc ROMs
    bytes[14] = header.miscRoms & 0x03;

    // Byte 15: Expansion Device
    bytes[15] = header.expansionDevice & 0x3F;
  } else {
    // Legacy iNES format
    // Byte 8: PRG RAM size in 8KB units
    bytes[8] = Math.ceil(header.prgRamSizeKb / 8) || 1;

    // Byte 9: TV system (bit 0 = 1 for PAL)
    bytes[9] = header.tvSystem === 'pal' ? 1 : 0;

    // Bytes 10-15: Zero padding in clean iNES
    bytes[10] = 0;
    bytes[11] = 0;
    bytes[12] = 0;
    bytes[13] = 0;
    bytes[14] = 0;
    bytes[15] = 0;
  }

  return bytes;
}

export function createDefaultHeader(isNES20: boolean = true): NESHeader {
  const defaultBytes = new Uint8Array([
    0x4E, 0x45, 0x53, 0x1A, // NES^Z
    0x01,                   // 1x 16KB PRG (16KB)
    0x01,                   // 1x 8KB CHR (8KB)
    0x00,                   // Mapper 0 (NROM), Horizontal Mirroring
    isNES20 ? 0x08 : 0x00,  // Byte 7: NES 2.0 flag if true
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);

  return parseNESHeader(defaultBytes);
}

export interface HeaderPreset {
  name: string;
  category: string;
  description: string;
  header: Partial<NESHeader>;
}

export const HEADER_PRESETS: HeaderPreset[] = [
  {
    name: 'NROM-128 (Mapper 0)',
    category: 'Standard NROM',
    description: '16KB PRG, 8KB CHR, Horizontal mirroring. Best for image displayers, demos, and simple games (SMB1, Balloon Fight).',
    header: {
      mapper: 0,
      submapper: 0,
      prgRomSize16K: 1, // 16KB
      chrRomSize8K: 1,  // 8KB
      mirroring: 'horizontal',
      hasBattery: false,
      hasTrainer: false,
      isNES20: true,
      tvSystem: 'ntsc',
    },
  },
  {
    name: 'NROM-256 (Mapper 0)',
    category: 'Standard NROM',
    description: '32KB PRG, 8KB CHR, Vertical mirroring (Duck Hunt, Excitebike).',
    header: {
      mapper: 0,
      submapper: 0,
      prgRomSize16K: 2, // 32KB
      chrRomSize8K: 1,  // 8KB
      mirroring: 'vertical',
      hasBattery: false,
      hasTrainer: false,
      isNES20: true,
      tvSystem: 'ntsc',
    },
  },
  {
    name: 'UxROM / UNROM (Mapper 2)',
    category: 'Bankswitched PRG',
    description: '128KB PRG, 8KB CHR-RAM. Graphics are copied from PRG to VRAM (Castlevania, Mega Man 1).',
    header: {
      mapper: 2,
      submapper: 0,
      prgRomSize16K: 8, // 128KB
      chrRomSize8K: 0,  // CHR-RAM
      chrRamSizeKb: 8,
      mirroring: 'vertical',
      hasBattery: false,
      hasTrainer: false,
      isNES20: true,
      tvSystem: 'ntsc',
    },
  },
  {
    name: 'CNROM (Mapper 3)',
    category: 'Bankswitched CHR',
    description: '32KB PRG, 32KB CHR (4 banks of 8KB graphics) (Solomon\'s Key, Cybernoid).',
    header: {
      mapper: 3,
      submapper: 0,
      prgRomSize16K: 2, // 32KB
      chrRomSize8K: 4,  // 32KB CHR
      mirroring: 'horizontal',
      hasBattery: false,
      hasTrainer: false,
      isNES20: true,
      tvSystem: 'ntsc',
    },
  },
  {
    name: 'MMC1 / SxROM (Mapper 1)',
    category: 'Advanced ASIC',
    description: '128KB PRG, 128KB CHR, 8KB Save Battery (The Legend of Zelda, Metroid).',
    header: {
      mapper: 1,
      submapper: 0,
      prgRomSize16K: 8,
      chrRomSize8K: 16,
      mirroring: 'horizontal',
      hasBattery: true,
      prgNvramSizeKb: 8,
      hasTrainer: false,
      isNES20: true,
      tvSystem: 'ntsc',
    },
  },
  {
    name: 'MMC3 / TxROM (Mapper 4)',
    category: 'Advanced ASIC',
    description: '256KB PRG, 128KB CHR, Scanline IRQ counter, Vertical mirroring (Super Mario Bros 3).',
    header: {
      mapper: 4,
      submapper: 0,
      prgRomSize16K: 16,
      chrRomSize8K: 16,
      mirroring: 'vertical',
      hasBattery: false,
      hasTrainer: false,
      isNES20: true,
      tvSystem: 'ntsc',
    },
  },
];
