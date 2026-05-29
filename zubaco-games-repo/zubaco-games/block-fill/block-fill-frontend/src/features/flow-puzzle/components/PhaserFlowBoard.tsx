import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { FlowPuzzleLevel, FlowSessionState, GridCoord } from '@/features/flow-puzzle/types';
import type { FlowBoardSceneController } from '@/features/flow-puzzle/phaser/types';
import { getLevelCols, getLevelRows } from '@/features/flow-puzzle/utils/levelGrid';

interface PhaserFlowBoardProps {
  level: FlowPuzzleLevel;
  session: FlowSessionState;
  disabled?: boolean;
  onBeginPath: (coord: GridCoord) => void;
  onDragPath: (coord: GridCoord) => void;
  onEndPath: () => void;
}

const MAX_BOARD_SIZE_PX = 672;

const SHARED_BOARD_STYLE: CSSProperties = {
  borderRadius: '9px',
  boxShadow: '0px 0px 60px 0px color-mix(in srgb, var(--stage-eclipse), transparent 70%)',
};

function getViewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  };
}

export function PhaserFlowBoard({
  level,
  session,
  disabled = false,
  onBeginPath,
  onDragPath,
  onEndPath,
}: PhaserFlowBoardProps) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<FlowBoardSceneController | null>(null);
  const callbacksRef = useRef({ onBeginPath, onDragPath, onEndPath });
  const [ready, setReady] = useState(false);
  const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    callbacksRef.current = { onBeginPath, onDragPath, onEndPath };
  }, [onBeginPath, onDragPath, onEndPath]);
  const rows = Math.max(1, getLevelRows(level));
  const cols = Math.max(1, getLevelCols(level));
  const boardAspectRatio = cols / rows;

  const boardStyle = useMemo<CSSProperties>(() => {
    if (availableSize.width <= 0 || availableSize.height <= 0) {
      return {
        aspectRatio: `${cols}/${rows}`,
        width: 'min(100%, 42rem)',
        ...SHARED_BOARD_STYLE,
      };
    }

    const widthFromHeight = availableSize.height * boardAspectRatio;
    const boardWidth = Math.max(1, Math.min(availableSize.width, MAX_BOARD_SIZE_PX, widthFromHeight));
    const boardHeight = Math.max(1, boardWidth / boardAspectRatio);

    return {
      height: `${boardHeight}px`,
      width: `${boardWidth}px`,
      ...SHARED_BOARD_STYLE,
    };
  }, [availableSize.height, availableSize.width, boardAspectRatio, cols, rows]);

  useEffect(() => {
    let cancelled = false;

    async function mountGame() {
      if (!containerRef.current) {
        return;
      }

      const { createFlowPuzzleGame } =
        await import('@/features/flow-puzzle/phaser/createFlowPuzzleGame');
      if (cancelled || !containerRef.current) {
        return;
      }

      controllerRef.current = createFlowPuzzleGame(
        containerRef.current,
        { level, session, disabled },
        {
          onBeginPath: (coord) => callbacksRef.current.onBeginPath(coord),
          onDragPath: (coord) => callbacksRef.current.onDragPath(coord),
          onEndPath: () => callbacksRef.current.onEndPath(),
        },
      );

      setReady(true);
    }

    void mountGame();

    return () => {
      cancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
    // Mount Phaser once; `sync` effect below applies level/session/disabled updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, []);

  useEffect(() => {
    controllerRef.current?.sync({ level, session, disabled });
  }, [disabled, level, session]);

  useEffect(() => {
    if (!slotRef.current) {
      return;
    }

    const measure = () => {
      const slot = slotRef.current;
      if (!slot) {
        return;
      }

      const slotRect = slot.getBoundingClientRect();
      const viewport = getViewportSize();
      const nextWidth = Math.floor(
        Math.max(0, Math.min(slotRect.width, viewport.width * 0.9 || slotRect.width)),
      );
      const nextHeight = Math.floor(Math.max(0, slotRect.height));

      setAvailableSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight },
      );
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      measure();
    });

    observer.observe(slotRef.current);
    measure();

    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      controllerRef.current?.resize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={slotRef}
      className="relative mx-auto flex h-full min-h-0 w-full items-center justify-center"
    >
      <div className="relative" style={boardStyle}>
        <div ref={containerRef} className="h-full w-full" data-testid="phaser-flow-board" />
      </div>
      {!ready ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs uppercase text-white">
          Loading board
        </div>
      ) : null}
    </div>
  );
}
