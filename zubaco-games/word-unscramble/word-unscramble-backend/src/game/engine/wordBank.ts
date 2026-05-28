import { mulberry32, seededShuffle } from './random';

export interface WordChallenge {
  id: number;
  word: string;
  scrambled: string[];
}

const WORD_BANK: string[] = [
  'FIRE', 'WAVE', 'JUMP', 'BOLD', 'CALM', 'DARK', 'ECHO', 'FAME',
  'GLOW', 'HAZE', 'IRON', 'JAZZ', 'KEEN', 'LAMP', 'MIST', 'NEON',
  'OPEN', 'PEAK', 'QUIZ', 'RAIN', 'SNOW', 'TIDE', 'UNIT', 'VAST',
  'WIND', 'YARN', 'ZONE', 'BEAM', 'CLUE', 'DOME',
  'BLAZE', 'CRANE', 'DRIFT', 'EAGLE', 'FLAME', 'GRACE', 'HEART',
  'IMAGE', 'JEWEL', 'KNIFE', 'LEMON', 'MAPLE', 'NIGHT', 'OCEAN',
  'PIANO', 'QUEST', 'RIVER', 'STORM', 'TOWER', 'ULTRA', 'VOICE',
  'WHEAT', 'YOUTH', 'BRAVE', 'CLOUD', 'DREAM', 'FAIRY', 'GLOBE',
  'HONEY', 'JUICE',
  'BRIDGE', 'CASTLE', 'DESERT', 'ENERGY', 'FROZEN', 'GALAXY',
  'HARBOR', 'ISLAND', 'JUNGLE', 'KNIGHT', 'LISTEN', 'MARBLE',
  'NATURE', 'ORANGE', 'PLANET', 'RABBIT', 'SILVER', 'TEMPLE',
  'UNIQUE', 'VELVET', 'WONDER', 'BREEZE', 'COFFEE', 'DRAGON',
  'FOREST', 'GOLDEN', 'HUMBLE', 'IMPACT', 'KITTEN', 'LEGEND',
  'BALANCE', 'CAPTAIN', 'DIAMOND', 'ELEMENT', 'FORTUNE', 'GRAVITY',
  'HARVEST', 'IMAGINE', 'KINGDOM', 'LANTERN', 'MYSTERY', 'NETWORK',
  'ORGANIC', 'PYRAMID', 'RAINBOW', 'SHELTER', 'THUNDER', 'VOLCANO',
  'WARRIOR', 'CRYSTAL', 'BLANKET', 'COMPASS', 'DOLPHIN', 'FEATHER',
  'ABSOLUTE', 'BEVERAGE', 'CREATURE', 'DISTANCE', 'ELEPHANT', 'FLOATING',
  'GUARDIAN', 'HOMEWORK', 'INVENTOR', 'KEYBOARD', 'LANGUAGE', 'MOUNTAIN',
  'NOTEBOOK', 'PAINTING', 'SANDWICH', 'TREASURE', 'UMBRELLA', 'WILDLIFE',
];

function scrambleWord(word: string, rng: () => number): string[] {
  const letters = word.split('');
  let scrambled: string[];
  let attempts = 0;
  do {
    scrambled = seededShuffle([...letters], rng);
    attempts++;
  } while (scrambled.join('') === word && attempts < 10);
  return scrambled;
}

export function generateWords(seed: number, count: number): WordChallenge[] {
  const rng = mulberry32(seed);
  const shuffled = seededShuffle([...WORD_BANK], rng);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  return selected.map((word, idx) => ({
    id: idx,
    word,
    scrambled: scrambleWord(word, rng),
  }));
}
