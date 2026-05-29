export const paths = {
  home: "/",
  demo: "/demo",
  game: "/game",
  results: "/result",
} as const;

export type AppRoute = (typeof paths)[keyof typeof paths];
