import { Logger } from '@nestjs/common';

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
        errors.push(`Missing required env var: ${schema.key} — ${schema.description}`);
      } else {
        warnings.push(`Missing env var: ${schema.key} (required in production) — ${schema.description}`);
      }
    } else if (!value && schema.defaultValue) {
      process.env[schema.key] = schema.defaultValue;
    } else if (value && schema.validator && !schema.validator(value)) {
      errors.push(`Invalid value for ${schema.key}: "${value}" — ${schema.description}`);
    }
  }

  if (warnings.length > 0) {
    warnings.forEach((w) => logger.warn(w));
  }

  if (errors.length > 0) {
    errors.forEach((e) => logger.error(e));
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed: ${errors.length} error(s). Fix configuration before deploying.`);
    }
  }

  logger.log('Environment validation passed');
}
