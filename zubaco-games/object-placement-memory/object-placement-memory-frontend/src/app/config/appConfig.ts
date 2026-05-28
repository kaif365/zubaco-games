export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004/v1',
  gameId: import.meta.env.VITE_GAME_ID || 'object-placement-memory',
} as const;
