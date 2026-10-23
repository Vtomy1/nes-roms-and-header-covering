import { SubPalette } from '../types/nes';

export interface HistoricalPalettePreset {
  id: string;
  name: string;
  game: string;
  year: number;
  category: 'Platformer' | 'Action / Sci-Fi' | 'Adventure' | 'Arcade' | 'RPG';
  description: string;
  backdrop: number;
  subPalettes: [
    { label: string; colors: [number, number, number, number] },
    { label: string; colors: [number, number, number, number] },
    { label: string; colors: [number, number, number, number] },
    { label: string; colors: [number, number, number, number] }
  ];
}

export const HISTORICAL_PALETTES: HistoricalPalettePreset[] = [
  {
    id: 'smb-overworld',
    name: 'Super Mario Bros. (Overworld)',
    game: 'Super Mario Bros.',
    year: 1985,
    category: 'Platformer',
    description: 'Iconic World 1-1 palette with cornflower sky blue, terracotta brick earth, lush green pipes, and golden question blocks.',
    backdrop: 0x22,
    subPalettes: [
      { label: 'Bricks & Earth', colors: [0x22, 0x16, 0x27, 0x0f] },
      { label: 'Warp Pipes & Bushes', colors: [0x22, 0x1a, 0x2a, 0x0f] },
      { label: 'Hills & Clouds', colors: [0x22, 0x12, 0x30, 0x0f] },
      { label: 'Question Blocks & Coins', colors: [0x22, 0x17, 0x28, 0x0f] },
    ],
  },
  {
    id: 'smb-underground',
    name: 'Super Mario Bros. (Underground)',
    game: 'Super Mario Bros.',
    year: 1985,
    category: 'Platformer',
    description: 'World 1-2 subterranean cavern palette featuring deep cobalt masonry, jade warp zone pipes, and shimmering coins.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Cobalt Cavern Masonry', colors: [0x0f, 0x11, 0x22, 0x30] },
      { label: 'Warp Zone Jade Pipes', colors: [0x0f, 0x1a, 0x2a, 0x30] },
      { label: 'Underground Gold Coins', colors: [0x0f, 0x27, 0x28, 0x38] },
      { label: 'Subterranean Shadow Rock', colors: [0x0f, 0x00, 0x10, 0x20] },
    ],
  },
  {
    id: 'zelda-overworld',
    name: 'The Legend of Zelda (Hyrule Overworld)',
    game: 'The Legend of Zelda',
    year: 1986,
    category: 'Adventure',
    description: 'Classic 128-screen Hyrule map colors with verdant forests, Death Mountain rock crags, coastal waterways, and secret tombs.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Hyrule Forests & Shrubs', colors: [0x0f, 0x1a, 0x2a, 0x3a] },
      { label: 'Death Mountain Rocks', colors: [0x0f, 0x17, 0x27, 0x37] },
      { label: 'Lakes & Waterfalls', colors: [0x0f, 0x12, 0x22, 0x30] },
      { label: 'Graves & Entrances', colors: [0x0f, 0x00, 0x10, 0x30] },
    ],
  },
  {
    id: 'zelda-dungeon',
    name: 'The Legend of Zelda (Eagle Dungeon)',
    game: 'The Legend of Zelda',
    year: 1986,
    category: 'Adventure',
    description: 'Level-1 Eagle dungeon labyrinth with cyan brick corridors, crimson locked doors, monster statues, and stone flagstones.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Cyan Labyrinth Walls', colors: [0x0f, 0x11, 0x21, 0x30] },
      { label: 'Crimson Boss Chamber', colors: [0x0f, 0x05, 0x15, 0x27] },
      { label: 'Goriya Statues & Traps', colors: [0x0f, 0x1a, 0x29, 0x30] },
      { label: 'Stone Flagstones', colors: [0x0f, 0x00, 0x10, 0x30] },
    ],
  },
  {
    id: 'metroid-brinstar',
    name: 'Metroid (Brinstar Caverns)',
    game: 'Metroid',
    year: 1986,
    category: 'Action / Sci-Fi',
    description: 'Atmospheric subterranean Zebes aesthetic with radioactive purple flora, toxic green acid, magma conduits, and Chozo architecture.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Alien Purple Caverns', colors: [0x0f, 0x14, 0x24, 0x30] },
      { label: 'Toxic Bio-Acid Vines', colors: [0x0f, 0x1a, 0x29, 0x39] },
      { label: 'Magma Heat Vents', colors: [0x0f, 0x16, 0x27, 0x37] },
      { label: 'Chozo Metal Chambers', colors: [0x0f, 0x11, 0x22, 0x30] },
    ],
  },
  {
    id: 'megaman2-wily',
    name: 'Mega Man 2 (Dr. Wily Castle)',
    game: 'Mega Man 2',
    year: 1988,
    category: 'Action / Sci-Fi',
    description: 'Wily Fortress Stage 1 featuring industrial concrete battlements, electric blue capacitors, hazard warning stripes, and cyber-panels.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Skull Fortress Concrete', colors: [0x0f, 0x00, 0x10, 0x30] },
      { label: 'Electric Blue Conduits', colors: [0x0f, 0x11, 0x22, 0x30] },
      { label: 'Hazard Amber & Lasers', colors: [0x0f, 0x16, 0x27, 0x38] },
      { label: 'Generator Tech Panels', colors: [0x0f, 0x1a, 0x2a, 0x3a] },
    ],
  },
  {
    id: 'castlevania-entrance',
    name: 'Castlevania (Entrance Hall)',
    game: 'Castlevania',
    year: 1986,
    category: 'Action / Sci-Fi',
    description: 'Dracula\'s castle entrance with moonlit gothic stone masonry, blood-red velvet tapestries, aged iron gates, and mossy gargoyles.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Moonlit Stone Masonry', colors: [0x0f, 0x00, 0x10, 0x30] },
      { label: 'Crimson Tapestries & Fire', colors: [0x0f, 0x06, 0x16, 0x27] },
      { label: 'Aged Portcullis Timber', colors: [0x0f, 0x07, 0x17, 0x28] },
      { label: 'Gargoyle Statues & Moss', colors: [0x0f, 0x09, 0x1a, 0x29] },
    ],
  },
  {
    id: 'smb3-grass',
    name: 'Super Mario Bros. 3 (Grass Land)',
    game: 'Super Mario Bros. 3',
    year: 1988,
    category: 'Platformer',
    description: 'World 1 stage design with vibrant sky backdrop, wooden bolt platforms, white polka-dot hills, and goal card roulette.',
    backdrop: 0x22,
    subPalettes: [
      { label: 'Foliage & Pipe Greens', colors: [0x22, 0x1a, 0x2a, 0x0f] },
      { label: 'Wood Platforms & Screws', colors: [0x22, 0x17, 0x27, 0x30] },
      { label: 'Polka-Dot Hills & Clouds', colors: [0x22, 0x00, 0x10, 0x30] },
      { label: 'Goal Roulette & Cards', colors: [0x22, 0x15, 0x28, 0x0f] },
    ],
  },
  {
    id: 'kirby-valley',
    name: "Kirby's Adventure (Vegetable Valley)",
    game: "Kirby's Adventure",
    year: 1993,
    category: 'Platformer',
    description: 'Whimsical pastel Dream Land theme with sunny skies, cheerful candy trees, star blocks, and soft periwinkle waters.',
    backdrop: 0x21,
    subPalettes: [
      { label: 'Pastel Meadow & Trees', colors: [0x21, 0x1a, 0x2a, 0x3a] },
      { label: 'Star Blocks & Timber', colors: [0x21, 0x27, 0x38, 0x30] },
      { label: 'Cotton Candy Clouds', colors: [0x21, 0x25, 0x35, 0x30] },
      { label: 'Dream Land Brooks', colors: [0x21, 0x12, 0x22, 0x30] },
    ],
  },
  {
    id: 'contra-jungle',
    name: 'Contra (Galuga Jungle)',
    game: 'Contra',
    year: 1988,
    category: 'Action / Sci-Fi',
    description: 'Infiltration of Galuga island with dense palm fronds, muddy earth revetments, tropical waterfalls, and alien compound bunker steel.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Dense Tropical Palms', colors: [0x0f, 0x09, 0x19, 0x29] },
      { label: 'Muddy Earth Banks', colors: [0x0f, 0x07, 0x17, 0x27] },
      { label: 'Island Surf & Falls', colors: [0x0f, 0x12, 0x22, 0x30] },
      { label: 'Red Falcon Bunker Metal', colors: [0x0f, 0x00, 0x10, 0x30] },
    ],
  },
  {
    id: 'duck-hunt-marsh',
    name: 'Duck Hunt (Meadow Marsh)',
    game: 'Duck Hunt',
    year: 1984,
    category: 'Arcade',
    description: 'High noon shooting range with bright blue skies, dense reed beds, gnarled tree trunks, and target ducks.',
    backdrop: 0x22,
    subPalettes: [
      { label: 'Marsh Grass & Reeds', colors: [0x22, 0x1a, 0x28, 0x0f] },
      { label: 'Soil Loam & Bark', colors: [0x22, 0x07, 0x17, 0x27] },
      { label: 'Mallard Feathers & Collars', colors: [0x22, 0x16, 0x2a, 0x30] },
      { label: 'Distant Meadow Horizon', colors: [0x22, 0x09, 0x19, 0x29] },
    ],
  },
  {
    id: 'tetris-classic',
    name: 'Tetris (Official NES Types)',
    game: 'Tetris',
    year: 1989,
    category: 'Arcade',
    description: 'Authentic Russian folk arcade color scheme mapping signature tetromino level palettes from Level 0 to Level 9.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Level 00: Deep Cobalt', colors: [0x0f, 0x12, 0x22, 0x30] },
      { label: 'Level 01: Forest Emerald', colors: [0x0f, 0x1a, 0x2a, 0x30] },
      { label: 'Level 04: Molten Amber', colors: [0x0f, 0x16, 0x27, 0x30] },
      { label: 'Level 09: Neon Magenta', colors: [0x0f, 0x14, 0x24, 0x30] },
    ],
  },
  {
    id: 'ff1-world',
    name: 'Final Fantasy I (Coneria Overworld)',
    game: 'Final Fantasy',
    year: 1987,
    category: 'RPG',
    description: 'World of Chaos exploration palette featuring lush Coneria grassland, desert barrens, deep ocean trenches, and royal castles.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Coneria Plains & Forests', colors: [0x0f, 0x1a, 0x2a, 0x3a] },
      { label: 'Desert Dunes & Peaks', colors: [0x0f, 0x17, 0x27, 0x38] },
      { label: 'Ocean Trenches & Bays', colors: [0x0f, 0x02, 0x12, 0x22] },
      { label: 'Castles & Settlements', colors: [0x0f, 0x00, 0x10, 0x30] },
    ],
  },
  {
    id: 'earthbound-zero',
    name: 'EarthBound Beginnings (Podunk)',
    game: 'EarthBound Beginnings',
    year: 1989,
    category: 'RPG',
    description: '1980s Americana suburban town with green lawns, red brick houses, asphalt sidewalks, and surreal Magicant dream pinks.',
    backdrop: 0x0f,
    subPalettes: [
      { label: 'Podunk Lawns & Parks', colors: [0x0f, 0x19, 0x2a, 0x3a] },
      { label: 'Suburban Homes & Brick', colors: [0x0f, 0x16, 0x27, 0x36] },
      { label: 'Asphalt & Sidewalks', colors: [0x0f, 0x00, 0x10, 0x30] },
      { label: 'Magicant Dreamscape', colors: [0x0f, 0x25, 0x34, 0x30] },
    ],
  },
];

/**
 * Converts a preset into standard NESGraphicsData subpalettes.
 */
export function convertPresetToSubpalettes(
  preset: HistoricalPalettePreset
): [SubPalette, SubPalette, SubPalette, SubPalette] {
  return [
    { id: 0, colors: [...preset.subPalettes[0].colors] },
    { id: 1, colors: [...preset.subPalettes[1].colors] },
    { id: 2, colors: [...preset.subPalettes[2].colors] },
    { id: 3, colors: [...preset.subPalettes[3].colors] },
  ];
}
