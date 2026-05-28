export type StageContentPointType = "ORDERED" | "UNORDERED";

export interface StageContentPoint {
  title: string;
  description: string;
}

export interface StageContentPage {
  title: string;
  description: string;
  points: StageContentPoint[];
  point_type: StageContentPointType;
  visible_in_app?: boolean;
}

export interface StageContentInner {
  pages: StageContentPage[];
  play_now_button?: string;
  learn_how_to_play?: string;
  game_title?: string;
}

export interface StageContentSection {
  id: string;
  game_id: string;
  stage_id: string;
  language: string;
  content: StageContentInner;
}

export interface StageContentData {
  game_id?: string;
  stage_id?: string;
  game_index?: number;
  content_section: StageContentSection | null;
}
