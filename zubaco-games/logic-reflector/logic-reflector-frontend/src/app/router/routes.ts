export const ROUTES = {
  HOME: '/',
  NOT_FOUND: '/404',
  // DEV only — available at /editor when running with `npm run dev`
  ...(import.meta.env.DEV ? { EDITOR: '/editor' } : {}),
} as const;
