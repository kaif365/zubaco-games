import * as Phaser from 'phaser';
import { FlowPuzzleScene } from '@/features/flow-puzzle/phaser/scenes/FlowPuzzleScene';
import type {
  FlowBoardExternalState,
  FlowBoardSceneCallbacks,
  FlowBoardSceneController,
} from '@/features/flow-puzzle/phaser/types';

export function createFlowPuzzleGame(
  container: HTMLDivElement,
  initialState: FlowBoardExternalState,
  callbacks: FlowBoardSceneCallbacks,
): FlowBoardSceneController {
  const scene = new FlowPuzzleScene(callbacks);
  const dpr = window.devicePixelRatio || 1;
  const initialWidth = Math.max(Math.floor(container.clientWidth * dpr), 1);
  const initialHeight = Math.max(Math.floor(container.clientHeight * dpr), 1);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: initialWidth,
    height: initialHeight,
    backgroundColor: 'rgba(0,0,0,0)',
    transparent: true,
    antialias: true,        
    antialiasGL: true,      
    pixelArt: false,       
    roundPixels: false,  
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: initialWidth,
      height: initialHeight,
      zoom: 1 / (window.devicePixelRatio || 1),
    },
    scene: [scene],
    fps: {
      target: 60,
      forceSetTimeOut: true,
    },
    audio: {
      noAudio: true,
    },
  });

  scene.setBoardState(initialState);

  return {
    destroy: () => {
      scene.shutdownScene();
      game.destroy(true);
    },
    resize: (width, height) => {
      const dpr = window.devicePixelRatio || 1;
      scene.setBoardSize(
        Math.max(Math.floor(width * dpr), 1),
        Math.max(Math.floor(height * dpr), 1),
      );
    },
    sync: (state) => {
      scene.setBoardState(state);
    },
  };
}
