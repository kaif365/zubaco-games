export const appConfig = {
  port: parseInt(process.env.PORT || '3008', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-rapid-sort',
};

// Fail fast in production if critical env vars are missing
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'HMAC_SECRET', 'ADMIN_API_KEYS'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
