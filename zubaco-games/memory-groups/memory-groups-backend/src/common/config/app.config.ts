export const appConfig = {
  port: parseInt(process.env.PORT || '3018', 10),
  jwtSecret: process.env.JWT_SECRET ?? '',
};

// Fail fast if critical env vars are missing — no insecure fallback secret
if (!process.env.JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'HMAC_SECRET', 'ADMIN_API_KEYS'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
