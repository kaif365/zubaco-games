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
    useApiMode: true,
  },
  analytics: {
    id: '',
  },
  socket: {
    url: 'http://localhost:3000',
    stageId: 'test-stage-id',
  },
} as const;

export type AppConfig = typeof appConfig;
