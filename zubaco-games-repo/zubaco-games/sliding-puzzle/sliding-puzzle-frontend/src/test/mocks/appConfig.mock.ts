export const appConfig = {
  appName: 'Test App',
  version: '0.0.0',
  env: 'test',
  api: {
    baseUrl: 'http://localhost:3000',
    timeout: 5000,
  },
  features: {
    devtools: false,
    analytics: false,
  },
  analytics: {
    id: '',
  },
  socket: {
    url: 'http://localhost:3001',
  },
  game: {
    apiUrl: 'http://localhost:3000',
    usersApiUrl: 'http://localhost:3000/users',
    cdnBaseUrl: 'http://localhost:3000/cdn',
    stageId: 'test-stage',
    stageNo: 1,
    cloudfrontUrl: 'http://localhost:3000/cdn',
  },
  fileUpload: {
    url: 'http://localhost:3000/upload',
    apiKey: 'test-api-key',
  },
  encryption: {
    key: '',
    enabled: false,
  },
} as const;

export type AppConfig = typeof appConfig;
