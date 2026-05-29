import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  database: { url: process.env.DATABASE_URL || '' },
  server: { port: Number(process.env.PORT) || 3004 },
  security: { jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production' },
  throttle: {
    enabled: process.env.THROTTLE_ENABLED !== 'false',
    ttlMs: Number(process.env.THROTTLE_TTL_MS) || 60000,
    gameLimit: Number(process.env.THROTTLE_GAME_LIMIT) || 30,
    defaultLimit: Number(process.env.THROTTLE_DEFAULT_LIMIT) || 100,
  },
  swagger: {
    title: 'Object Placement Memory Service',
    description: 'ZUBACO Gaming Engine � Object Placement Memory API',
    version: '1.0.0',
  },
} as const;
// Fail fast in production if critical env vars are missing
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}