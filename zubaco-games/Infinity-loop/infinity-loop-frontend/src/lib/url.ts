import { TRAILING_SLASHES_REGEX } from "@/regex";

export const sanitizeBaseUrl = (url: string): string =>
  url.trim().replace(TRAILING_SLASHES_REGEX, "");
