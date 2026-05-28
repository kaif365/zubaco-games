export interface ParentReadyMessage {
  type: 'GAME_EMBED_READY'
  payload: { version: string }
}
export interface ParentResizeMessage {
  type: 'GAME_EMBED_RESIZE'
  payload: { width: number; height: number }
}
export interface ParentScoreMessage {
  type: 'GAME_EMBED_SCORE_UPDATE'
  payload: { score: number; level: number; lives: number }
}

export type ParentOutboundMessage = ParentReadyMessage | ParentResizeMessage | ParentScoreMessage
