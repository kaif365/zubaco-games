const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const games = [
  { name: 'flash-spot', port: 3001 },
  { name: 'colour-sorting', port: 3002 },
  { name: 'object-placement-memory', port: 3003 },
  { name: 'rapid-sort', port: 3004 },
  { name: 'true-false-blitz', port: 3005 },
  { name: 'word-unscramble', port: 3006 },
  { name: 'number-grid', port: 3007 },
  { name: 'live-route', port: 3008 },
  { name: 'memory-groups', port: 3009 },
  { name: 'reflex-endurance', port: 3010 },
  { name: 'pattern-survival', port: 3011 },
  { name: 'speed-type', port: 3012 },
  { name: 'sequence-recall', port: 3013 },
  { name: 'memory-card-matching', port: 3014 },
  { name: 'sliding-puzzle', port: 3015 },
  { name: 'block-fill', port: 3016 },
  { name: 'maze-navigation', port: 3017 },
  { name: 'infinity-loop', port: 3018 },
  { name: 'arrows', port: 3019 },
  { name: 'logic-reflector', port: 3020 },
];

const targetGame = process.argv[2];
const filtered = targetGame ? games.filter(g => g.name === targetGame) : games;

if (filtered.length === 0) {
  console.error(`Unknown game: ${targetGame}`);
  process.exit(1);
}

const outputBase = path.join(__dirname, 'generated');
if (!fs.existsSync(outputBase)) fs.mkdirSync(outputBase);

filtered.forEach(game => {
  const specUrl = `http://localhost:${game.port}/api/docs-json`;
  const outputDir = path.join(outputBase, game.name);

  console.log(`\nGenerating SDK for ${game.name} from ${specUrl}...`);

  try {
    execSync(
      `npx @openapitools/openapi-generator-cli generate ` +
      `-i ${specUrl} ` +
      `-g typescript-axios ` +
      `-o ${outputDir} ` +
      `--additional-properties=npmName=@zubaco/${game.name}-client,npmVersion=1.0.0,supportsES6=true,withInterfaces=true`,
      { stdio: 'inherit' }
    );
    console.log(`  ✓ ${game.name} SDK generated at ${outputDir}`);
  } catch (err) {
    console.error(`  ✗ Failed to generate ${game.name}: ${err.message}`);
  }
});

console.log('\nSDK generation complete.');
