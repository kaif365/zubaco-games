import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { appConfig } from '@/app/config/appConfig';
import { GameClearModal } from '@/components/shared/GameClearModal';
import { isSolvedBoard, moveTile } from '@/lib/sliding-puzzle/board';
import type { DemoBoard, DemoLevel } from '@/types/sliding-puzzle';
import mandalaImage from '@micro-screens/assets/mandala-vector.png';
import { STAGE_THEME_COLORS, type StageId } from '@micro-screens/src';

import '../styles/game.css';

import GameBoard from './GameBoard';
import MemorizeOverlay from './MemorizeOverlay';
import RevealOverlay from './RevealOverlay';

interface DemoFlowProps {
  stage: StageId;
  levels: DemoLevel[];
  onComplete: () => void;
}

interface FlatDemoBoard extends DemoBoard {
  levelName: string;
}

type DemoIntroPhase = 'memorizing' | 'shuffle-animation' | 'playing';

const GATHER_START_DELAY_MS = 750;
const GATHER_TRANSITION_MS = 550;
const GATHER_SETTLE_MS = 120;
const SCATTER_TRANSITION_MS = 550;
const SCATTER_SETTLE_MS = 200;

function buildBoards(levels: DemoLevel[]): FlatDemoBoard[] {
  const flat: FlatDemoBoard[] = [];
  for (const lvl of levels)
    for (const b of lvl.boards) flat.push({ ...b, levelName: lvl.levelName });
  return flat;
}

function buildSolvedPieces(gridX: number, gridY: number): number[] {
  const total = gridX * gridY;
  return Array.from({ length: total }, (_, index) => (index === total - 1 ? -1 : index));
}


function getInitialIntroPhase(board: FlatDemoBoard): DemoIntroPhase {
  return board.displayTime > 0 ? 'memorizing' : 'shuffle-animation';
}

export default function DemoFlow({ stage, levels, onComplete }: Readonly<DemoFlowProps>) {
  const { t } = useTranslation();
  const theme = STAGE_THEME_COLORS[stage];
  const [boards] = useState<FlatDemoBoard[]>(() => buildBoards(levels));
  const [cursor, setCursor] = useState(0);
  const [pieces, setPieces] = useState<number[]>(
    boards.length > 0 ? [...boards[0].initialPieces] : [],
  );
  const [introPhase, setIntroPhase] = useState<DemoIntroPhase>(
    boards.length > 0 ? getInitialIntroPhase(boards[0]) : 'playing',
  );
  const [introShufflePieces, setIntroShufflePieces] = useState<number[] | null>(null);
  const [gatherToCenter, setGatherToCenter] = useState(false);
  const [showBlankImage, setShowBlankImage] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const solveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (boards.length === 0) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (solveTimerRef.current) clearTimeout(solveTimerRef.current);
    },
    [],
  );

  const currentBoard = cursor >= 0 && cursor < boards.length ? boards[cursor] : null;

  useEffect(() => {
    if (introPhase !== 'shuffle-animation' || !currentBoard) {
      if (introPhase !== 'shuffle-animation') {
        setIntroShufflePieces(null);
        setGatherToCenter(false);
        setShowBlankImage(false);
      }
      return;
    }

    const { gridSize } = currentBoard;
    const solvedPieces = buildSolvedPieces(gridSize.x, gridSize.y);
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    setIntroShufflePieces(solvedPieces);
    setGatherToCenter(false);
    setShowBlankImage(true);

    const scatterAt = GATHER_START_DELAY_MS + GATHER_TRANSITION_MS + GATHER_SETTLE_MS;
    const completeAt = scatterAt + SCATTER_TRANSITION_MS + SCATTER_SETTLE_MS;

    timers.push(
      setTimeout(() => { setGatherToCenter(true); }, GATHER_START_DELAY_MS),
      setTimeout(() => { setGatherToCenter(false); setIntroShufflePieces(pieces); setShowBlankImage(false); }, scatterAt),
      setTimeout(() => { setIntroPhase('playing'); }, completeAt),
    );

    return () => {
      timers.forEach((timer) => { clearTimeout(timer); });
    };
  }, [currentBoard, introPhase, pieces]);

  const advanceToNext = useCallback(() => {
    const next = cursor + 1;
    if (next >= boards.length) {
      onComplete();
      return;
    }
    const nb = boards[next];
    setCursor(next);
    setPieces([...nb.initialPieces]);
    setIsSolved(false);
    setIsRevealing(false);
    setIntroPhase(getInitialIntroPhase(nb));
  }, [boards, cursor, onComplete]);

  const handleTileClick = useCallback(
    (slot: number) => {
      if (isSolved || introPhase !== 'playing' || !currentBoard) return;
      const result = moveTile(pieces, slot, currentBoard.gridSize.x);
      if (!result.moved) return;
      setPieces(result.board);
      if (isSolvedBoard(result.board)) {
        setIsSolved(true);
        setIsRevealing(true);
      }
    },
    [currentBoard, introPhase, isSolved, pieces],
  );

  const autoSolve = useCallback(() => {
    const n = pieces.length;
    const columns = currentBoard?.gridSize.x ?? 0;
    const nextPieces = Array.from({ length: n }, (_, i) => (i === n - 1 ? -1 : i));

    // To leave exactly 3 moves left, we perform 3 valid "backwards" swaps.
    // Path: n-1 (Start) -> n-2 (Left) -> n-2-cols (Up) -> n-1-cols (Right)
    if (n >= columns * 2 && columns >= 2) {
      const i1 = n - 1;
      const i2 = n - 2;
      const i3 = i2 - columns;
      const i4 = i3 + 1;

      [nextPieces[i1], nextPieces[i2]] = [nextPieces[i2], nextPieces[i1]];
      [nextPieces[i2], nextPieces[i3]] = [nextPieces[i3], nextPieces[i2]];
      [nextPieces[i3], nextPieces[i4]] = [nextPieces[i4], nextPieces[i3]];
    } else if (n >= 2) {
      [nextPieces[n - 1], nextPieces[n - 2]] = [nextPieces[n - 2], nextPieces[n - 1]];
    }

    setPieces(nextPieces);
    // We no longer automatically trigger the solved state or the next board timer.
    // The user must click the last tile manually.
  }, [currentBoard?.gridSize.x, pieces.length]);

  if (!currentBoard) return null;

  const boardObj = {
    sessionBoardId: '',
    id: currentBoard.id,
    roundNumber: cursor + 1,
    gridSize: currentBoard.gridSize,
    fullImageUrl: currentBoard.fullImageUrl,
    displayTime: currentBoard.displayTime,
    pieces: currentBoard.initialPieces,
  };

  const isLastBoard = cursor + 1 >= boards.length;
  const isMemorizing = introPhase === 'memorizing';
  const isShuffleAnimation = introPhase === 'shuffle-animation';
  const solvedPieces = buildSolvedPieces(currentBoard.gridSize.x, currentBoard.gridSize.y);
  const boardDisplayPieces =
    isMemorizing
      ? solvedPieces
      : isShuffleAnimation
        ? (introShufflePieces ?? solvedPieces)
        : pieces;

  return (
    <main className="puzzle-shell flex flex-col h-screen overflow-hidden select-none">
      <div className="background-layer" style={{ backgroundImage: `url(${mandalaImage})` }} />
      <div
        className="puzzle-shell__top-glow"
        style={{
          background: `linear-gradient(${theme.eclipse}, ${theme.eclipse}52)`,
          boxShadow: `0 0 108px ${theme.eclipse}b8`,
        }}
      />

      <div className="h-[100dvh] flex flex-col justify-between py-5">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="puzzle-header">
          {/* Left: "Demo" label with pulsing dot */}
          <div className="puzzle-demo-label">{t('game.demo')}</div>

          {/* Right: "Done" skip pill — same look as the timer badge */}
          <button
            type="button"
            className="puzzle-demo-skip"
            onClick={onComplete}
            aria-label="Skip demo"
          >
            <span className="puzzle-demo-skip__inner">{t('game.done')}</span>
          </button>
        </header>

        {/* ── Playfield ──────────────────────────────────────────────────── */}
        <div className="puzzle-playfield flex-1 relative">
          {/* Board */}
          <div className="absolute inset-0 flex items-center justify-center px-4 pb-16">
            <div
              style={{
                width: '100%',
                maxWidth: '420px',
                aspectRatio: `${String(currentBoard.gridSize.x)} / ${String(currentBoard.gridSize.y)}`,
                maxHeight: '100%',
              }}
            >
              <div className="puzzle-board-card" style={{ height: '100%' }}>
                <GameBoard
                  board={boardObj}
                  pieces={boardDisplayPieces}
                  disabled={
                    isSolved ||
                    isMemorizing ||
                    isShuffleAnimation ||
                    isRevealing
                  }
                  isSolved={isSolved}
                  shuffleMode={isShuffleAnimation}
                  gatherToCenter={gatherToCenter}
                  showBlankImage={showBlankImage}
                  revealMode={isMemorizing}
                  onTileClick={handleTileClick}
                />

                {isMemorizing && (
                  <MemorizeOverlay
                    fullImageUrl={currentBoard.fullImageUrl}
                    gridX={currentBoard.gridSize.x}
                    gridY={currentBoard.gridSize.y}
                    displayTime={currentBoard.displayTime}
                    onComplete={() => {
                      setIntroPhase('shuffle-animation');
                    }}
                  />
                )}

                {isRevealing && (
                  <RevealOverlay
                    fullImageUrl={currentBoard.fullImageUrl}
                    gridX={currentBoard.gridSize.x}
                    gridY={currentBoard.gridSize.y}
                    onComplete={() => {
                      if (isLastBoard) {
                        // Keep isRevealing true so the full image stays visible
                        // behind the completion alert throughout the countdown.
                        setShowCompletionModal(true);
                      } else {
                        // Don't clear isRevealing here — advanceToNext does it,
                        // so the full image stays visible for the whole 1200ms pause.
                        solveTimerRef.current = setTimeout(advanceToNext, 1200);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Board progress dots */}
          <div className="puzzle-round-dots" aria-label="Demo progress">
            {boards.map((_, i) => {
              let modifier = '';
              if (i < cursor) modifier = 'puzzle-round-dot--done';
              else if (i === cursor) modifier = 'puzzle-round-dot--current';
              return (
                <span key={i} className={`puzzle-round-dot${modifier ? ` ${modifier}` : ''}`} />
              );
            })}
          </div>

          {/* Hint banner */}
          {introPhase === 'playing' && !isSolved && (
            <div className="puzzle-hint-banner">{t('game.hintBanner')}</div>
          )}
        </div>

        {/* ── Dev auto-solve ──────────────────────────────────────────────── */}
        {appConfig.features.devtools && introPhase === 'playing' && !isSolved && (
          <div className="puzzle-bottom-bar">
            <button type="button" className="puzzle-btn-ghost" onClick={autoSolve}>
              {t('game.autoSolve')}
            </button>
          </div>
        )}
      </div>

      {showCompletionModal && (
        <GameClearModal
          title={t('game.demoCleared')}
          accentColor={theme.resultAccent}
          eclipseColor={theme.eclipse}
          onConfirm={onComplete}
        />
      )}
    </main>
  );
}
