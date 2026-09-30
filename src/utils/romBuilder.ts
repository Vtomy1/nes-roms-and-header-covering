import { NESHeader, NESGraphicsData } from '../types/nes';
import { serializeNESHeader } from './nesHeader';

export interface GeneratedRom {
  romBytes: Uint8Array;
  headerBytes: Uint8Array;
  prgBytes: Uint8Array;
  chrBytes: Uint8Array;
  paletteBytes: Uint8Array;
  nametableBytes: Uint8Array;
}

export function buildCompleteNESRom(
  graphics: NESGraphicsData,
  headerConfig: NESHeader
): GeneratedRom {
  // 1. Prepare 32-byte Palette Data
  // 16 bytes background palette ($3F00-$3F0F) + 16 bytes sprite palette ($3F10-$3F1F)
  const paletteBytes = new Uint8Array(32);
  for (let s = 0; s < 4; s++) {
    const sub = graphics.subPalettes[s];
    paletteBytes[s * 4 + 0] = sub.colors[0];
    paletteBytes[s * 4 + 1] = sub.colors[1];
    paletteBytes[s * 4 + 2] = sub.colors[2];
    paletteBytes[s * 4 + 3] = sub.colors[3];

    // Mirror to sprite palette
    paletteBytes[16 + s * 4 + 0] = sub.colors[0];
    paletteBytes[16 + s * 4 + 1] = sub.colors[1];
    paletteBytes[16 + s * 4 + 2] = sub.colors[2];
    paletteBytes[16 + s * 4 + 3] = sub.colors[3];
  }

  // 2. Prepare 1024-byte Nametable + Attribute table
  const nametableBytes = new Uint8Array(1024);
  nametableBytes.set(graphics.nametable.subarray(0, 960), 0);
  nametableBytes.set(graphics.attributeTable.subarray(0, 64), 960);

  // 3. Prepare 8KB CHR-ROM
  const chrBytes = new Uint8Array(8192);
  chrBytes.set(graphics.patternTable.subarray(0, 8192), 0);

  // 4. Assemble 16KB PRG-ROM (16,384 bytes)
  // Base address for 16KB PRG is $C000
  const prgSize = Math.max(1, headerConfig.prgRomSize16K) * 16384;
  const prgBytes = new Uint8Array(prgSize);

  // Addresses in 6502 memory space
  const CODE_BASE = 0xC000;
  let pc = 0;

  // Assembly instructions array
  const code: number[] = [
    // SEI, CLD
    0x78,
    0xD8,

    // LDX #$40; STX $4017 (Disable APU frame IRQ)
    0xA2, 0x40,
    0x8E, 0x17, 0x40,

    // LDX #$FF; TXS (Init stack)
    0xA2, 0xFF,
    0x9A,

    // LDA #$00; STA $2000; STA $2001; STA $4010
    0xA9, 0x00,
    0x8D, 0x00, 0x20,
    0x8D, 0x01, 0x20,
    0x8D, 0x10, 0x40,

    // vblank wait 1: BIT $2002; BPL vblank_1
    0x2C, 0x02, 0x20,
    0x10, 0xFB,

    // Clear RAM: $0000-$07FF
    // LDX #$00; LDA #$00;
    // clear_loop: STA $0000, X; STA $0100, X; STA $0200, X; STA $0300, X; STA $0400, X; STA $0500, X; STA $0600, X; STA $0700, X; INX; BNE clear_loop
    0xA2, 0x00,
    0xA9, 0x00,
    // loop start (offset +20):
    0x9D, 0x00, 0x00,
    0x9D, 0x00, 0x01,
    0x9D, 0x00, 0x02,
    0x9D, 0x00, 0x03,
    0x9D, 0x00, 0x04,
    0x9D, 0x00, 0x05,
    0x9D, 0x00, 0x06,
    0x9D, 0x00, 0x07,
    0xE8,
    0xD0, 0xE5, // BNE -27 bytes back to STA $0000, X

    // vblank wait 2: BIT $2002; BPL vblank_2
    0x2C, 0x02, 0x20,
    0x10, 0xFB,

    // Reset PPU latch: BIT $2002
    0x2C, 0x02, 0x20,

    // Set PPU address to $3F00 (Palette RAM)
    // LDA #$3F; STA $2006; LDA #$00; STA $2006
    0xA9, 0x3F,
    0x8D, 0x06, 0x20,
    0xA9, 0x00,
    0x8D, 0x06, 0x20,
  ];

  // Palette copy loop:
  // LDX #$00
  // pal_loop: LDA pal_data, X; STA $2007; INX; CPX #$20; BNE pal_loop
  // We'll place pal_data right after code
  const palLoopStartPc = CODE_BASE + code.length;
  // We placeholder pal_data address, let's fix it later
  code.push(
    0xA2, 0x00,       // LDX #$00
    0xBD, 0x00, 0x00, // LDA pal_data, X (placeholder address)
    0x8D, 0x07, 0x20, // STA $2007
    0xE8,             // INX
    0xE0, 0x20,       // CPX #$20
    0xD0, 0xF5        // BNE -11
  );
  const palAddrOffset = code.length - 8; // Pointer to pal_data low/high byte

  // Set PPU address to $2000 (Nametable 0)
  // BIT $2002
  // LDA #$20; STA $2006; LDA #$00; STA $2006
  code.push(
    0x2C, 0x02, 0x20,
    0xA9, 0x20,
    0x8D, 0x06, 0x20,
    0xA9, 0x00,
    0x8D, 0x06, 0x20
  );

  // Nametable copy loop: 4 pages of 256 bytes = 1024 bytes
  // Page 0
  code.push(
    0xA2, 0x00,
    0xBD, 0x00, 0x00, // LDA nt_data, X
    0x8D, 0x07, 0x20,
    0xE8,
    0xD0, 0xF7
  );
  const ntAddrOffset0 = code.length - 7;

  // Page 1
  code.push(
    0xA2, 0x00,
    0xBD, 0x00, 0x00, // LDA nt_data + 256, X
    0x8D, 0x07, 0x20,
    0xE8,
    0xD0, 0xF7
  );
  const ntAddrOffset1 = code.length - 7;

  // Page 2
  code.push(
    0xA2, 0x00,
    0xBD, 0x00, 0x00, // LDA nt_data + 512, X
    0x8D, 0x07, 0x20,
    0xE8,
    0xD0, 0xF7
  );
  const ntAddrOffset2 = code.length - 7;

  // Page 3
  code.push(
    0xA2, 0x00,
    0xBD, 0x00, 0x00, // LDA nt_data + 768, X
    0x8D, 0x07, 0x20,
    0xE8,
    0xD0, 0xF7
  );
  const ntAddrOffset3 = code.length - 7;

  // Reset Scroll: BIT $2002; LDA #$00; STA $2005; STA $2005
  code.push(
    0x2C, 0x02, 0x20,
    0xA9, 0x00,
    0x8D, 0x05, 0x20,
    0x8D, 0x05, 0x20
  );

  // Turn on PPU rendering:
  // LDA #%00000000; STA $2000 (Base nametable 0, background pattern table $0000)
  // LDA #%00001110; STA $2001 (Show background, left 8px background)
  code.push(
    0xA9, 0x00,
    0x8D, 0x00, 0x20,
    0xA9, 0x0E,
    0x8D, 0x01, 0x20
  );

  // Infinite loop: JMP $this
  const loopAddr = CODE_BASE + code.length;
  code.push(
    0x4C, loopAddr & 0xFF, (loopAddr >> 8) & 0xFF
  );

  // RTI handler for NMI & IRQ
  const rtiAddr = CODE_BASE + code.length;
  code.push(0x40); // RTI

  // Now append Palette data
  const palDataAddr = CODE_BASE + code.length;
  const palDataIndex = code.length;
  for (let i = 0; i < 32; i++) {
    code.push(paletteBytes[i]);
  }

  // Now append Nametable data (1024 bytes)
  const ntDataAddr = CODE_BASE + code.length;
  const ntDataIndex = code.length;
  for (let i = 0; i < 1024; i++) {
    code.push(nametableBytes[i]);
  }

  // Patch addresses in the code instructions
  // Patch pal_data address
  code[palAddrOffset] = palDataAddr & 0xFF;
  code[palAddrOffset + 1] = (palDataAddr >> 8) & 0xFF;

  // Patch nt_data addresses for all 4 pages
  code[ntAddrOffset0] = ntDataAddr & 0xFF;
  code[ntAddrOffset0 + 1] = (ntDataAddr >> 8) & 0xFF;

  const nt1 = ntDataAddr + 256;
  code[ntAddrOffset1] = nt1 & 0xFF;
  code[ntAddrOffset1 + 1] = (nt1 >> 8) & 0xFF;

  const nt2 = ntDataAddr + 512;
  code[ntAddrOffset2] = nt2 & 0xFF;
  code[ntAddrOffset2 + 1] = (nt2 >> 8) & 0xFF;

  const nt3 = ntDataAddr + 768;
  code[ntAddrOffset3] = nt3 & 0xFF;
  code[ntAddrOffset3 + 1] = (nt3 >> 8) & 0xFF;

  // Copy code into prgBytes
  for (let i = 0; i < code.length; i++) {
    prgBytes[i] = code[i];
  }

  // 6502 Interrupt Vectors at the end of PRG ROM:
  // $FFFA-$FFFB: NMI
  // $FFFC-$FFFD: Reset
  // $FFFE-$FFFF: IRQ/BRK
  const vectorOffset = prgSize - 6;

  // NMI Vector
  prgBytes[vectorOffset + 0] = rtiAddr & 0xFF;
  prgBytes[vectorOffset + 1] = (rtiAddr >> 8) & 0xFF;

  // Reset Vector -> $C000
  prgBytes[vectorOffset + 2] = CODE_BASE & 0xFF;
  prgBytes[vectorOffset + 3] = (CODE_BASE >> 8) & 0xFF;

  // IRQ Vector
  prgBytes[vectorOffset + 4] = rtiAddr & 0xFF;
  prgBytes[vectorOffset + 5] = (rtiAddr >> 8) & 0xFF;

  // If 32KB PRG (NROM-256), mirror or duplicate first bank into second
  if (headerConfig.prgRomSize16K === 2) {
    prgBytes.set(prgBytes.subarray(0, 16384), 16384);
  }

  // 5. Serialize Header
  const headerBytes = serializeNESHeader({
    ...headerConfig,
    prgRomSize16K: headerConfig.prgRomSize16K || 1,
    chrRomSize8K: 1, // 8KB CHR
  });

  // 6. Concatenate full ROM: Header (16) + Trainer (0 or 512) + PRG + CHR
  const trainerSize = headerConfig.hasTrainer ? 512 : 0;
  const totalRomSize = 16 + trainerSize + prgSize + 8192;
  const romBytes = new Uint8Array(totalRomSize);

  romBytes.set(headerBytes, 0);
  let curOffset = 16;
  if (trainerSize > 0) {
    // Fill trainer with 0
    curOffset += trainerSize;
  }
  romBytes.set(prgBytes, curOffset);
  curOffset += prgSize;
  romBytes.set(chrBytes, curOffset);

  return {
    romBytes,
    headerBytes,
    prgBytes,
    chrBytes,
    paletteBytes,
    nametableBytes,
  };
}

export function downloadBlob(bytes: Uint8Array, filename: string, mimeType: string = 'application/octet-stream') {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
