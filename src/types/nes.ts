export interface NESColor {
  index: number; // 0x00 to 0x3F
  hex: string;
  r: number;
  g: number;
  b: number;
  name: string;
}

export type MirroringType = 'horizontal' | 'vertical' | 'four_screen' | 'single_screen_0' | 'single_screen_1';

export type TvSystem = 'ntsc' | 'pal' | 'multi' | 'dendy';

export interface NESHeader {
  // Identification
  isNES20: boolean;
  isValid: boolean;
  rawBytes: Uint8Array; // 16 bytes

  // Basic iNES fields
  prgRomSize16K: number; // in 16KB units
  chrRomSize8K: number;  // in 8KB units (0 = CHR RAM)
  mapper: number;        // 0 to 4095
  submapper: number;     // 0 to 15 (NES 2.0)
  mirroring: MirroringType;
  hasBattery: boolean;
  hasTrainer: boolean;
  fourScreenVram: boolean;

  // NES 2.0 Extended fields
  prgRamSizeKb: number;       // Volatile PRG RAM
  prgNvramSizeKb: number;     // Battery-backed PRG RAM
  chrRamSizeKb: number;       // Volatile CHR RAM
  chrNvramSizeKb: number;     // Battery-backed CHR RAM
  tvSystem: TvSystem;
  vsSystemType: number;       // VS Unisystem type
  extendedConsoleType: number;
  miscRoms: number;
  expansionDevice: number;
}

export interface SubPalette {
  id: number; // 0 to 3
  colors: [number, number, number, number]; // NES palette indices (color 0 is universal background)
}

export interface NESGraphicsData {
  width: number;  // 256
  height: number; // 240
  tilesX: number; // 32
  tilesY: number; // 30
  universalBackdrop: number; // NES color index (e.g. 0x0F)
  subPalettes: [SubPalette, SubPalette, SubPalette, SubPalette];
  patternTable: Uint8Array; // 8192 bytes (512 tiles * 16 bytes)
  uniqueTilesCount: number;
  nametable: Uint8Array; // 960 bytes (32x30 tile indices)
  attributeTable: Uint8Array; // 64 bytes (16x16 attribute data)
  previewImageData?: ImageData;
}

export type DitherMethod = 'none' | 'floyd_steinberg' | 'atkinson' | 'bayer_4x4' | 'bayer_8x8';

export interface ConversionSettings {
  ditherMethod: DitherMethod;
  ditherStrength: number; // 0 to 100
  brightness: number;     // -50 to 50
  contrast: number;       // -50 to 50
  saturation: number;     // -50 to 50
  cropMode: 'fit_border' | 'stretch' | 'crop_center';
  maxTiles: number;       // 256 or 512
  customBackdropColor?: number; // optional forced background color
}
