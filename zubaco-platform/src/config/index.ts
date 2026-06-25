export const config = {
  jwt: {
    accessSecret: (() => {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) throw new Error('FATAL: JWT_ACCESS_SECRET environment variable is required');
      return secret;
    })(),
    refreshSecret: (() => {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is required');
      return secret;
    })(),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  otp: {
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
    maxAttempts: 5,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || '', // Bundle ID e.g. com.zubaco.app
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'zubaco-assets',
  },
  webhook: {
    // Base Platform endpoint that receives validated game results.
    basePlatformUrl: process.env.BASE_PLATFORM_WEBHOOK_URL || '',
    // Shared secret used to HMAC-sign outbound webhook payloads.
    signingSecret: process.env.WEBHOOK_SIGNING_SECRET || '',
    maxAttempts: parseInt(process.env.WEBHOOK_MAX_ATTEMPTS || '5', 10),
    // Base backoff in seconds; actual delay = base * 2^attempt (capped).
    backoffBaseSeconds: parseInt(process.env.WEBHOOK_BACKOFF_BASE_SECONDS || '5', 10),
    backoffMaxSeconds: parseInt(process.env.WEBHOOK_BACKOFF_MAX_SECONDS || '900', 10),
    timeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000', 10),
  },
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    referralBonusAmount: 50,
    minWithdrawal: 100,
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'msg91',
    apiKey: process.env.SMS_API_KEY || '',
    templateId: process.env.SMS_TEMPLATE_ID || '',
    twilioSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFrom: process.env.TWILIO_FROM_NUMBER || '',
  },
};

// Validate critical env vars in production
if (config.app.env === 'production') {
  const required = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'INTERNAL_API_KEY',
    'GOOGLE_CLIENT_ID',
    'REDIS_HOST',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  }
}
