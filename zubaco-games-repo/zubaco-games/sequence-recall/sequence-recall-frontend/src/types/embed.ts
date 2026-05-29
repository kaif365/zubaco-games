export interface ParentReadyMessage {
  type: 'SEQUENCE_RECALL_READY';
  payload: { version: string };
}
export interface ParentResizeMessage {
  type: 'SEQUENCE_RECALL_RESIZE';
  payload: { width: number; height: number };
}
export interface ParentScoreMessage {
  type: 'SEQUENCE_RECALL_SCORE_UPDATE';
  payload: { score: number; level: number; lives: number };
}

export type ParentOutboundMessage = ParentReadyMessage | ParentResizeMessage | ParentScoreMessage;
