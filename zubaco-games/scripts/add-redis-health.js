const fs = require('fs');
const path = require('path');

const backends = [
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
];

const redisHealthContent = `import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = this.redis.isHealthy();
    const result = this.getStatus(key, isHealthy);

    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Redis check failed', result);
  }
}
`;

backends.forEach((dir) => {
  const healthDir = path.join(dir, 'src/health');
  const filePath = path.join(healthDir, 'redis.health.ts');

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, redisHealthContent);
    console.log(`CREATED ${filePath}`);
  } else {
    console.log(`EXISTS  ${filePath}`);
  }

  // Update health.controller.ts to include Redis
  const controllerPath = path.join(healthDir, 'health.controller.ts');
  let controller = fs.readFileSync(controllerPath, 'utf8');

  if (controller.includes('RedisHealthIndicator')) {
    console.log(`SKIP   ${controllerPath} (already has Redis)`);
    return;
  }

  // Add import
  controller = controller.replace(
    /import \{ PrismaHealthIndicator \} from '.\/prisma.health';/,
    `import { PrismaHealthIndicator } from './prisma.health';\nimport { RedisHealthIndicator } from './redis.health';`
  );

  // Add to constructor
  controller = controller.replace(
    /private prismaHealth: PrismaHealthIndicator,\n\s*\)/,
    `private prismaHealth: PrismaHealthIndicator,\n    private redisHealth: RedisHealthIndicator,\n  )`
  );

  // Add to readiness check
  controller = controller.replace(
    /readiness\(\) \{\n\s*return this\.health\.check\(\[\n\s*\(\) => this\.prismaHealth\.isHealthy\('database'\),\n\s*\]\);/,
    `readiness() {\n    return this.health.check([\n      () => this.prismaHealth.isHealthy('database'),\n      () => this.redisHealth.isHealthy('redis'),\n    ]);`
  );

  // Add to main health check
  controller = controller.replace(
    /check\(\) \{\n\s*return this\.health\.check\(\[\n\s*\(\) => this\.prismaHealth\.isHealthy\('database'\),\n\s*\(\) => this\.memory\.checkHeap\('memory_heap', 256 \* 1024 \* 1024\),\n\s*\]\);/,
    `check() {\n    return this.health.check([\n      () => this.prismaHealth.isHealthy('database'),\n      () => this.redisHealth.isHealthy('redis'),\n      () => this.memory.checkHeap('memory_heap', 256 * 1024 * 1024),\n    ]);`
  );

  fs.writeFileSync(controllerPath, controller);
  console.log(`UPDATED ${controllerPath}`);
});

// Update health.module.ts to provide RedisHealthIndicator
backends.forEach((dir) => {
  const modulePath = path.join(dir, 'src/health/health.module.ts');
  let module = fs.readFileSync(modulePath, 'utf8');

  if (module.includes('RedisHealthIndicator')) {
    console.log(`SKIP   ${modulePath} (already has Redis)`);
    return;
  }

  // Add import
  module = module.replace(
    /import \{ PrismaHealthIndicator \} from '.\/prisma.health';/,
    `import { PrismaHealthIndicator } from './prisma.health';\nimport { RedisHealthIndicator } from './redis.health';`
  );

  // Add to providers
  module = module.replace(
    /providers: \[PrismaHealthIndicator/,
    `providers: [PrismaHealthIndicator, RedisHealthIndicator`
  );

  fs.writeFileSync(modulePath, module);
  console.log(`UPDATED ${modulePath}`);
});
