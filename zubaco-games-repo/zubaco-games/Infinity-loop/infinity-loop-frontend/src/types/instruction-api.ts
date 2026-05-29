/** Mirrors backend instruction payload; static JSON and future API use the same shape. */

export type InstructionApiLanguage = "EN" | "HI";

export type InstructionPointType = "ORDERED" | "UNORDERED";

export interface InstructionPoint {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
}

export interface InstructionPage {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly pointType: InstructionPointType;
  readonly points: InstructionPoint[];
}

export interface InstructionContentPayload {
  readonly language?: InstructionApiLanguage;
  readonly gameLabel: string;
  readonly statusLabel: string;
  readonly gameTitle: string;
  /** Short subtitle shown under the main title in the header (CMS optional). */
  readonly headerTagline?: string;
  readonly pages: InstructionPage[];
  readonly playNowButton: string;
  readonly learnHowToPlay: string;
}
