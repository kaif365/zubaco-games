export const ROUTES = {
  HOME: "/",
  EDITOR: "/editor",
  NOT_FOUND: "/404",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
