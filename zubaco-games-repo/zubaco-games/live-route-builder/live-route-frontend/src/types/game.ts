export interface NodePoint { id: number; x: number; y: number; appearedAt: number; }
export interface Edge { from: number; to: number; timestamp: number; }
export interface GameState { status: 'idle' | 'playing' | 'ended'; nodes: NodePoint[]; edges: Edge[]; currentNodeIndex: number; score: number; startTime: number; }
export interface GameConfig { nodeIntervalMs: number; totalNodes: number; timeLimitMs: number; canvasWidth: number; canvasHeight: number; }
export interface StartGameResponse { gameSessionId: string; seed: number; config: GameConfig; serverTime: string; }
export interface SubmitResponse { finalScore: number; status: string; pathEfficiency: number; nodesConnected: number; }
