export const ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_ENCRYPTION_KEY ??
  process.env.NEXT_PUBLIC_SESSION_STORAGE_SECRET_KEY ??
  "";

export const IS_ENCRYPTION_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_ENCRYPTION !== "false";
