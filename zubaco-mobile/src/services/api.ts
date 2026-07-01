import { SecureStorage } from './secureStorage';

const BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.zubaco.com/api/v1';

// ─── Response contracts (mirror zubaco-platform DTOs) ───────────

export interface WalletData {
  id: string;
  user_id: string;
  balance: string;
  bonus_balance: string;
  currency: string;
  kyc_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'ENTRY_FEE'
  | 'PRIZE_WIN'
  | 'REFERRAL_BONUS'
  | 'REFUND'
  | 'TDS_DEDUCTION'
  | 'GST';

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: string;
  balance_after: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface TransactionsPage {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface WithdrawalInit {
  withdrawal_id: string;
  message: string;
}

export interface WithdrawalResult {
  new_balance: number;
  withdrawal_amount: number;
  tds_deducted: number;
  net_payout: number;
  status: string;
}

export interface DepositOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  idempotent_replay?: boolean;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface NotificationsPage {
  notifications: AppNotification[];
  total: number;
  unread_count: number;
  page: number;
}

export interface EnergyData {
  current_lives: number;
  max_lives: number;
  bonus_lives: number;
  total_available: number;
  next_recharge_in_ms: number | null;
  full_recharge_at: string | null;
}

export interface GameProgressData {
  current_level: number;
  highest_level: number;
  total_plays: number;
  best_score: number;
  levels: Array<{ level: number; stars: number; best_score: number; completed: boolean }>;
}

export type AllProgress = Record<string, GameProgressData>;

export interface StartLevelResult {
  session_id: string;
  server_seed: string;
  config: Record<string, unknown>;
  level: number;
}

// ─── Tournament ─────────────────────────────────────────────────

export type SeasonStatus = 'UPCOMING' | 'REGISTRATION' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type StageStatus = 'LOCKED' | 'OPEN' | 'CLOSED' | 'ELIMINATED';
export type EntryStatus = 'ACTIVE' | 'ELIMINATED' | 'WINNER' | 'WITHDRAWN';
export type SessionOutcome = 'COMPLETED' | 'ABANDONED' | 'TIMED_OUT' | 'DISQUALIFIED';

export interface StageGame {
  id: string;
  season_stage_id: string;
  game_type: string;
  game_order: number;
  level_config_id: string | null;
}

export interface SeasonStage {
  id: string;
  season_id: string;
  stage_number: number;
  name: string | null;
  open_date: string;
  close_date: string;
  elimination_pct: number;
  status: StageStatus;
  stage_games?: StageGame[];
}

export interface Season {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: SeasonStatus;
  prize_pool: string | null;
  entry_fee: string | null;
  max_players: number | null;
  registration_weeks: number;
  bucketing_stage: number;
  stages?: SeasonStage[];
  _count?: { entries: number };
}

export interface RegisterResult {
  entry_id: string;
  season: string;
  cohort: string | null;
  registration_week: number;
}

export interface StageEntrySession {
  id: string;
  game_type: string;
  score: number | null;
  duration_ms: number | null;
  outcome: SessionOutcome | null;
}

export interface StageEntry {
  id: string;
  season_entry_id: string;
  season_stage_id: string;
  total_score: number;
  total_time_ms: number;
  games_played: number;
  rank: number | null;
  eliminated: boolean;
  completed_at: string | null;
  season_stage: SeasonStage;
  game_sessions: StageEntrySession[];
}

export interface SeasonStatusResult {
  status: EntryStatus;
  season: Season;
  stages: StageEntry[];
}

export interface StartTournamentResult {
  session_id: string;
  game_type: string;
  server_seed: string;
  config: Record<string, unknown>;
}

export interface SubmitTournamentResult {
  score: number;
  total_score: number;
}

// ─── Leaderboard ────────────────────────────────────────────────

export interface LeaderboardUser {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  user: LeaderboardUser;
  score?: number;
  highest_level?: number;
  is_me?: boolean;
}

export interface MyRank {
  rank: number | null;
  score: number | null;
}

// ─── User / Auth ────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  age_verified: boolean;
  is_verified: boolean;
  state: string | null;
  xp: number;
  level: number;
  created_at: string;
  wallet?: { balance: string; bonus_balance: string; currency: string } | null;
}

export interface AuthUser {
  id: string;
  username?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  xp: number;
  level: number;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export type DevicePlatform = 'ANDROID' | 'IOS';

class ApiClient {
  private token: string | null = null;
  // Single-flight refresh: concurrent 401s share ONE refresh round-trip.
  private refreshPromise: Promise<string | null> | null = null;
  // Invoked when the session cannot be recovered (refresh failed / no refresh
  // token). AuthContext wires this to a full logout + navigation reset.
  private onSessionExpired: (() => void) | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  /** Register a callback fired when the session is irrecoverably expired. */
  setOnSessionExpired(cb: (() => void) | null) {
    this.onSessionExpired = cb;
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * De-duplicated so a burst of 401s triggers only a single /auth/refresh call.
   * Returns the new access token, or null when refresh is impossible.
   */
  private tryRefresh(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const refreshToken = await SecureStorage.getRefreshToken();
          if (!refreshToken) return null;
          const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (!res.ok) return null;
          const data = (await res.json()) as { accessToken: string; refreshToken: string };
          await SecureStorage.setTokens(data.accessToken, data.refreshToken);
          this.token = data.accessToken;
          return data.accessToken;
        } catch {
          return null;
        }
      })();
      // Clear the in-flight marker once settled so future 401s can refresh again.
      this.refreshPromise.finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Auth endpoints must never trigger the refresh interceptor (avoids loops).
    const isAuthEndpoint = endpoint.startsWith('/auth/');

    const doFetch = (bearer: string | null): Promise<Response> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
      return fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    };

    let response = await doFetch(this.token);

    // Global unauthorized handling: try one silent refresh + retry.
    if (response.status === 401 && !isAuthEndpoint) {
      const newToken = await this.tryRefresh();
      if (newToken) {
        response = await doFetch(newToken);
      }
      if (response.status === 401) {
        // Refresh failed or retry still unauthorized → session is dead.
        this.onSessionExpired?.();
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    // 204 No Content etc. — guard against empty bodies.
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  // ─── Auth ─────────────────────────────────────────────────────

  sendOtp(phone: string) {
    return this.request('/auth/otp/send', { method: 'POST', body: JSON.stringify({ phone }) });
  }

  verifyOtp(phone: string, otp: string, device_id?: string) {
    return this.request<AuthResult>(
      '/auth/otp/verify',
      { method: 'POST', body: JSON.stringify({ phone, otp, device_id }) },
    );
  }

  // Backend verifies the Google ID token server-side (POST /auth/google).
  googleLogin(idToken: string) {
    return this.request<AuthResult>(
      '/auth/google',
      { method: 'POST', body: JSON.stringify({ id_token: idToken }) },
    );
  }

  // Backend verifies the Apple identity token server-side (POST /auth/apple).
  appleLogin(identityToken: string, name?: string) {
    return this.request<AuthResult>(
      '/auth/apple',
      { method: 'POST', body: JSON.stringify({ identity_token: identityToken, name }) },
    );
  }

  refreshTokens(refreshToken: string) {
    return this.request<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) },
    );
  }

  logout(refreshToken: string) {
    return this.request('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
  }

  logoutAll() {
    return this.request('/auth/logout-all', { method: 'POST' });
  }

  // ─── User ─────────────────────────────────────────────────────

  getProfile() {
    return this.request<UserProfile>('/users/me');
  }

  updateProfile(data: { username?: string; display_name?: string; avatar_url?: string }) {
    return this.request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
  }

  // Soft-deletes / anonymizes the account server-side (DELETE /users/me).
  deleteAccount() {
    return this.request<{ message: string }>('/users/me', { method: 'DELETE' });
  }

  getStats() {
    return this.request('/users/me/stats');
  }

  getHistory(page = 1) {
    return this.request(`/users/me/history?page=${page}`);
  }

  // ─── Free Play ────────────────────────────────────────────────

  getEnergy() {
    return this.request<EnergyData>('/free-play/energy');
  }

  getAllProgress() {
    return this.request<AllProgress>('/free-play/progress');
  }

  getGameProgress(gameType: string) {
    return this.request<GameProgressData>(`/free-play/progress/${gameType}`);
  }

  startLevel(gameType: string, level: number) {
    return this.request<StartLevelResult>(
      '/free-play/start',
      { method: 'POST', body: JSON.stringify({ game_type: gameType, level }) },
    );
  }

  submitFreePlayResult(sessionId: string, score: number, durationMs: number) {
    return this.request('/free-play/submit', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, score, duration_ms: durationMs }),
    });
  }

  // ─── Tournament ───────────────────────────────────────────────

  getActiveSeasons() {
    return this.request<Season[]>('/tournament/seasons');
  }

  registerForSeason(seasonId: string) {
    return this.request<RegisterResult>(`/tournament/seasons/${seasonId}/register`, { method: 'POST' });
  }

  getSeasonStatus(seasonId: string) {
    return this.request<SeasonStatusResult>(`/tournament/seasons/${seasonId}/status`);
  }

  startTournamentGame(seasonId: string, stageNumber: number, gameOrder: number) {
    return this.request<StartTournamentResult>(
      `/tournament/seasons/${seasonId}/stages/${stageNumber}/games/${gameOrder}/start`,
      { method: 'POST' },
    );
  }

  submitTournamentResult(sessionId: string, score: number, durationMs: number) {
    return this.request<SubmitTournamentResult>('/tournament/submit', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, score, duration_ms: durationMs }),
    });
  }

  // ─── Leaderboard ──────────────────────────────────────────────

  getGameLeaderboard(gameType: string, page = 1) {
    return this.request<LeaderboardEntry[]>(`/leaderboard/game/${gameType}?page=${page}`);
  }

  getMyRank(gameType: string) {
    return this.request<MyRank>(`/leaderboard/game/${gameType}/me`);
  }

  getFriendsLeaderboard(gameType: string) {
    return this.request<LeaderboardEntry[]>(`/leaderboard/game/${gameType}/friends`);
  }

  submitChallengeScore(challengeId: string, sessionId: string, score: number) {
    return this.request(`/social/challenges/${challengeId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, score }),
    });
  }

  // ─── Wallet ───────────────────────────────────────────────────

  getWallet() {
    return this.request<WalletData>('/wallet');
  }

  getTransactions(page = 1) {
    return this.request<TransactionsPage>(`/wallet/transactions?page=${page}`);
  }

  // Two-step withdrawal: initiate (sends OTP) then confirm.
  requestWithdrawal(amount: number) {
    return this.request<WithdrawalInit>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  confirmWithdrawal(withdrawalId: string, otp: string) {
    return this.request<WithdrawalResult>('/wallet/withdraw/confirm', {
      method: 'POST',
      body: JSON.stringify({ withdrawal_id: withdrawalId, otp }),
    });
  }

  createDepositOrder(amount: number) {
    return this.request<DepositOrder>('/wallet/deposit/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  verifyDeposit(orderId: string, paymentId: string, signature: string) {
    return this.request('/wallet/deposit/verify', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, payment_id: paymentId, signature }),
    });
  }

  // ─── Social ───────────────────────────────────────────────────

  getFriends() {
    return this.request('/social/friends');
  }

  sendFriendRequest(username: string) {
    return this.request('/social/friends/request', { method: 'POST', body: JSON.stringify({ username }) });
  }

  getReferralCode() {
    return this.request<{ code: string }>('/social/referral/code');
  }

  applyReferralCode(code: string) {
    return this.request<{ message: string }>('/social/referral/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // ─── Notifications ────────────────────────────────────────────

  getNotifications(page = 1) {
    return this.request<NotificationsPage>(`/notifications?page=${page}`);
  }

  markNotificationRead(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
  }

  markAllNotificationsRead() {
    return this.request<{ success: boolean }>('/notifications/read-all', { method: 'POST' });
  }

  // Registers this device's push token so the backend can target it.
  registerPushToken(deviceId: string, pushToken: string, platform: DevicePlatform) {
    return this.request('/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, push_token: pushToken, platform }),
    });
  }
}

export const api = new ApiClient();
