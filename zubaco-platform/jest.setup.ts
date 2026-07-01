/**
 * Jest global setup (Phase T1 unit tests).
 *
 * Some services transitively import `src/config`, which throws at module-load
 * time when JWT secrets are absent. These are non-secret, test-only values used
 * purely so the module graph loads; no real auth is performed in unit tests.
 */
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.NODE_ENV = 'test';
