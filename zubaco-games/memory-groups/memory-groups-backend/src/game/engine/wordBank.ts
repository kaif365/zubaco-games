import { mulberry32 } from './random';
export interface WordGroup { category: string; words: string[]; }
export interface WordSet { groups: WordGroup[]; }

const WORD_SETS: WordSet[] = [
  { groups: [{ category: 'Fruits', words: ['apple','banana','cherry'] }, { category: 'Colors', words: ['crimson','azure','emerald'] }, { category: 'Planets', words: ['mars','venus','saturn'] }] },
  { groups: [{ category: 'Animals', words: ['tiger','eagle','dolphin'] }, { category: 'Tools', words: ['hammer','wrench','drill'] }, { category: 'Sports', words: ['tennis','hockey','boxing'] }] },
  { groups: [{ category: 'Instruments', words: ['violin','trumpet','drums'] }, { category: 'Countries', words: ['brazil','japan','egypt'] }, { category: 'Elements', words: ['oxygen','gold','iron'] }] },
  { groups: [{ category: 'Vehicles', words: ['rocket','bicycle','submarine'] }, { category: 'Foods', words: ['pizza','sushi','tacos'] }, { category: 'Weather', words: ['thunder','blizzard','tornado'] }] },
  { groups: [{ category: 'Clothes', words: ['jacket','sandals','scarf'] }, { category: 'Trees', words: ['oak','maple','pine'] }, { category: 'Dances', words: ['waltz','salsa','tango'] }] },
  { groups: [{ category: 'Gems', words: ['ruby','diamond','topaz'] }, { category: 'Seas', words: ['atlantic','pacific','arctic'] }, { category: 'Metals', words: ['copper','silver','bronze'] }] },
  { groups: [{ category: 'Birds', words: ['falcon','penguin','owl'] }, { category: 'Flowers', words: ['orchid','tulip','daisy'] }, { category: 'Languages', words: ['python','rust','swift'] }] },
  { groups: [{ category: 'Drinks', words: ['coffee','juice','water'] }, { category: 'Shapes', words: ['circle','triangle','hexagon'] }, { category: 'Emotions', words: ['joy','anger','fear'] }] },
];

export function selectWordSet(seed: number): WordSet {
  const rng = mulberry32(seed);
  const idx = Math.floor(rng() * WORD_SETS.length);
  return WORD_SETS[idx]!;
}

export function shuffleWords(words: string[], seed: number): string[] {
  const rng = mulberry32(seed + 999);
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j]!, arr[i]!]; }
  return arr;
}
