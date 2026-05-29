import { mulberry32 } from './random';
import type { Question } from '../../../types/game';

const QUESTIONS: { text: string; answer: string }[] = [
  { text: 'Capital of France?', answer: 'paris' },
  { text: 'Largest planet in our solar system?', answer: 'jupiter' },
  { text: 'Chemical symbol for gold?', answer: 'au' },
  { text: 'How many legs does a spider have?', answer: '8' },
  { text: 'Fastest land animal?', answer: 'cheetah' },
  { text: 'What gas do plants absorb?', answer: 'carbon dioxide' },
  { text: 'Smallest prime number?', answer: '2' },
  { text: 'Color of emeralds?', answer: 'green' },
  { text: 'Hardest natural substance?', answer: 'diamond' },
  { text: 'Number of continents?', answer: '7' },
  { text: 'Capital of Japan?', answer: 'tokyo' },
  { text: 'Element with symbol O?', answer: 'oxygen' },
  { text: 'Boiling point of water in Celsius?', answer: '100' },
  { text: 'Planet closest to the Sun?', answer: 'mercury' },
  { text: 'How many days in a leap year?', answer: '366' },
  { text: 'What is H2O?', answer: 'water' },
  { text: 'Largest ocean on Earth?', answer: 'pacific' },
  { text: 'Square root of 144?', answer: '12' },
  { text: 'Capital of Germany?', answer: 'berlin' },
  { text: 'Number of bones in adult human body?', answer: '206' },
  { text: 'Chemical formula for table salt?', answer: 'nacl' },
  { text: 'Largest mammal?', answer: 'blue whale' },
  { text: 'Speed of light: 3x10^? m/s', answer: '8' },
  { text: 'What year did WW2 end?', answer: '1945' },
  { text: 'Freezing point of water in Fahrenheit?', answer: '32' },
  { text: 'Capital of Australia?', answer: 'canberra' },
  { text: 'How many sides does a hexagon have?', answer: '6' },
  { text: 'Planet known as the Red Planet?', answer: 'mars' },
  { text: 'Inventor of the light bulb?', answer: 'edison' },
  { text: 'Largest desert on Earth?', answer: 'sahara' },
];

export function selectQuestions(seed: number, count: number): Question[] {
  const rng = mulberry32(seed);
  const indices: number[] = [];
  const available = QUESTIONS.map((_, i) => i);
  for (let i = 0; i < Math.min(count, QUESTIONS.length); i++) {
    const idx = Math.floor(rng() * available.length);
    indices.push(available[idx]!);
    available.splice(idx, 1);
  }
  return indices.map((qi, i) => ({ id: i, text: QUESTIONS[qi]!.text, answer: QUESTIONS[qi]!.answer }));
}
