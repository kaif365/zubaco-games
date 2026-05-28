export const ROUTES = {
  HOME: '/',
  GAME: '/game',
  NOT_FOUND: '/404',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
