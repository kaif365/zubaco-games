/** Demo card faces: SVGs in `public/demo-memory/`. Prefix with Vite `BASE_URL` for non-root deploys. */
export const DEMO_MEMORY_IMAGE_PATHS = [
  `${import.meta.env.BASE_URL}demo-memory/1.png`,
  `${import.meta.env.BASE_URL}demo-memory/2.png`,
  `${import.meta.env.BASE_URL}demo-memory/3.png`,
  `${import.meta.env.BASE_URL}demo-memory/4.png`,
] as const;
