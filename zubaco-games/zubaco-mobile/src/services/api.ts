const BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.zubaco.com/api/v1';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ─── Auth ─────────────────────────────────────────────────────

  sendOtp(phone: string) {
    return this.request('/auth/otp/send', { method: 'POST', body: JSON.stringify({ phone }) });
  }

  verifyOtp(phone: string, otp: string, device_id?: string) {
    return this.request<{ user: any; accessToken: string; refreshToken: string }>(
      '/auth/otp/verify',
      { method: 'POST', body: JSON.stringify({ phone, otp, device_id }) },
    );
  }

  googleLogin(data: { google_id: string; email: string; name: string; picture?: string }) {
    return this.request<{ user: any; accessToken: string; refreshToken: string }>(
      '/auth/google',
      { method: 'POST', body: JSON.stringify(data) },
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

  // ─── User ─────────────────────────────────────────────────────

  getProfile() {
    return this.request<any>('/users/me');
  }

  updateProfile(data: { username?: string; display_name?: string; avatar_url?: string }) {
    return this.request('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
  }

  getStats() {
    return this.request('/users/me/stats');
  }

  getHistory(page = 1) {
    return this.request(`/users/me/history?page=${page}`);
  }

  // ─── Free Play ────────────────────────────────────────────────

  getAllProgress() {
    return this.request('/free-play/progress');
  }

  getGameProgress(gameType: string) {
    return this.request(`/free-play/progress/${gameType}`);
  }

  startLevel(gameType: string, level: number) {
    return this.request<{ session_id: string; server_seed: string; config: any }>(
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
    return this.request('/tournament/seasons');
  }

  registerForSeason(seasonId: string) {
    return this.request(`/tournament/seasons/${seasonId}/register`, { method: 'POST' });
  }

  getSeasonStatus(seasonId: string) {
    return this.request(`/tournament/seasons/${seasonId}/status`);
  }

  startTournamentGame(seasonId: string, stageNumber: number, gameOrder: number) {
    return this.request(`/tournament/seasons/${seasonId}/stages/${stageNumber}/games/${gameOrder}/start`, { method: 'POST' });
  }

  submitTournamentResult(sessionId: string, score: number, durationMs: number) {
    return this.request('/tournament/submit', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, score, duration_ms: durationMs }),
    });
  }

  // ─── Leaderboard ──────────────────────────────────────────────

  getGameLeaderboard(gameType: string, page = 1) {
    return this.request(`/leaderboard/game/${gameType}?page=${page}`);
  }

  getMyRank(gameType: string) {
    return this.request(`/leaderboard/game/${gameType}/me`);
  }

  getFriendsLeaderboard(gameType: string) {
    return this.request(`/leaderboard/game/${gameType}/friends`);
  }

  // ─── Wallet ───────────────────────────────────────────────────

  getWallet() {
    return this.request('/wallet');
  }

  getTransactions(page = 1) {
    return this.request(`/wallet/transactions?page=${page}`);
  }

  requestWithdrawal(amount: number) {
    return this.request('/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount }) });
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
    return this.request('/social/referral/apply', { method: 'POST', body: JSON.stringify({ code }) });
  }

  // ─── Notifications ────────────────────────────────────────────

  getNotifications(page = 1) {
    return this.request(`/notifications?page=${page}`);
  }

  markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'POST' });
  }
}

export const api = new ApiClient();
