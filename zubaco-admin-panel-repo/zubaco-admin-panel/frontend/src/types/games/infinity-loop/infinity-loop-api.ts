export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface GeneratePuzzleQuery {
  rows?: number;
  cols?: number;
  difficulty?: "easy" | "medium" | "hard";
  limit?: number;
}

export interface GeneratePuzzleItem {
  seed: string;
  difficulty: "easy" | "medium" | "hard";
  rows: number;
  cols: number;
  solvedGrid: number[][];
  scrambledGrid: number[][];
}
