export const API_BASE = import.meta.env.VITE_API_BASE_URL;
export const DEV_SESSION_URL = import.meta.env.VITE_DEV_SESSION_URL;
export const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;
export const IS_ENCRYPTION_ENABLED =
  import.meta.env.VITE_ENABLE_ENCRYPTION !== "false";
export const REQUEST_TIMEOUT_MS = 10_000;

export const DEFAULT_STAGE_ID = "66a93591-6abc-49b3-afcf-036962beb834";
export const DEFAULT_LEVEL_ID = DEFAULT_STAGE_ID;
export const GENERATED_BOARD_GRID_X = Number(
  import.meta.env.VITE_GENERATED_BOARD_GRID_X ?? 50,
);
export const GENERATED_BOARD_GRID_Y = Number(
  import.meta.env.VITE_GENERATED_BOARD_GRID_Y ?? 50,
);
export const GENERATED_BOARD_TOKEN = "";
