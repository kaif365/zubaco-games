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

// ─── Environment Validation Schema ───
const envValidation = `import { Logger } from '@nestjs/common';

export interface EnvSchema {
  key: string;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  description: string;
}

const ENV_SCHEMA: EnvSchema[] = [
  { key: 'NODE_ENV', required: false, defaultValue: 'development', description: 'Application environment' },
  { key: 'PORT', required: false, defaultValue: '3000', validator: (v) => !isNaN(Number(v)), description: 'Server port' },
  { key: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
  { key: 'REDIS_URL', required: false, defaultValue: 'redis://localhost:6379', description: 'Redis connection URL' },
  { key: 'JWT_SECRET', required: true, description: 'JWT signing secret' },
  { key: 'HMAC_SECRET', required: true, description: 'HMAC request signing secret' },
  { key: 'ADMIN_API_KEYS', required: true, description: 'Comma-separated admin API keys' },
  { key: 'CORS_ORIGINS', required: false, defaultValue: '*', description: 'Allowed CORS origins' },
  { key: 'ENCRYPTION_KEY', required: false, description: 'AES-256-GCM encryption key (hex)' },
  { key: 'SHUTDOWN_DRAIN_MS', required: false, defaultValue: '5000', validator: (v) => !isNaN(Number(v)), description: 'Shutdown drain time in ms' },
];

export function validateEnvironment(): void {
  const logger = new Logger('EnvValidation');
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const schema of ENV_SCHEMA) {
    const value = process.env[schema.key];

    if (!value && schema.required) {
      if (process.env.NODE_ENV === 'production') {
        errors.push(\`Missing required env var: \${schema.key} — \${schema.description}\`);
      } else {
        warnings.push(\`Missing env var: \${schema.key} (required in production) — \${schema.description}\`);
      }
    } else if (!value && schema.defaultValue) {
      process.env[schema.key] = schema.defaultValue;
    } else if (value && schema.validator && !schema.validator(value)) {
      errors.push(\`Invalid value for \${schema.key}: "\${value}" — \${schema.description}\`);
    }
  }

  if (warnings.length > 0) {
    warnings.forEach((w) => logger.warn(w));
  }

  if (errors.length > 0) {
    errors.forEach((e) => logger.error(e));
    if (process.env.NODE_ENV === 'production') {
      throw new Error(\`Environment validation failed: \${errors.length} error(s). Fix configuration before deploying.\`);
    }
  }

  logger.log('Environment validation passed');
}
`;

// ─── Feature Flags Service ───
const featureFlagsService = `import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  updatedAt?: string;
}

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private redis: Redis | null = null;
  private readonly localCache = new Map<string, boolean>();
  private readonly REDIS_PREFIX = 'ff:';
  private readonly CACHE_TTL_MS = 30_000; // 30s local cache
  private lastRefresh = 0;

  async onModuleInit(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
      await this.redis.connect();
      await this.refreshCache();
      this.logger.log('Feature flags service initialized');
    } catch (err) {
      this.logger.warn('Redis unavailable for feature flags — using defaults');
      this.redis = null;
    }
  }

  async isEnabled(flagName: string, defaultValue = false): Promise<boolean> {
    // Check local cache first
    if (Date.now() - this.lastRefresh < this.CACHE_TTL_MS && this.localCache.has(flagName)) {
      return this.localCache.get(flagName)!;
    }

    if (!this.redis) return defaultValue;

    try {
      const value = await this.redis.get(\`\${this.REDIS_PREFIX}\${flagName}\`);
      if (value === null) return defaultValue;
      const enabled = value === '1' || value === 'true';
      this.localCache.set(flagName, enabled);
      return enabled;
    } catch {
      return this.localCache.get(flagName) ?? defaultValue;
    }
  }

  async setFlag(flagName: string, enabled: boolean): Promise<void> {
    if (!this.redis) {
      this.localCache.set(flagName, enabled);
      return;
    }

    await this.redis.set(\`\${this.REDIS_PREFIX}\${flagName}\`, enabled ? '1' : '0');
    this.localCache.set(flagName, enabled);
    this.logger.log(\`Feature flag "\${flagName}" set to \${enabled}\`);
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    if (!this.redis) {
      return Array.from(this.localCache.entries()).map(([name, enabled]) => ({ name, enabled }));
    }

    try {
      const keys = await this.redis.keys(\`\${this.REDIS_PREFIX}*\`);
      if (keys.length === 0) return [];

      const pipeline = this.redis.pipeline();
      keys.forEach((key) => pipeline.get(key));
      const results = await pipeline.exec();

      return keys.map((key, i) => ({
        name: key.replace(this.REDIS_PREFIX, ''),
        enabled: results?.[i]?.[1] === '1' || results?.[i]?.[1] === 'true',
      }));
    } catch {
      return [];
    }
  }

  private async refreshCache(): Promise<void> {
    const flags = await this.getAllFlags();
    flags.forEach((f) => this.localCache.set(f.name, f.enabled));
    this.lastRefresh = Date.now();
  }
}
`;

// ─── Feature Flags Module ───
const featureFlagsModule = `import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';

@Global()
@Module({
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
`;

// ─── Feature Flag Guard (route-level) ───
const featureFlagGuard = `import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';

export const FEATURE_FLAG_KEY = 'feature_flag';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFlag = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFlag) return true;

    const isEnabled = await this.featureFlags.isEnabled(requiredFlag);
    if (!isEnabled) {
      throw new ForbiddenException(\`Feature "\${requiredFlag}" is currently disabled\`);
    }
    return true;
  }
}
`;

// ─── RequireFeature decorator ───
const requireFeatureDecorator = `import { SetMetadata } from '@nestjs/common';
import { FEATURE_FLAG_KEY } from './feature-flag.guard';

export const RequireFeature = (flagName: string) => SetMetadata(FEATURE_FLAG_KEY, flagName);
`;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`  CREATED ${path.relative('.', filePath)}`);
    return true;
  }
  return false;
}

all.forEach((dir) => {
  console.log(`\n=== ${dir} ===`);
  const configDir = path.join(dir, 'src/config');
  const ffDir = path.join(dir, 'src/feature-flags');
  ensureDir(configDir);
  ensureDir(ffDir);

  writeIfMissing(path.join(configDir, 'env.validation.ts'), envValidation);
  writeIfMissing(path.join(ffDir, 'feature-flags.service.ts'), featureFlagsService);
  writeIfMissing(path.join(ffDir, 'feature-flags.module.ts'), featureFlagsModule);
  writeIfMissing(path.join(ffDir, 'feature-flag.guard.ts'), featureFlagGuard);
  writeIfMissing(path.join(ffDir, 'require-feature.decorator.ts'), requireFeatureDecorator);

  // Wire FeatureFlagsModule into app.module.ts
  const appModulePath = path.join(dir, 'src/app.module.ts');
  let appModule = fs.readFileSync(appModulePath, 'utf8');

  if (!appModule.includes('FeatureFlagsModule')) {
    const lines = appModule.split('\n');
    let insertIdx = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].match(/^import /)) {
        insertIdx = i + 1;
        break;
      }
    }
    lines.splice(insertIdx, 0, "import { FeatureFlagsModule } from './feature-flags/feature-flags.module';");
    appModule = lines.join('\n');
    appModule = appModule.replace(/imports: \[/, 'imports: [\n        FeatureFlagsModule,');
    fs.writeFileSync(appModulePath, appModule);
    console.log(`  WIRED FeatureFlagsModule`);
  }

  // Add validateEnvironment() call to main.ts
  const mainPath = path.join(dir, 'src/main.ts');
  let main = fs.readFileSync(mainPath, 'utf8');

  if (!main.includes('validateEnvironment')) {
    main = "import { validateEnvironment } from './config/env.validation';\n" + main;
    // Add call right before bootstrap
    main = main.replace(
      /(async function bootstrap\(\)[\s\S]*?\{)/,
      '$1\n  validateEnvironment();\n'
    );
    // Handle void bootstrap() pattern
    if (!main.includes('validateEnvironment();')) {
      main = main.replace(
        /(function bootstrap\(\)[\s\S]*?\{)/,
        '$1\n  validateEnvironment();\n'
      );
    }
    fs.writeFileSync(mainPath, main);
    console.log(`  WIRED validateEnvironment()`);
  }
});

console.log('\n\nDone! Config validation + Feature flags added to all 20 backends.');
