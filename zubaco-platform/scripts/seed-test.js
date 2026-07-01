/**
 * TEST database seed / reachability check (Phase T3 infra).
 *
 * The current test suites (Phase T1 unit + Phase T2 Redis integration) require
 * NO seeded rows, so this intentionally does NOT fabricate business fixtures.
 * It verifies the test database is reachable (schema provisioned by
 * test-db-push.js) and is the documented extension point where fixtures for
 * future DB-backed integration/E2E tests should be added.
 *
 * Usage: node scripts/seed-test.js   (or `npm run test:db:seed`)
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnvFile(file) {
  const full = path.join(__dirname, '..', file);
  if (!fs.existsSync(full)) return;
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

async function main() {
  loadEnvFile('.env.test');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[seed-test] DATABASE_URL is not set (check .env.test)');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  const { rows } = await client.query('SELECT 1 AS ok');
  if (rows[0].ok !== 1) throw new Error('Unexpected test DB response');
  console.log('[seed-test] Test database reachable. No fixtures required for current suites.');
  console.log('[seed-test] Add DB-backed test fixtures here when DB-backed suites land.');
  await client.end();
}

main().catch((err) => {
  console.error(`[seed-test] Failed: ${err.message}`);
  process.exit(1);
});
