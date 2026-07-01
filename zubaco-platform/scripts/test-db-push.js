/**
 * Provision / reset the TEST database schema (Phase T3 infra).
 *
 * Loads `.env.test` (no external dependency — a tiny KEY=VALUE parser) and runs
 * `prisma db push --force-reset` against the test DATABASE_URL. `--force-reset`
 * drops and recreates the schema, giving every run a clean, isolated database.
 *
 * Usage: node scripts/test-db-push.js   (or `npm run test:db:push`)
 * Requires: docker-compose.test.yml Postgres to be up (npm run test:infra:up).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadEnvFile(file) {
  const full = path.join(__dirname, '..', file);
  if (!fs.existsSync(full)) {
    console.error(`[test-db-push] Missing ${file}`);
    process.exit(1);
  }
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile('.env.test');

if (!process.env.DATABASE_URL) {
  console.error('[test-db-push] DATABASE_URL is not set (check .env.test)');
  process.exit(1);
}

console.log(`[test-db-push] Resetting test schema at ${process.env.DATABASE_URL.replace(/:[^:@/]*@/, ':***@')}`);
execSync('npx prisma db push --force-reset', {
  stdio: 'inherit',
  env: process.env,
});
console.log('[test-db-push] Test database schema is ready.');
