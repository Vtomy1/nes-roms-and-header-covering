export interface SamplePreset {
  id: string;
  name: string;
  category: string;
  generate: () => ImageData;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'title_screen',
    name: 'Retro NES Title Screen',
    category: 'Game Graphics',
    generate: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 240;
      const ctx = canvas.getContext('2d')!;

      // Deep navy night sky
      ctx.fillStyle = '#002A88';
      ctx.fillRect(0, 0, 256, 240);

      // Starfield
      ctx.fillStyle = '#FFFFFF';
      const stars = [
        [20, 25], [45, 12], [80, 40], [130, 20], [175, 35], [210, 15], [240, 50],
        [15, 70], [60, 85], [110, 65], [195, 80], [230, 95], [35, 120], [150, 110]
      ];
      for (const [x, y] of stars) {
        ctx.fillRect(x, y, 2, 2);
      }

      // Distant mountains
      ctx.fillStyle = '#1412A7';
      ctx.beginPath();
      ctx.moveTo(0, 160);
      ctx.lineTo(40, 120);
      ctx.lineTo(90, 150);
      ctx.lineTo(150, 110);
      ctx.lineTo(210, 145);
      ctx.lineTo(256, 125);
      ctx.lineTo(256, 180);
      ctx.lineTo(0, 180);
      ctx.fill();

      // Ground brickwork
      ctx.fillStyle = '#6C0600'; // Crimson brick
      ctx.fillRect(0, 180, 256, 60);

      ctx.fillStyle = '#B53120'; // Lighter brick
      for (let y = 180; y < 240; y += 8) {
        const offset = ((y / 8) % 2) * 8;
        for (let x = offset; x < 256; x += 16) {
          ctx.fillRect(x, y, 14, 6);
        }
      }

      // Title Banner Box
      ctx.fillStyle = '#000000';
      ctx.fillRect(24, 36, 208, 64);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(26, 38, 204, 60);

      // Main Logo Text
      ctx.fillStyle = '#ECA02F'; // Gold yellow
      ctx.font = 'bold 22px "Press Start 2P", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEO QUEST', 128, 74);

      // Subtitle
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '9px "Press Start 2P", monospace, sans-serif';
      ctx.fillText('PRESS START BUTTON', 128, 140);
      ctx.fillText('© 1986 PIXEL WORKS LTD.', 128, 162);

      // Castle Tower
      ctx.fillStyle = '#561D00';
      ctx.fillRect(190, 130, 48, 50);
      ctx.fillStyle = '#ECA02F';
      ctx.fillRect(206, 146, 16, 24);

      return ctx.getImageData(0, 0, 256, 240);
    },
  },
  {
    id: 'cyberpunk_city',
    name: 'Cyberpunk 8-Bit Skyline',
    category: 'Pixel Art',
    generate: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 240;
      const ctx = canvas.getContext('2d')!;

      // Purple gradient night
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 240);

      // Big retro neon moon
      ctx.fillStyle = '#FE6ECC';
      ctx.beginPath();
      ctx.arc(128, 80, 46, 0, Math.PI * 2);
      ctx.fill();

      // Horizontal scan stripes across moon
      ctx.fillStyle = '#000000';
      for (let y = 60; y < 126; y += 4) {
        ctx.fillRect(80, y, 96, 2);
      }

      // Back skyline (dark indigo)
      ctx.fillStyle = '#3B00A4';
      ctx.fillRect(16, 100, 36, 140);
      ctx.fillRect(68, 70, 40, 170);
      ctx.fillRect(124, 110, 48, 130);
      ctx.fillRect(188, 85, 52, 155);

      // Front skyline (dark violet / black)
      ctx.fillStyle = '#1412A7';
      ctx.fillRect(0, 140, 30, 100);
      ctx.fillRect(40, 120, 36, 120);
      ctx.fillRect(90, 135, 46, 105);
      ctx.fillRect(150, 125, 42, 115);
      ctx.fillRect(205, 130, 51, 110);

      // Glowing Cyan Windows
      ctx.fillStyle = '#4CD6E3';
      const windowRows = [
        [46, 126], [58, 126], [46, 138], [58, 138], [46, 150], [58, 150],
        [98, 142], [114, 142], [98, 154], [114, 154], [98, 166], [114, 166],
        [158, 132], [174, 132], [158, 144], [174, 144],
        [214, 138], [230, 138], [214, 150], [230, 150],
      ];
      for (const [x, y] of windowRows) {
        ctx.fillRect(x, y, 6, 6);
      }

      // Neon Grid road at bottom
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 195, 256, 45);

      ctx.strokeStyle = '#FE6ECC';
      ctx.lineWidth = 1;
      for (let y = 195; y < 240; y += 7) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }
      for (let x = 0; x <= 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 195);
        ctx.lineTo(128 + (x - 128) * 1.8, 240);
        ctx.stroke();
      }

      return ctx.getImageData(0, 0, 256, 240);
    },
  },
  {
    id: 'hero_dungeon',
    name: 'Dungeon Crawler RPG',
    category: 'Game Graphics',
    generate: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 240;
      const ctx = canvas.getContext('2d')!;

      // Dark stone background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 240);

      // Stone Wall border
      ctx.fillStyle = '#666666';
      for (let x = 0; x < 256; x += 16) {
        ctx.fillRect(x, 0, 14, 14);
        ctx.fillRect(x, 224, 14, 14);
      }
      for (let y = 0; y < 240; y += 16) {
        ctx.fillRect(0, y, 14, 14);
        ctx.fillRect(240, y, 14, 14);
      }

      // Floor tiles
      ctx.fillStyle = '#333500';
      for (let y = 32; y < 210; y += 16) {
        for (let x = 32; x < 230; x += 16) {
          ctx.fillRect(x, y, 14, 14);
        }
      }

      // Torch on wall
      ctx.fillStyle = '#561D00';
      ctx.fillRect(60, 4, 8, 20);
      ctx.fillRect(188, 4, 8, 20);
      ctx.fillStyle = '#FE8176';
      ctx.fillRect(62, 0, 4, 8);
      ctx.fillRect(190, 0, 4, 8);

      // Hero sprite in center
      // Armor (White / Light Gray)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(122, 100, 12, 18);
      // Helmet
      ctx.fillStyle = '#ADADAD';
      ctx.fillRect(120, 88, 16, 12);
      // Sword
      ctx.fillStyle = '#4CD6E3';
      ctx.fillRect(138, 92, 4, 22);
      ctx.fillStyle = '#ECA02F';
      ctx.fillRect(136, 110, 8, 4);
      // Shield
      ctx.fillStyle = '#B53120';
      ctx.fillRect(112, 98, 8, 16);

      // Treasure Chest
      ctx.fillStyle = '#994E00';
      ctx.fillRect(60, 140, 24, 16);
      ctx.fillStyle = '#ECA02F';
      ctx.fillRect(70, 146, 4, 6);

      // Slime monster
      ctx.fillStyle = '#58EF54';
      ctx.beginPath();
      ctx.arc(190, 150, 12, 0, Math.PI, true);
      ctx.fill();
      ctx.fillRect(178, 150, 24, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(184, 144, 4, 4);
      ctx.fillRect(194, 144, 4, 4);

      // UI HUD at top
      ctx.fillStyle = '#000000';
      ctx.fillRect(24, 20, 208, 14);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('HP: 16/16   LV: 01   GOLD: 250', 30, 30);

      return ctx.getImageData(0, 0, 256, 240);
    },
  },
  {
    id: 'test_card',
    name: 'PPU Calibration & Color Bars',
    category: 'Hardware Test',
    generate: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 240;
      const ctx = canvas.getContext('2d')!;

      // Top title
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NES 2C02 PPU CALIBRATION', 128, 24);

      // 8 color test bars
      const barColors = [
        '#FFFFFF', '#ECA02F', '#4CD6E3', '#58EF54',
        '#FE6ECC', '#B53120', '#155FD9', '#000000',
      ];
      const barW = 256 / barColors.length;
      for (let i = 0; i < barColors.length; i++) {
        ctx.fillStyle = barColors[i];
        ctx.fillRect(i * barW, 40, barW, 120);
      }

      // Middle alignment cross
      ctx.strokeStyle = '#ADADAD';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(128, 0);
      ctx.lineTo(128, 240);
      ctx.moveTo(0, 120);
      ctx.lineTo(256, 120);
      ctx.stroke();

      // Bottom sub-palette test boxes
      const subCols = [
        '#666666', '#002A88', '#6C0600', '#0B4800',
        '#ADADAD', '#155FD9', '#B53120', '#0C9300',
      ];
      for (let i = 0; i < subCols.length; i++) {
        ctx.fillStyle = subCols[i];
        ctx.fillRect(i * 32, 160, 32, 40);
      }

      // Safe area border
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(8, 8, 240, 224);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 200, 256, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('256x240 NTSC  ·  32x30 TILES', 128, 224);

      return ctx.getImageData(0, 0, 256, 240);
    },
  },
];
