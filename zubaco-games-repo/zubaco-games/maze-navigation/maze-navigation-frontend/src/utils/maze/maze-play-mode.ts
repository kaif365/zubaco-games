/** How the maze session is loaded; API wiring will branch on this without string literals. */
export enum MazePlayMode {
  Demo = 0,
  Game = 1,
}

export function isMazePlayModeDemo(mode: MazePlayMode): boolean {
  return mode === MazePlayMode.Demo;
}

export function isMazePlayModeGame(mode: MazePlayMode): boolean {
  return mode === MazePlayMode.Game;
}
