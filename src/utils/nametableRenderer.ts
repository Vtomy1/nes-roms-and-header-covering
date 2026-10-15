import { NESGraphicsData, SubPalette } from '../types/nes';
import { NES_MASTER_PALETTE } from './nesPalette';
import { decodeTile2bpp } from './imageToNes';

/**
 * Renders the full 256x240 NES screen from the current nametable,
 * attribute table, pattern table, and subpalettes.
 */
export function renderFullNametableImage(graphics: NESGraphicsData): ImageData {
  const width = 256;
  const height = 240;
  const imgData = new ImageData(width, height);
  const data = imgData.data;

  const { nametable, attributeTable, patternTable, subPalettes } = graphics;

  // Screen is 32 tiles wide x 30 tiles high
  for (let ty = 0; ty < 30; ty++) {
    for (let tx = 0; tx < 32; tx++) {
      const tileId = nametable[ty * 32 + tx];
      const byteOffset = tileId * 16;

      // Determine subpalette from 16x16 macroblock attribute table
      const bx = Math.floor(tx / 2);
      const by = Math.floor(ty / 2);
      const attrIdx = Math.floor(by / 2) * 8 + Math.floor(bx / 2);
      const attrByte = attributeTable[attrIdx] || 0;
      const quadrant = ((by % 2) << 1) | (bx % 2);
      const subpalId = (attrByte >> (quadrant * 2)) & 0x03;

      const pal = subPalettes[subpalId]?.colors || subPalettes[0].colors;

      // Decode 16 bytes for this 8x8 tile
      for (let row = 0; row < 8; row++) {
        const plane0 = patternTable[byteOffset + row] || 0;
        const plane1 = patternTable[byteOffset + row + 8] || 0;

        for (let col = 0; col < 8; col++) {
          const shift = 7 - col;
          const bit0 = (plane0 >> shift) & 1;
          const bit1 = (plane1 >> shift) & 1;
          const color2bit = bit0 | (bit1 << 1);

          const nesColorIdx = pal[color2bit];
          const nesCol = NES_MASTER_PALETTE[nesColorIdx] || NES_MASTER_PALETTE[0x0F];

          const px = tx * 8 + col;
          const py = ty * 8 + row;
          const pixelIdx = (py * width + px) * 4;

          data[pixelIdx + 0] = nesCol.r;
          data[pixelIdx + 1] = nesCol.g;
          data[pixelIdx + 2] = nesCol.b;
          data[pixelIdx + 3] = 255;
        }
      }
    }
  }

  return imgData;
}

/**
 * Renders a single 8x8 tile to a canvas context or returns a 64-pixel ImageData
 */
export function renderSingleTileImage(
  tileId: number,
  patternTable: Uint8Array,
  subpalette: SubPalette
): ImageData {
  const imgData = new ImageData(8, 8);
  const data = imgData.data;
  const byteOffset = tileId * 16;

  for (let row = 0; row < 8; row++) {
    const plane0 = patternTable[byteOffset + row] || 0;
    const plane1 = patternTable[byteOffset + row + 8] || 0;

    for (let col = 0; col < 8; col++) {
      const shift = 7 - col;
      const bit0 = (plane0 >> shift) & 1;
      const bit1 = (plane1 >> shift) & 1;
      const color2bit = bit0 | (bit1 << 1);

      const nesColorIdx = subpalette.colors[color2bit];
      const nesCol = NES_MASTER_PALETTE[nesColorIdx] || NES_MASTER_PALETTE[0x0F];

      const pixelIdx = (row * 8 + col) * 4;
      data[pixelIdx + 0] = nesCol.r;
      data[pixelIdx + 1] = nesCol.g;
      data[pixelIdx + 2] = nesCol.b;
      data[pixelIdx + 3] = 255;
    }
  }

  return imgData;
}

/**
 * Flood fill algorithm for nametable tile placement
 */
export function floodFillNametable(
  nametable: Uint8Array,
  startX: number,
  startY: number,
  newTileId: number
): Uint8Array {
  const updated = new Uint8Array(nametable);
  const targetTileId = updated[startY * 32 + startX];
  if (targetTileId === newTileId) return updated;

  const queue: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(32 * 30);

  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const idx = y * 32 + x;

    if (x < 0 || x >= 32 || y < 0 || y >= 30) continue;
    if (visited[idx]) continue;
    visited[idx] = 1;

    if (updated[idx] === targetTileId) {
      updated[idx] = newTileId;

      if (x > 0) queue.push([x - 1, y]);
      if (x < 31) queue.push([x + 1, y]);
      if (y > 0) queue.push([x, y - 1]);
      if (y < 29) queue.push([x, y + 1]);
    }
  }

  return updated;
}

/**
 * Sets a 16x16 macroblock's subpalette in the 64-byte attribute table
 */
export function setAttributeSubpalette(
  attributeTable: Uint8Array,
  tileX: number,
  tileY: number,
  subpaletteId: number
): Uint8Array {
  const updated = new Uint8Array(attributeTable);
  const bx = Math.floor(tileX / 2); // 0..15
  const by = Math.floor(tileY / 2); // 0..14

  const attrIdx = Math.floor(by / 2) * 8 + Math.floor(bx / 2);
  if (attrIdx >= 64) return updated;

  const quadrant = ((by % 2) << 1) | (bx % 2); // 0 = TL, 1 = TR, 2 = BL, 3 = BR
  const shift = quadrant * 2;
  const mask = ~(0x03 << shift) & 0xFF;
  const currentByte = updated[attrIdx];

  updated[attrIdx] = (currentByte & mask) | ((subpaletteId & 0x03) << shift);
  return updated;
}
