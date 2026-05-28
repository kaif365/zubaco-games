const fs = require('fs');
const path = require('path');

const all = [
  'flash-spot/flash-spot-backend',
  'colour-sorting/colour-sorting-backend',
  'object-placement-memory/object-placement-memory-backend',
  'rapid-category-sort/rapid-sort-backend',
  'true-false-blitz/true-false-blitz-backend',
  'word-unscramble/word-unscramble-backend',
  'number-grid-sprint/number-grid-backend',
  'live-route-builder/live-route-backend',
  'memory-groups/memory-groups-backend',
  'reflex-endurance/reflex-endurance-backend',
  'pattern-survival/pattern-survival-backend',
  'speed-type-answer/speed-type-backend',
  'sequence-recall/sequence-recall-backend',
  'memory-card-matching/memory-card-matching-backend',
  'sliding-puzzle/sliding-puzzle-backend',
  'block-fill/block-fill-backend',
  'maze-navigation/maze-navigation-backend',
  'Infinity-loop/Infinity-Loop-backend',
  'arrows/arrows-backend',
  'logic-reflector/logic-reflector-backend',
];

all.forEach((dir) => {
  const mainPath = path.join(dir, 'src/main.ts');
  let content = fs.readFileSync(mainPath, 'utf8');

  if (content.includes('RedisIoAdapter')) {
    console.log(`SKIP ${dir} (already has RedisIoAdapter)`);
    return;
  }

  // Add import at top
  const importLine = "import { RedisIoAdapter } from './ws/redis-io.adapter';\n";
  
  // Find the line with NestFactory.create and add adapter setup after app creation
  // Pattern: after app.enableShutdownHooks() and before app.listen()
  
  if (content.includes('app.enableShutdownHooks()')) {
    // Add import
    content = importLine + content;
    
    // Add adapter setup before app.listen
    const adapterCode = `
  // Redis WebSocket adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  }

`;
    content = content.replace(
      /(\s*app\.enableShutdownHooks\(\);?\s*\n)/,
      `$1${adapterCode}`
    );

    fs.writeFileSync(mainPath, content);
    console.log(`WIRED ${dir}`);
  } else {
    console.log(`WARN ${dir} — no enableShutdownHooks found, skipping`);
  }
});

console.log('\nDone! Redis IO adapter wired into main.ts for all backends.');
