/** Backend or route `stage-id` (opaque string, e.g. UUID or `"1"`). */
export type StageId = string;

export type StageThemeKey = "1" | "2" | "3" | "4" | "5" | "6" | "7";

export interface StageThemeColor {
  background: string;
  eclipse: string;
  resultAccent: string;
}
