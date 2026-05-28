import { mulberry32, seededShuffle } from './random';

export interface Statement {
  id: number;
  text: string;
  isTrue: boolean;
}

const STATEMENT_BANK: [string, boolean][] = [
  ['The Earth orbits the Sun', true],
  ['Water boils at 100°C at sea level', true],
  ['Humans have 206 bones', true],
  ['The Great Wall of China is visible from space', false],
  ['Diamonds are made of carbon', true],
  ['Octopuses have three hearts', true],
  ['The Amazon is the longest river', false],
  ['Lightning is hotter than the Sun surface', true],
  ['Sharks are older than trees', true],
  ['Bananas are berries', true],
  ['Strawberries are berries', false],
  ['Sound travels faster than light', false],
  ['Venus is the hottest planet', true],
  ['Goldfish have a 3-second memory', false],
  ['Honey never spoils', true],
  ['Bats are blind', false],
  ['The Sahara is the largest desert', false],
  ['Elephants cannot jump', true],
  ['A group of flamingos is called a flamboyance', true],
  ['Humans share 50% DNA with bananas', true],
  ['Mount Everest is the tallest mountain', true],
  ['Penguins can fly', false],
  ['The Moon has its own light', false],
  ['Koalas have fingerprints', true],
  ['Glass is a liquid', false],
  ['The heart is on the left side', false],
  ['Avocados are fruits', true],
  ['Tomatoes are vegetables', false],
  ['Dolphins sleep with one eye open', true],
  ['Human blood is blue inside the body', false],
  ['Peanuts are nuts', false],
  ['The Pacific is the largest ocean', true],
  ['Australia is both a country and continent', true],
  ['Spiders are insects', false],
  ['Camels store water in their humps', false],
  ['Mars has two moons', true],
  ['Saturn could float on water', true],
  ['Owls can turn their heads 360°', false],
  ['A jiffy is an actual unit of time', true],
  ['Whales are fish', false],
  ['The Nile is the longest river', true],
  ['Mercury is the closest planet to the Sun', true],
  ['The human nose can detect 1 trillion smells', true],
  ['Sloths are related to bears', false],
  ['Ostriches bury their heads in sand', false],
  ['Chocolate is toxic to dogs', true],
  ['Bulls are angered by red color', false],
  ['An octopus has blue blood', true],
  ['Snakes can hear sounds', false],
  ['Giraffes have the same number of neck vertebrae as humans', true],
  ['Coffee beans are actually seeds', true],
  ['Chameleons change color to match surroundings', false],
  ['Polar bears have black skin', true],
  ['Starfish have a brain', false],
  ['The tongue is the strongest muscle', false],
  ['Fingernails grow faster than toenails', true],
  ['Vikings wore horned helmets', false],
  ['Cleopatra lived closer to the Moon landing than pyramids', true],
  ['Clouds are weightless', false],
  ['A day on Venus is longer than its year', true],
];

export function generateStatements(seed: number, count: number): Statement[] {
  const rng = mulberry32(seed);
  const shuffled = seededShuffle([...STATEMENT_BANK], rng);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  return selected.map(([text, isTrue], idx) => ({ id: idx, text, isTrue }));
}
