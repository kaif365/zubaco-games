/** Raw admin stage-content API (`ADMIN_GAMES_STAGE_CONTENT`) payload shape. */

export interface StageContentApiPage {
  readonly title: string;
  readonly points: ReadonlyArray<{
    readonly title: string;
    readonly description: string;
  }>;
  readonly point_type: "ORDERED" | "UNORDERED";
  readonly description: string;
  readonly visible_in_app?: boolean;
}

export interface StageContentApiInnerContent {
  readonly pages: StageContentApiPage[];
  readonly play_now_button: string;
  readonly learn_how_to_play: string;
  readonly game_title?: string;
  readonly game_tagline?: string;
}

export interface StageContentApiSection {
  readonly language: string;
  readonly content: StageContentApiInnerContent;
}

export interface StageContentApiData {
  readonly game_id?: string;
  readonly stage_id?: string;
  readonly game_index?: number;
  readonly content_section?: StageContentApiSection | null;
}
