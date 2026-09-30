import {
  ConversionSettings,
  NESGraphicsData,
  SubPalette,
} from '../types/nes';
import {
  NES_MASTER_PALETTE,
  getClosestNesColor,
  getPerceptualColorDistance,
} from './nesPalette';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Helper to adjust brightness, contrast, and saturation
function applyImageAdjustments(
  r: number,
  g: number,
  b: number,
  settings: ConversionSettings
): [number, number, number] {
  // Brightness: -50 to 50
  let adjR = r + (settings.brightness * 2.55);
  let adjG = g + (settings.brightness * 2.55);
  let adjB = b + (settings.brightness * 2.55);

  // Contrast: -50 to 50
  const factor = (259 * (settings.contrast + 100)) / (100 * (259 - settings.contrast));
  adjR = factor * (adjR - 128) + 128;
  adjG = factor * (adjG - 128) + 128;
  adjB = factor * (adjB - 128) + 128;

  // Saturation: -50 to 50
  const gray = 0.2989 * adjR + 0.5870 * adjG + 0.1140 * adjB;
  const satFactor = 1 + settings.saturation / 50;
  adjR = gray + (adjR - gray) * satFactor;
  adjG = gray + (adjG - gray) * satFactor;
  adjB = gray + (adjB - gray) * satFactor;

  return [
    Math.max(0, Math.min(255, adjR)),
    Math.max(0, Math.min(255, adjG)),
    Math.max(0, Math.min(255, adjB)),
  ];
}

export async function convertImageToNES(
  imageSource: HTMLImageElement | ImageBitmap | ImageData,
  settings: ConversionSettings
): Promise<NESGraphicsData> {
  const targetW = 256;
  const targetH = 240;

  // Create canvas for scaling and pixel reading
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetW, targetH);

  let srcW = 0;
  let srcH = 0;
  if ('width' in imageSource) {
    srcW = imageSource.width;
    srcH = imageSource.height;
  }

  // Draw image according to crop mode
  if (imageSource instanceof ImageData) {
    // Put temp image data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageSource.width;
    tempCanvas.height = imageSource.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageSource, 0, 0);
    drawImageWithCrop(ctx, tempCanvas, srcW, srcH, targetW, targetH, settings.cropMode);
  } else {
    drawImageWithCrop(ctx, imageSource, srcW, srcH, targetW, targetH, settings.cropMode);
  }

  const rawImgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = rawImgData.data;

  // 1. Pre-process RGB and map initial closest NES master palette colors
  const nesColorIndices = new Uint8Array(targetW * targetH);
  const rgbBuffer = new Float32Array(targetW * targetH * 3);

  const colorFreq: Record<number, number> = {};

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = (y * targetW + x) * 4;
      const [r, g, b] = applyImageAdjustments(data[idx], data[idx + 1], data[idx + 2], settings);
      const bufIdx = (y * targetW + x) * 3;
      rgbBuffer[bufIdx] = r;
      rgbBuffer[bufIdx + 1] = g;
      rgbBuffer[bufIdx + 2] = b;

      const closest = getClosestNesColor(r, g, b);
      nesColorIndices[y * targetW + x] = closest;
      colorFreq[closest] = (colorFreq[closest] || 0) + 1;
    }
  }

  // 2. Identify Universal Backdrop Color (shared color 0 in all 4 subpalettes)
  let universalBackdrop = settings.customBackdropColor !== undefined
    ? settings.customBackdropColor
    : 0x0F; // Default to solid black

  if (settings.customBackdropColor === undefined) {
    // Pick the most common color among the borders/corners
    const borderColors: Record<number, number> = {};
    for (let x = 0; x < targetW; x++) {
      const c1 = nesColorIndices[x];
      const c2 = nesColorIndices[(targetH - 1) * targetW + x];
      borderColors[c1] = (borderColors[c1] || 0) + 1;
      borderColors[c2] = (borderColors[c2] || 0) + 1;
    }
    for (let y = 0; y < targetH; y++) {
      const c1 = nesColorIndices[y * targetW];
      const c2 = nesColorIndices[y * targetW + (targetW - 1)];
      borderColors[c1] = (borderColors[c1] || 0) + 1;
      borderColors[c2] = (borderColors[c2] || 0) + 1;
    }

    let maxBorder = 0;
    for (const [colStr, count] of Object.entries(borderColors)) {
      if (count > maxBorder) {
        maxBorder = count;
        universalBackdrop = parseInt(colStr, 10);
      }
    }
  }

  // 3. Cluster colors into 4 Subpalettes (each 1 backdrop + 3 distinct colors)
  // Total of 12 distinct non-backdrop colors allocated across 4 subpalettes
  const sortedColors = Object.entries(colorFreq)
    .map(([c, count]) => ({ index: parseInt(c, 10), count }))
    .filter(item => item.index !== universalBackdrop)
    .sort((a, b) => b.count - a.count);

  const subPalettes: [SubPalette, SubPalette, SubPalette, SubPalette] = [
    { id: 0, colors: [universalBackdrop, 0x10, 0x20, 0x30] },
    { id: 1, colors: [universalBackdrop, 0x16, 0x27, 0x37] },
    { id: 2, colors: [universalBackdrop, 0x11, 0x21, 0x31] },
    { id: 3, colors: [universalBackdrop, 0x1A, 0x2A, 0x3A] },
  ];

  // Distribute the most prominent 12 colors into the 4 subpalettes
  if (sortedColors.length > 0) {
    for (let i = 0; i < 4; i++) {
      const col1 = sortedColors[i * 3]?.index ?? (i === 0 ? 0x10 : i === 1 ? 0x16 : i === 2 ? 0x11 : 0x1A);
      const col2 = sortedColors[i * 3 + 1]?.index ?? (i === 0 ? 0x20 : i === 1 ? 0x27 : i === 2 ? 0x21 : 0x2A);
      const col3 = sortedColors[i * 3 + 2]?.index ?? (i === 0 ? 0x30 : i === 1 ? 0x37 : i === 2 ? 0x31 : 0x3A);
      subPalettes[i] = {
        id: i,
        colors: [universalBackdrop, col1, col2, col3],
      };
    }
  }

  // 4. Attribute Table Assignment: 16x16 macroblock analysis
  // The screen is 16x15 blocks of 16x16 pixels
  const blocksX = 16;
  const blocksY = 15;
  const blockSubpalettes = new Uint8Array(blocksX * blocksY);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      // Find which subpalette best fits this 16x16 block
      let bestSubpal = 0;
      let minBlockError = Infinity;

      for (let p = 0; p < 4; p++) {
        const pal = subPalettes[p].colors;
        let palError = 0;

        for (let py = 0; py < 16; py++) {
          const y = by * 16 + py;
          if (y >= targetH) continue;
          for (let px = 0; px < 16; px++) {
            const x = bx * 16 + px;
            if (x >= targetW) continue;

            const bufIdx = (y * targetW + x) * 3;
            const r = rgbBuffer[bufIdx];
            const g = rgbBuffer[bufIdx + 1];
            const b = rgbBuffer[bufIdx + 2];

            // Distance to closest of the 4 colors in this palette
            let closestDist = Infinity;
            for (let c = 0; c < 4; c++) {
              const palCol = NES_MASTER_PALETTE[pal[c]];
              const dist = getPerceptualColorDistance(r, g, b, palCol.r, palCol.g, palCol.b);
              if (dist < closestDist) closestDist = dist;
            }
            palError += closestDist;
          }
        }

        if (palError < minBlockError) {
          minBlockError = palError;
          bestSubpal = p;
        }
      }

      blockSubpalettes[by * blocksX + bx] = bestSubpal;
    }
  }

  // 5. Quantize Pixels & Dithering to the assigned subpalette
  // Each pixel gets a 2-bit color index (0..3) within its 16x16 block's subpalette
  const pixelIndices2Bit = new Uint8Array(targetW * targetH);
  const previewData = ctx.createImageData(targetW, targetH);

  // Copy working RGB buffer for error diffusion dithering
  const ditherBuffer = new Float32Array(rgbBuffer);
  const ditherStrength = settings.ditherStrength / 100;

  for (let y = 0; y < targetH; y++) {
    const by = Math.floor(y / 16);
    for (let x = 0; x < targetW; x++) {
      const bx = Math.floor(x / 16);
      const subpalIdx = blockSubpalettes[by * blocksX + bx];
      const pal = subPalettes[subpalIdx].colors;

      const bufIdx = (y * targetW + x) * 3;
      let r = ditherBuffer[bufIdx];
      let g = ditherBuffer[bufIdx + 1];
      let b = ditherBuffer[bufIdx + 2];

      // Ordered dithering bias (Bayer)
      if (settings.ditherMethod === 'bayer_4x4') {
        const threshold = (BAYER_4X4[y % 4][x % 4] / 16 - 0.5) * 64 * ditherStrength;
        r += threshold;
        g += threshold;
        b += threshold;
      } else if (settings.ditherMethod === 'bayer_8x8') {
        const threshold = (BAYER_8X8[y % 8][x % 8] / 64 - 0.5) * 64 * ditherStrength;
        r += threshold;
        g += threshold;
        b += threshold;
      }

      // Find closest color within the 4 colors of the assigned subpalette
      let bestColorSubIndex = 0;
      let minColorDist = Infinity;
      for (let c = 0; c < 4; c++) {
        const palCol = NES_MASTER_PALETTE[pal[c]];
        const dist = getPerceptualColorDistance(r, g, b, palCol.r, palCol.g, palCol.b);
        if (dist < minColorDist) {
          minColorDist = dist;
          bestColorSubIndex = c;
        }
      }

      pixelIndices2Bit[y * targetW + x] = bestColorSubIndex;

      // Color chosen
      const chosenNesIndex = pal[bestColorSubIndex];
      const chosenNesCol = NES_MASTER_PALETTE[chosenNesIndex];

      // Write to preview ImageData
      const outIdx = (y * targetW + x) * 4;
      previewData.data[outIdx] = chosenNesCol.r;
      previewData.data[outIdx + 1] = chosenNesCol.g;
      previewData.data[outIdx + 2] = chosenNesCol.b;
      previewData.data[outIdx + 3] = 255;

      // Error diffusion dithering
      const errR = (r - chosenNesCol.r) * ditherStrength;
      const errG = (g - chosenNesCol.g) * ditherStrength;
      const errB = (b - chosenNesCol.b) * ditherStrength;

      if (settings.ditherMethod === 'floyd_steinberg') {
        diffuseError(ditherBuffer, targetW, targetH, x + 1, y, errR * 7 / 16, errG * 7 / 16, errB * 7 / 16);
        diffuseError(ditherBuffer, targetW, targetH, x - 1, y + 1, errR * 3 / 16, errG * 3 / 16, errB * 3 / 16);
        diffuseError(ditherBuffer, targetW, targetH, x, y + 1, errR * 5 / 16, errG * 5 / 16, errB * 5 / 16);
        diffuseError(ditherBuffer, targetW, targetH, x + 1, y + 1, errR * 1 / 16, errG * 1 / 16, errB * 1 / 16);
      } else if (settings.ditherMethod === 'atkinson') {
        const errEighthR = errR / 8;
        const errEighthG = errG / 8;
        const errEighthB = errB / 8;
        diffuseError(ditherBuffer, targetW, targetH, x + 1, y, errEighthR, errEighthG, errEighthB);
        diffuseError(ditherBuffer, targetW, targetH, x + 2, y, errEighthR, errEighthG, errEighthB);
        diffuseError(ditherBuffer, targetW, targetH, x - 1, y + 1, errEighthR, errEighthG, errEighthB);
        diffuseError(ditherBuffer, targetW, targetH, x, y + 1, errEighthR, errEighthG, errEighthB);
        diffuseError(ditherBuffer, targetW, targetH, x + 1, y + 1, errEighthR, errEighthG, errEighthB);
        diffuseError(ditherBuffer, targetW, targetH, x, y + 2, errEighthR, errEighthG, errEighthB);
      }
    }
  }

  // 6. Split into 8x8 Tiles, Deduplicate, and Build CHR ROM Pattern Table
  // Screen is 32 tiles wide x 30 tiles high = 960 total tiles
  const totalTilesX = 32;
  const totalTilesY = 30;
  const tileHashes: Map<string, number> = new Map();
  const rawUniqueTiles: Uint8Array[] = [];
  const nametable = new Uint8Array(totalTilesX * totalTilesY);

  const maxAllowedTiles = Math.min(512, settings.maxTiles || 256);

  for (let ty = 0; ty < totalTilesY; ty++) {
    for (let tx = 0; tx < totalTilesX; tx++) {
      // Extract 8x8 2-bit pixels for this tile
      const tilePixels = new Uint8Array(64);
      for (let py = 0; py < 8; py++) {
        const y = ty * 8 + py;
        for (let px = 0; px < 8; px++) {
          const x = tx * 8 + px;
          tilePixels[py * 8 + px] = pixelIndices2Bit[y * targetW + x];
        }
      }

      // Encode into NES 2bpp planar format (16 bytes)
      const encodedTile = encodeTile2bpp(tilePixels);
      const hash = encodedTile.toString();

      let tileId: number;
      if (tileHashes.has(hash)) {
        tileId = tileHashes.get(hash)!;
      } else {
        if (rawUniqueTiles.length < maxAllowedTiles) {
          tileId = rawUniqueTiles.length;
          rawUniqueTiles.push(encodedTile);
          tileHashes.set(hash, tileId);
        } else {
          // Find closest existing tile to stay within pattern table limit
          tileId = findClosestTileId(encodedTile, rawUniqueTiles);
        }
      }

      nametable[ty * totalTilesX + tx] = tileId % 256; // Standard 8-bit nametable index
    }
  }

  // 7. Pack into full 8KB CHR-ROM (512 tiles * 16 bytes = 8192 bytes)
  const patternTable = new Uint8Array(8192);
  for (let i = 0; i < rawUniqueTiles.length; i++) {
    patternTable.set(rawUniqueTiles[i], i * 16);
  }

  // 8. Generate Attribute Table (64 bytes)
  // Covers 32x30 tiles grouped into 16x15 16x16 attribute blocks,
  // packed 4 blocks (32x32 pixels) per byte.
  const attributeTable = new Uint8Array(64);
  for (let by = 0; by < blocksY; by += 2) {
    for (let bx = 0; bx < blocksX; bx += 2) {
      // 4 quadrants in a 32x32 area:
      // Top-Left (bx, by)
      const tl = blockSubpalettes[by * blocksX + bx];
      // Top-Right (bx + 1, by)
      const tr = (bx + 1 < blocksX) ? blockSubpalettes[by * blocksX + (bx + 1)] : tl;
      // Bottom-Left (bx, by + 1)
      const bl = (by + 1 < blocksY) ? blockSubpalettes[(by + 1) * blocksX + bx] : tl;
      // Bottom-Right (bx + 1, by + 1)
      const br = (bx + 1 < blocksX && by + 1 < blocksY) ? blockSubpalettes[(by + 1) * blocksX + (bx + 1)] : tl;

      const attrByte = (tl & 0x03) | ((tr & 0x03) << 2) | ((bl & 0x03) << 4) | ((br & 0x03) << 6);
      const attrIdx = (Math.floor(by / 2) * 8) + Math.floor(bx / 2);
      if (attrIdx < 64) {
        attributeTable[attrIdx] = attrByte;
      }
    }
  }

  return {
    width: targetW,
    height: targetH,
    tilesX: totalTilesX,
    tilesY: totalTilesY,
    universalBackdrop,
    subPalettes,
    patternTable,
    uniqueTilesCount: rawUniqueTiles.length,
    nametable,
    attributeTable,
    previewImageData: previewData,
  };
}

// Encode 64 2-bit pixels (8x8) into 16 bytes of NES 2bpp planar format
export function encodeTile2bpp(pixels: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(16);
  for (let row = 0; row < 8; row++) {
    let plane0 = 0;
    let plane1 = 0;
    for (let col = 0; col < 8; col++) {
      const color2bit = pixels[row * 8 + col] & 0x03;
      const bit0 = color2bit & 1;
      const bit1 = (color2bit >> 1) & 1;

      // Bit 7 is leftmost pixel, Bit 0 is rightmost pixel
      const shift = 7 - col;
      plane0 |= (bit0 << shift);
      plane1 |= (bit1 << shift);
    }
    bytes[row] = plane0;
    bytes[row + 8] = plane1;
  }
  return bytes;
}

// Decode 16 bytes of NES 2bpp planar format into 64 2-bit pixels
export function decodeTile2bpp(tileBytes: Uint8Array): Uint8Array {
  const pixels = new Uint8Array(64);
  for (let row = 0; row < 8; row++) {
    const plane0 = tileBytes[row];
    const plane1 = tileBytes[row + 8];
    for (let col = 0; col < 8; col++) {
      const shift = 7 - col;
      const bit0 = (plane0 >> shift) & 1;
      const bit1 = (plane1 >> shift) & 1;
      pixels[row * 8 + col] = bit0 | (bit1 << 1);
    }
  }
  return pixels;
}

function diffuseError(
  buffer: Float32Array,
  w: number,
  h: number,
  x: number,
  y: number,
  er: number,
  eg: number,
  eb: number
) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 3;
  buffer[idx] += er;
  buffer[idx + 1] += eg;
  buffer[idx + 2] += eb;
}

function findClosestTileId(target: Uint8Array, list: Uint8Array[]): number {
  let minDiff = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < list.length; i++) {
    let diff = 0;
    const cand = list[i];
    for (let b = 0; b < 16; b++) {
      diff += Math.abs(target[b] - cand[b]);
    }
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i;
      if (diff === 0) break;
    }
  }
  return bestIdx;
}

function drawImageWithCrop(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  cropMode: 'fit_border' | 'stretch' | 'crop_center'
) {
  if (cropMode === 'stretch' || srcW === 0 || srcH === 0) {
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return;
  }

  const srcAspect = srcW / srcH;
  const targetAspect = targetW / targetH;

  if (cropMode === 'fit_border') {
    // Preserve aspect ratio and pillarbox / letterbox with black bars
    let destW = targetW;
    let destH = targetH;
    let destX = 0;
    let destY = 0;

    if (srcAspect > targetAspect) {
      destH = targetW / srcAspect;
      destY = (targetH - destH) / 2;
    } else {
      destW = targetH * srcAspect;
      destX = (targetW - destW) / 2;
    }

    ctx.drawImage(img, 0, 0, srcW, srcH, destX, destY, destW, destH);
  } else if (cropMode === 'crop_center') {
    // Center crop fill
    let sx = 0;
    let sy = 0;
    let sWidth = srcW;
    let sHeight = srcH;

    if (srcAspect > targetAspect) {
      sWidth = srcH * targetAspect;
      sx = (srcW - sWidth) / 2;
    } else {
      sHeight = srcW / targetAspect;
      sy = (srcH - sHeight) / 2;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
  }
}
