export const appConfig = {
  appName: "ZUBACO Games",
  version: "1.0.0",
  env: "test",
  api: {
    baseUrl: "",
    timeout: 10000,
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
