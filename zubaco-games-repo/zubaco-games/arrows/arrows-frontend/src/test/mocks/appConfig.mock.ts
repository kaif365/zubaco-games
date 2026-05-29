export const appConfig = {
  appName: "Test App",
  version: "0.0.0",
  env: "test",
  api: {
    baseUrl: "http://localhost:3000",
    timeout: 5000,
  },
  features: {
    devtools: false,
    analytics: false,
    encryption: true,
  },
  analytics: {
    id: "",
  },
} as const;

export type AppConfig = typeof appConfig;
