import { NESColor } from '../types/nes';

// Authentic 2C02 NTSC NES master color palette (0x00 to 0x3F)
export const NES_MASTER_PALETTE: NESColor[] = [
  { index: 0x00, hex: '#666666', r: 102, g: 102, b: 102, name: 'Medium Gray' },
  { index: 0x01, hex: '#002A88', r: 0,   g: 42,  b: 136, name: 'Deep Navy Blue' },
  { index: 0x02, hex: '#1412A7', r: 20,  g: 18,  b: 167, name: 'Dark Indigo' },
  { index: 0x03, hex: '#3B00A4', r: 59,  g: 0,   b: 164, name: 'Royal Purple' },
  { index: 0x04, hex: '#5C007E', r: 92,  g: 0,   b: 126, name: 'Deep Violet' },
  { index: 0x05, hex: '#6E0040', r: 110, g: 0,   b: 64,  name: 'Plum Red' },
  { index: 0x06, hex: '#6C0600', r: 108, g: 6,   b: 0,   name: 'Crimson' },
  { index: 0x07, hex: '#561D00', r: 86,  g: 29,  b: 0,   name: 'Dark Umber' },
  { index: 0x08, hex: '#333500', r: 51,  g: 53,  b: 0,   name: 'Olive Drab' },
  { index: 0x09, hex: '#0B4800', r: 11,  g: 72,  b: 0,   name: 'Forest Green' },
  { index: 0x0A, hex: '#005200', r: 0,   g: 82,  b: 0,   name: 'Deep Green' },
  { index: 0x0B, hex: '#004F08', r: 0,   g: 79,  b: 8,   name: 'Pine Green' },
  { index: 0x0C, hex: '#00404D', r: 0,   g: 64,  b: 77,  name: 'Dark Teal' },
  { index: 0x0D, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Solid Black' },
  { index: 0x0E, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black (0E)' },
  { index: 0x0F, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Backdrop Black' },

  { index: 0x10, hex: '#ADADAD', r: 173, g: 173, b: 173, name: 'Light Gray' },
  { index: 0x11, hex: '#155FD9', r: 21,  g: 95,  b: 217, name: 'Sky Cobalt' },
  { index: 0x12, hex: '#4240FF', r: 66,  g: 64,  b: 255, name: 'Bright Iris' },
  { index: 0x13, hex: '#7527FE', r: 117, g: 39,  b: 254, name: 'Electric Purple' },
  { index: 0x14, hex: '#A01ACC', r: 160, g: 26,  b: 204, name: 'Magenta' },
  { index: 0x15, hex: '#B71E7B', r: 183, g: 30,  b: 123, name: 'Rose Red' },
  { index: 0x16, hex: '#B53120', r: 181, g: 49,  b: 32,  name: 'Brick Red' },
  { index: 0x17, hex: '#994E00', r: 153, g: 78,  b: 0,   name: 'Rust Orange' },
  { index: 0x18, hex: '#6B6D00', r: 107, g: 109, b: 0,   name: 'Khaki Olive' },
  { index: 0x19, hex: '#388700', r: 56,  g: 135, b: 0,   name: 'Grass Green' },
  { index: 0x1A, hex: '#0C9300', r: 12,  g: 147, b: 0,   name: 'Vibrant Green' },
  { index: 0x1B, hex: '#008F32', r: 0,   g: 143, b: 50,  name: 'Mint Emerald' },
  { index: 0x1C, hex: '#007C8D', r: 0,   g: 124, b: 141, name: 'Ocean Cyan' },
  { index: 0x1D, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black (1D)' },
  { index: 0x1E, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black (1E)' },
  { index: 0x1F, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black (1F)' },

  { index: 0x20, hex: '#FFFFFF', r: 255, g: 255, b: 255, name: 'Pure White' },
  { index: 0x21, hex: '#64B0FF', r: 100, g: 176, b: 255, name: 'Cornflower Blue' },
  { index: 0x22, hex: '#9290FF', r: 146, g: 144, b: 255, name: 'Lavender Blue' },
  { index: 0x23, hex: '#C676FF', r: 198, g: 118, b: 255, name: 'Lilac Pink' },
  { index: 0x24, hex: '#F36AFF', r: 243, g: 106, b: 255, name: 'Electric Pink' },
  { index: 0x25, hex: '#FE6ECC', r: 254, g: 110, b: 204, name: 'Carnation' },
  { index: 0x26, hex: '#FE8176', r: 254, g: 129, b: 118, name: 'Salmon Coral' },
  { index: 0x27, hex: '#ECA02F', r: 236, g: 160, b: 47,  name: 'Golden Yellow' },
  { index: 0x28, hex: '#BCC700', r: 188, g: 199, b: 0,   name: 'Lime Chartreuse' },
  { index: 0x29, hex: '#85E300', r: 133, g: 227, b: 0,   name: 'Spring Lime' },
  { index: 0x2A, hex: '#58EF54', r: 88,  g: 239, b: 84,  name: 'Bright Green' },
  { index: 0x2B, hex: '#44EB9E', r: 68,  g: 235, b: 158, name: 'Aquamarine' },
  { index: 0x2C, hex: '#4CD6E3', r: 76,  g: 214, b: 227, name: 'Baby Cyan' },
  { index: 0x2D, hex: '#4E4E4E', r: 78,  g: 78,  b: 78,  name: 'Dark Gray' },
  { index: 0x2E, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black (2E)' },
  { index: 0x2F, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black (2F)' },

  { index: 0x30, hex: '#FFFFFF', r: 255, g: 255, b: 255, name: 'White (30)' },
  { index: 0x31, hex: '#C0E1FF', r: 192, g: 225, b: 255, name: 'Pale Ice Blue' },
  { index: 0x32, hex: '#D3D2FF', r: 211, g: 210, b: 255, name: 'Pale Periwinkle' },
  { index: 0x33, hex: '#E8C8FF', r: 232, g: 200, b: 255, name: 'Pale Violet' },
  { index: 0x34, hex: '#FBC2FF', r: 251, g: 194, b: 255, name: 'Pale Orchid' },
  { index: 0x35, hex: '#FEC4EA', r: 254, g: 196, b: 234, name: 'Pale Rose' },
  { index: 0x36, hex: '#FECCC5', r: 254, g: 204, b: 197, name: 'Peach Cream' },
  { index: 0x37, hex: '#F7D8A5', r: 247, g: 216, b: 165, name: 'Warm Cream' },
  { index: 0x38, hex: '#E4E594', r: 228, g: 229, b: 148, name: 'Pale Lemon' },
  { index: 0x39, hex: '#CEF094', r: 206, g: 240, b: 148, name: 'Pale Mint' },
  { index: 0x3A, hex: '#BCF6B7', r: 188, g: 246, b: 183, name: 'Pastel Green' },
  { index: 0x3B, hex: '#B3F5D4', r: 179, g: 245, b: 212, name: 'Pastel Aqua' },
  { index: 0x3C, hex: '#B7ECF0', r: 183, g: 236, b: 240, name: 'Pale Sky' },
  { index: 0x3D, hex: '#B4B4B4', r: 180, g: 180, b: 180, name: 'Warm Gray' },
  { index: 0x3E, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black (3E)' },
  { index: 0x3F, hex: '#000000', r: 0,   g: 0,   b: 0,   name: 'Black (3F)' },
];

// Weighted color distance accounting for human perception
export function getPerceptualColorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(
    (((512 + rmean) * dr * dr) >> 8) +
    4 * dg * dg +
    (((767 - rmean) * db * db) >> 8)
  );
}

// Find closest NES color index from 64-color master palette
export function getClosestNesColor(r: number, g: number, b: number): number {
  let minDistance = Infinity;
  let bestIndex = 0x0F;

  // We filter out redundant black duplicates to normalize to 0x0F
  for (let i = 0; i < 64; i++) {
    // Treat other black mirrors as 0x0F
    if ([0x0E, 0x1D, 0x1E, 0x1F, 0x2E, 0x2F, 0x3E, 0x3F].includes(i)) continue;

    const col = NES_MASTER_PALETTE[i];
    const dist = getPerceptualColorDistance(r, g, b, col.r, col.g, col.b);
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function getNesColorByHex(index: number): string {
  const clamped = Math.max(0, Math.min(63, index));
  return NES_MASTER_PALETTE[clamped]?.hex || '#000000';
}
