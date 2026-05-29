import { mulberry32, seededShuffle } from './random';

type SortDirection = 'left' | 'right';

interface CategoryItem {
  id: number;
  text: string;
  correctSide: SortDirection;
}

interface CategoryPair {
  id: string;
  leftCategory: string;
  rightCategory: string;
  items: CategoryItem[];
}

const CATEGORY_BANK: [string, string, string[], string[]][] = [
  ['Animal', 'Plant', ['Dog', 'Eagle', 'Shark', 'Tiger', 'Frog', 'Whale', 'Ant', 'Bear'], ['Rose', 'Oak', 'Tulip', 'Cactus', 'Fern', 'Daisy', 'Maple', 'Bamboo']],
  ['Fruit', 'Vegetable', ['Apple', 'Banana', 'Mango', 'Orange', 'Grape', 'Peach', 'Kiwi', 'Cherry'], ['Carrot', 'Potato', 'Onion', 'Spinach', 'Broccoli', 'Celery', 'Pepper', 'Garlic']],
  ['Hot', 'Cold', ['Fire', 'Sun', 'Lava', 'Desert', 'Sauna', 'Chili', 'Furnace', 'Ember'], ['Ice', 'Snow', 'Frost', 'Glacier', 'Arctic', 'Freezer', 'Blizzard', 'Winter']],
  ['Land', 'Water', ['Mountain', 'Forest', 'Desert', 'Cave', 'Cliff', 'Valley', 'Meadow', 'Volcano'], ['Ocean', 'River', 'Lake', 'Pond', 'Waterfall', 'Stream', 'Reef', 'Lagoon']],
  ['Day', 'Night', ['Sunrise', 'Noon', 'Lunch', 'Morning', 'Afternoon', 'Sunshine', 'Dawn', 'Midday'], ['Midnight', 'Stars', 'Moon', 'Dusk', 'Owl', 'Dream', 'Twilight', 'Eclipse']],
  ['Sweet', 'Sour', ['Candy', 'Honey', 'Cake', 'Cookie', 'Sugar', 'Donut', 'Fudge', 'Syrup'], ['Lemon', 'Vinegar', 'Lime', 'Grapefruit', 'Pickle', 'Tamarind', 'Cranberry', 'Yogurt']],
  ['Fast', 'Slow', ['Cheetah', 'Jet', 'Rocket', 'Lightning', 'Bullet', 'Falcon', 'Sprint', 'Sonic'], ['Snail', 'Turtle', 'Sloth', 'Glacier', 'Crawl', 'Tortoise', 'Slug', 'Drift']],
  ['Big', 'Small', ['Elephant', 'Whale', 'Skyscraper', 'Mountain', 'Jupiter', 'Stadium', 'Ocean', 'Galaxy'], ['Ant', 'Atom', 'Seed', 'Pebble', 'Dot', 'Grain', 'Pixel', 'Mite']],
  ['Sky', 'Ground', ['Cloud', 'Bird', 'Plane', 'Star', 'Kite', 'Comet', 'Balloon', 'Satellite'], ['Root', 'Worm', 'Tunnel', 'Stone', 'Soil', 'Fossil', 'Mole', 'Burrow']],
  ['Old', 'New', ['Ancient', 'Fossil', 'Vintage', 'Classic', 'Relic', 'Antique', 'Medieval', 'Retro'], ['Modern', 'Fresh', 'Latest', 'Startup', 'Update', 'Debut', 'Novel', 'Recent']],
  ['Soft', 'Hard', ['Pillow', 'Cotton', 'Cloud', 'Silk', 'Feather', 'Foam', 'Velvet', 'Butter'], ['Diamond', 'Steel', 'Rock', 'Iron', 'Brick', 'Concrete', 'Titanium', 'Marble']],
  ['Living', 'NonLiving', ['Cat', 'Tree', 'Bacteria', 'Mushroom', 'Fish', 'Human', 'Coral', 'Moss'], ['Rock', 'Chair', 'Glass', 'Plastic', 'Metal', 'Paper', 'Sand', 'Wire']],
  ['Indoor', 'Outdoor', ['Sofa', 'Lamp', 'Oven', 'Bed', 'Fridge', 'Carpet', 'Desk', 'Shower'], ['Beach', 'Park', 'Garden', 'Trail', 'Field', 'Patio', 'Roof', 'Playground']],
  ['Round', 'Square', ['Ball', 'Globe', 'Wheel', 'Coin', 'Moon', 'Ring', 'Bubble', 'Sphere'], ['Box', 'Cube', 'Tile', 'Frame', 'Block', 'Brick', 'Screen', 'Board']],
  ['Loud', 'Quiet', ['Thunder', 'Siren', 'Drum', 'Explosion', 'Roar', 'Horn', 'Concert', 'Alarm'], ['Whisper', 'Library', 'Feather', 'Shadow', 'Breeze', 'Mime', 'Snowfall', 'Candle']],
  ['Wet', 'Dry', ['Rain', 'Pool', 'Sweat', 'Dew', 'Splash', 'Tears', 'Flood', 'Drizzle'], ['Sand', 'Dust', 'Bone', 'Toast', 'Chalk', 'Paper', 'Cracker', 'Powder']],
];

export function generateItemSequence(
  seed: number,
  totalItems: number,
  categoryPoolSize: number,
): { pairs: CategoryPair[]; sequence: CategoryItem[] } {
  const rng = mulberry32(seed);
  const shuffledBank = seededShuffle([...CATEGORY_BANK], rng);
  const selectedPairs = shuffledBank.slice(0, Math.min(categoryPoolSize, shuffledBank.length));

  const pairs: CategoryPair[] = [];
  const allItems: CategoryItem[] = [];
  let itemId = 0;

  for (let pairIdx = 0; pairIdx < selectedPairs.length; pairIdx++) {
    const [catA, catB, itemsA, itemsB] = selectedPairs[pairIdx];
    const swapSides = rng() > 0.5;
    const leftCat = swapSides ? catB : catA;
    const rightCat = swapSides ? catA : catB;
    const leftItems = swapSides ? itemsB : itemsA;
    const rightItems = swapSides ? itemsA : itemsB;

    const pairItems: CategoryItem[] = [];
    const shuffledLeft = seededShuffle(leftItems, rng);
    const shuffledRight = seededShuffle(rightItems, rng);
    const itemsPerSide = Math.ceil(totalItems / (categoryPoolSize * 2));

    for (let i = 0; i < Math.min(itemsPerSide, shuffledLeft.length); i++) {
      pairItems.push({ id: itemId++, text: shuffledLeft[i], correctSide: 'left' });
    }
    for (let i = 0; i < Math.min(itemsPerSide, shuffledRight.length); i++) {
      pairItems.push({ id: itemId++, text: shuffledRight[i], correctSide: 'right' });
    }

    pairs.push({ id: `pair-${pairIdx}`, leftCategory: leftCat, rightCategory: rightCat, items: pairItems });
    allItems.push(...pairItems);
  }

  const sequence = seededShuffle(allItems, rng).slice(0, totalItems);
  sequence.forEach((item, idx) => { item.id = idx; });

  return { pairs, sequence };
}
