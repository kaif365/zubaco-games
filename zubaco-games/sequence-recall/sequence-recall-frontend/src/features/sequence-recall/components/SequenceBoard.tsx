import { useEffect, useRef, useState } from 'react';

import { useAudio } from '@/audio';
import type { SoundKey } from '@/audio/soundRegistry';
import {
  DEFAULT_TILE_LABELS,
  GameBoardFrame,
} from '@/features/sequence-recall/components/GameBoardFrame';
import { BOARD_MODE, type BoardMode, type TileId } from '@/types/game';

interface SequenceBoardProps {
  boxCount: number;
  activeTile: TileId | null;
  disabled: boolean;
  mode: BoardMode;
  isDemoMode?: boolean;
  audioType: 'piano' | 'retro';
  remainingTaps: number;
  sequenceLength: number;
  clickedSequence: TileId[];
  onInput: (tile: TileId) => void;
  inputGlowMs?: number;
  showCompletedTick?: boolean;
  overrideInstruction?: string | null;
  wrongTileId?: number | null;
}

const toneMap: Record<'piano' | 'retro', Record<number, SoundKey>> = {
  piano: {
    1: 'tileGreen',
    2: 'tileRed',
    3: 'tileBlue',
    4: 'tileYellow',
    5: 'tileBlue',
    6: 'tileYellow',
  },
  retro: {
    1: 'tileGreenRetro',
    2: 'tileRedRetro',
    3: 'tileBlueRetro',
    4: 'tileYellowRetro',
    5: 'tileBlueRetro',
    6: 'tileYellowRetro',
  },
};

/**
 * Sequence board.
 *
 * @param {SequenceBoardProps} props - Component props.
 * @param {number} props.boxCount - The box count.
 * @param {number | null} props.activeTile - The active tile.
 * @param {boolean} props.disabled - The disabled.
 * @param {"idle" | "playback" | "input"} props.mode - The mode.
 * @param {"piano" | "retro"} props.audioType - The audio type.
 * @param {number} props._remainingTaps - The remaining taps.
 * @param {number} props._sequenceLength - The sequence length.
 * @param {number[]} props._clickedSequence - The clicked sequence.
 * @param {(tile: TileId) => void} props.onInput - The on input.
 * @param {number} [props.inputGlowMs] - The input glow ms.
 * @param {boolean | undefined} props.showCompletedTick - The show completed tick.
 * @param {number | null | undefined} props.wrongTileId - The wrong tile id.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function SequenceBoard({
  boxCount,
  activeTile,
  disabled,
  mode,
  audioType,
  remainingTaps: _remainingTaps,
  sequenceLength: _sequenceLength,
  clickedSequence: _clickedSequence,
  onInput,
  inputGlowMs = 300,
  showCompletedTick,
  wrongTileId,
}: SequenceBoardProps) {
  const [inputFlashTile, setInputFlashTile] = useState<TileId | null>(null);
  const inputFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useAudio();

  useEffect(() => {
    if (mode !== BOARD_MODE.PLAYBACK || activeTile === null) return;
    const soundKey =
      toneMap[audioType][activeTile] ?? toneMap[audioType][((activeTile - 1) % 4) + 1];
    void audio.play(soundKey, { allowOverlap: true });
  }, [activeTile, audio, audioType, mode]);

  /**
   * Handles tile click.
   *
   * @param {number} tileId - The tile id.
   *
   * @returns {void} No return value.
   */
  const handleTileClick = (tileId: TileId) => {
    if (mode !== BOARD_MODE.INPUT) return;

    if (inputFlashTimerRef.current) {
      clearTimeout(inputFlashTimerRef.current);
      inputFlashTimerRef.current = null;
    }
    setInputFlashTile(tileId);
    inputFlashTimerRef.current = setTimeout(() => {
      setInputFlashTile(null);
      inputFlashTimerRef.current = null;
    }, inputGlowMs);
    void (async () => {
      await audio.unlockAudio();
      const soundKey = toneMap[audioType][tileId] ?? toneMap[audioType][((tileId - 1) % 4) + 1];
      await audio.play(soundKey, { allowOverlap: true });
    })();
    onInput(tileId);
  };

  useEffect(() => {
    return () => {
      if (inputFlashTimerRef.current) {
        clearTimeout(inputFlashTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[400px]" data-tutorial-target="board">
      <GameBoardFrame
        variant="interactive"
        boxCount={boxCount}
        tileLabels={DEFAULT_TILE_LABELS}
        disabled={disabled}
        isPlaybackActive={(tileId) => mode === BOARD_MODE.PLAYBACK && activeTile === tileId}
        isInputActive={(tileId) => inputFlashTile === tileId}
        onTileClick={handleTileClick}
        showCompletedTick={showCompletedTick}
        wrongTileId={wrongTileId}
      />
    </div>
  );
}
