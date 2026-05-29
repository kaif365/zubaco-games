/**
 * Leaderboard engine.
 * In-memory sorted structure for fast rank lookups.
 * In production, backed by Redis sorted sets or DB queries.
 */

export interface LeaderboardEntry {
  userId: string;
  score: number;
  rank: number;
  achievedAt: string;
}

export interface LeaderboardConfig {
  maxEntries: number;
  timeWindowMs: number | null; // null = all-time
}

const DEFAULT_CONFIG: LeaderboardConfig = {
  maxEntries: 100,
  timeWindowMs: null,
};

export class Leaderboard {
  private entries: LeaderboardEntry[] = [];
  private readonly config: LeaderboardConfig;

  constructor(config: Partial<LeaderboardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  submit(userId: string, score: number): { rank: number; isNewHigh: boolean } {
    const existing = this.entries.find((e) => e.userId === userId);
    const isNewHigh = !existing || score > existing.score;

    if (isNewHigh) {
      this.entries = this.entries.filter((e) => e.userId !== userId);
      this.entries.push({ userId, score, rank: 0, achievedAt: new Date().toISOString() });
      this.entries.sort((a, b) => b.score - a.score);
      this.entries = this.entries.slice(0, this.config.maxEntries);
      this.rerank();
    }

    const rank = this.entries.findIndex((e) => e.userId === userId) + 1;
    return { rank: rank || this.entries.length + 1, isNewHigh };
  }

  getTop(count: number = 10): LeaderboardEntry[] {
    return this.entries.slice(0, count);
  }

  getRank(userId: string): LeaderboardEntry | null {
    return this.entries.find((e) => e.userId === userId) || null;
  }

  getAroundUser(userId: string, range: number = 2): LeaderboardEntry[] {
    const idx = this.entries.findIndex((e) => e.userId === userId);
    if (idx === -1) return this.getTop(5);
    const start = Math.max(0, idx - range);
    const end = Math.min(this.entries.length, idx + range + 1);
    return this.entries.slice(start, end);
  }

  private rerank() {
    this.entries.forEach((e, i) => (e.rank = i + 1));
  }
}
