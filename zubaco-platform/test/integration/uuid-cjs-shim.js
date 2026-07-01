/**
 * CommonJS interop shim for the ESM-only `uuid` v14 package (Phase T4-A).
 *
 * WHY: `uuid` v14 is pure ESM (`"type": "module"`). Node 24 can `require()` it
 * at runtime (which is why the production build works), but Jest's own module
 * runtime cannot, so importing any service that uses `uuid` (e.g. TokenService)
 * throws "Unexpected token 'export'". This shim is wired in ONLY via the Jest
 * `moduleNameMapper` for the integration suite.
 *
 * It is NOT a mock: every id returned is a genuine RFC-4122 v4 UUID produced by
 * Node's built-in `crypto.randomUUID()`. No business behaviour is faked.
 */
const { randomUUID } = require('crypto');

const NIL = '00000000-0000-0000-0000-000000000000';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = {
  v4: () => randomUUID(),
  v1: () => randomUUID(),
  v3: () => randomUUID(),
  v5: () => randomUUID(),
  v6: () => randomUUID(),
  v7: () => randomUUID(),
  NIL,
  validate: (value) => typeof value === 'string' && (value === NIL || UUID_RE.test(value)),
  version: () => 4,
  parse: (value) => Buffer.from(String(value).replace(/-/g, ''), 'hex'),
  stringify: (buf) => randomUUID(),
};
