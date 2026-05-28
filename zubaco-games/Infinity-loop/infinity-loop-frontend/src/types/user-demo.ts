export interface UserDemoLevel {
  levelId: string;
  levelName: string;
  boardCount: number;
}

export interface UserDemoData {
  stageId: string;
  enableDemo: boolean;
  timeLimit: number;
  isEnabled: boolean;
  levels: UserDemoLevel[];
}

export interface UserDemoResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: UserDemoData;
}
