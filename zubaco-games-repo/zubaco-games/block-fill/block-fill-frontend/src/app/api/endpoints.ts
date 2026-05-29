export const API_ENDPOINTS = {
  userAuth: {
    devSession: '/user/auth/dev-session',
  },
  user: {
    demoLevels: '/v1/user/demo',
  },
  game: {
    gameConfigs: '/game/session/game-configs',
    startSession: '/game/session/start',
    nextBoard: '/game/session/next-board',
    saveProgress: '/game/session/save-progress',
    completeBoard: '/game/session/complete-board',
    gameEnd: '/game/session/game-end',
    timeSync: '/game/session/time-sync',
  },
} as const;
