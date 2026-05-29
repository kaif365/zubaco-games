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

function fileExists(dir, relPath) {
  return fs.existsSync(path.join(dir, relPath));
}

function fileContains(dir, relPath, text) {
  const p = path.join(dir, relPath);
  if (!fs.existsSync(p)) return false;
  return fs.readFileSync(p, 'utf8').includes(text);
}

const checks = [
  // P14: Rate Limiting
  { phase: 'P14', name: 'ThrottlerModule', test: (d) => fileContains(d, 'src/app.module.ts', 'ThrottlerModule') },
  // P15: Health Checks
  { phase: 'P15', name: 'HealthModule', test: (d) => fileExists(d, 'src/health') || fileExists(d, 'src/server/health.controller.ts') || fileContains(d, 'src/app.module.ts', 'HealthModule') || fileContains(d, 'src/app.module.ts', 'ServerModule') },
  // P16: Structured Logging
  { phase: 'P16', name: 'nestjs-pino', test: (d) => fileContains(d, 'package.json', 'nestjs-pino') },
  // P17: Swagger
  { phase: 'P17', name: 'Swagger', test: (d) => fileContains(d, 'package.json', '@nestjs/swagger') },
  // P18: Encryption
  { phase: 'P18', name: 'CryptoModule', test: (d) => fileExists(d, 'src/crypto') },
  // P19: Correlation ID
  { phase: 'P19', name: 'CorrelationId', test: (d) => fileExists(d, 'src/common/middleware/correlation-id.middleware.ts') },
  // P20: Timeout Interceptor
  { phase: 'P20', name: 'TimeoutIntrcptr', test: (d) => fileExists(d, 'src/common/interceptors/timeout.interceptor.ts') },
  // P22: API Versioning
  { phase: 'P22', name: 'Versioning', test: (d) => fileContains(d, 'src/main.ts', 'VersioningType') },
  // P25: Redis
  { phase: 'P25', name: 'Redis', test: (d) => fileExists(d, 'src/redis') || fileContains(d, 'package.json', 'ioredis') },
  // P26: DB Seed
  { phase: 'P26', name: 'DB Seed', test: (d) => fileExists(d, 'prisma/seed.ts') || fileContains(d, 'package.json', '"db:seed"') },
  // P27: Metrics
  { phase: 'P27', name: 'MetricsModule', test: (d) => fileExists(d, 'src/common/metrics/metrics.service.ts') },
  // P28: API Key Guard
  { phase: 'P28a', name: 'ApiKeyGuard', test: (d) => fileExists(d, 'src/common/guards/api-key.guard.ts') },
  // P28: HMAC Guard
  { phase: 'P28b', name: 'HmacGuard', test: (d) => fileExists(d, 'src/common/guards/hmac.guard.ts') },
  // P28: Security Headers
  { phase: 'P28c', name: 'SecHeaders', test: (d) => fileExists(d, 'src/common/middleware/security-headers.middleware.ts') },
  // P28: Sanitize Pipe
  { phase: 'P28d', name: 'SanitizePipe', test: (d) => fileExists(d, 'src/common/pipes/sanitize.pipe.ts') },
  // P28: Rate Limit Decorators
  { phase: 'P28e', name: 'RateLimitDec', test: (d) => fileExists(d, 'src/common/decorators/rate-limit.decorator.ts') },
  // P29: E2E Tests
  { phase: 'P29', name: 'E2E Tests', test: (d) => fileExists(d, 'jest-e2e.config.ts') || fileExists(d, 'test/app.e2e-spec.ts') },
  // P30: BullMQ Queue
  { phase: 'P30', name: 'QueueModule', test: (d) => fileExists(d, 'src/queue/queue.module.ts') },
];

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║  ZUBACO ARCHITECTURE CONSISTENCY AUDIT — P14 to P30 across 20 backends       ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

// Header
const header = 'Backend'.padEnd(42) + checks.map(c => c.phase.padEnd(6)).join('');
console.log(header);
console.log('─'.repeat(header.length));

const gaps = [];

all.forEach((dir) => {
  const shortName = dir.split('/')[1];
  let row = shortName.padEnd(42);
  checks.forEach((check) => {
    const ok = check.test(dir);
    row += (ok ? '  ✓   ' : '  ✗   ');
    if (!ok) gaps.push({ backend: shortName, phase: check.phase, feature: check.name });
  });
  console.log(row);
});

console.log('\n' + '═'.repeat(80));
if (gaps.length === 0) {
  console.log('  ✓ ALL 20 BACKENDS ARE FULLY CONSISTENT ACROSS ALL PHASES');
} else {
  console.log(`  ✗ ${gaps.length} GAPS FOUND:\n`);
  gaps.forEach(g => console.log(`    ${g.backend} — ${g.phase} (${g.feature})`));
}
console.log('═'.repeat(80));
