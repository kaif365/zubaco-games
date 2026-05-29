"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { GamePlayArea } from "@/components/custom/game-play-area";
import { GameSectionLoading } from "@/components/custom/game-section-loading";
import { MobileGameStatsChip } from "@/components/custom/mobile-game-stats-chip";
import { GameHeader } from "@/components/organisms/game-header";
import { GameClearModal } from "@/components/organisms/game-clear-modal";
import { OfflineStatusModal } from "@/components/organisms/offline-status-modal";
import { SettingsDrawer } from "@/components/organisms/settings-drawer";
import { GameTemplate } from "@/components/templates/game-template";
import { GAME_RESULT_VARIANT } from "@/constants/game-result";
import {
  BOARD_SOLVED_TRANSITION_MS,
  FINAL_DEMO_REDIRECT_DELAY_MS,
  PENDING_ROTATION_CHECK_INTERVAL_MS,
  PENDING_ROTATION_STALE_MS,
  ROTATE_BATCH_ACK_TIMEOUT_MS,
  SOLVED_NEXT_BOARD_HOLD_MS,
  SOLVED_RESULT_REVEAL_DELAY_MS,
  TUTORIAL_LEVEL_COUNT,
} from "@/constants/game-section";
import {
  resolveDynamicMobileInsetScale,
  TILE_ROTATION_TWEEN_MS,
} from "@/constants/loop-scene";
import { SOCKET_ERROR_MESSAGES } from "@/constants/socket";
import { GAME_STAGE_STATUS } from "@/constants/status";
import { useGame } from "@/context/game-context";
import { useUser } from "@/context/user-context";
import { useAudio } from "@/hooks/use-audio";
import { useGameSocket } from "@/hooks/use-game-socket";
import { useHintController } from "@/hooks/use-hint-controller";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useStageCompleteSummary } from "@/hooks/use-stage-complete-summary";
import { hexToRgba } from "@/lib/color";
import { logger } from "@/lib/default-logger";
import { normalizeHexColor } from "@/lib/game/game-section-utils";
import { GameInstructionsScreen } from "@/section/instructions/instructions-screen";
import { GameInstructionsSkeleton } from "@/section/instructions/instructions-skeleton";
import authService from "@/services/api/auth";
import useGameStore from "@/store/game";
import { STAGE_THEME_COLORS, stageThemeKey } from "@/theme/colors";
import type { StageInstructionContentMap } from "@/types/instruction-content";
import type { GameResultVariant } from "@/types/result-content";
import { clearLegacyUrlSearchParams } from "@/utils/clear-legacy-url-search-params";
import { getEnvStageId } from "@/utils/get-env-stage-id";
import { parseSocketIoErrorMessage } from "@/utils/socket";
import Storage from "@/utils/storage";

interface GameSectionProps {
  readonly stageId: string;
  readonly phase: GameSectionPhase;
}

const GAME_SECTION_PHASE = {
  INSTRUCTIONS: "instructions",
  DEMO: "demo",
  LIVE: "live",
} as const;
const CONNECTION_ALERT_DELAY_MS = 3500;

function normalizeSocketErrorCode(
  message: string | undefined,
): string | undefined {
  const trimmed = message?.trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase();
}

interface SocketAuthErrorCallbacks {
  onAuthFailed: () => void;
  onSessionExpired: () => void;
}

function handleKnownSocketAuthErrors(
  code: string | undefined,
  callbacks: SocketAuthErrorCallbacks,
): boolean {
  if (!code) return false;
  if (code.includes(SOCKET_ERROR_MESSAGES.AUTH_FAILED)) {
    callbacks.onAuthFailed();
    return true;
  }
  if (code.includes(SOCKET_ERROR_MESSAGES.SESSION_EXPIRED)) {
    callbacks.onSessionExpired();
    return true;
  }
  return false;
}

type GameSectionPhase =
  (typeof GAME_SECTION_PHASE)[keyof typeof GAME_SECTION_PHASE];

export function GameSection({ stageId, phase }: GameSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    startGame,
    rotateGameTile,
    rotateGameTileBatch,
    onGameStarted,
    onRotateResolved,
    onAlreadyFinished,
    onGameCompleted,
    onSocketError,
    onSocketException,
    parseSocketExceptionResponse,
    parseRotateResponse,
    parseCompleteResponse,
    parseAlreadyFinishedResponse,
    isConnected,
    socket,
    disconnect,
  } = useGameSocket();
  const { token, syncTokenFromStorage } = useUser();
  const setGameResult = useGameStore((s) => s.setGameResult);
  const {
    config,
    isLoading,
    isInstructionsContentLoading,
    enableDemo,
    isPlayEnabled,
    grid,
    moves,
    tutorialRoundIndex,
    isWon,
    isTimeUp,
    hasStarted,
    timeLeftSeconds,
    rotateTile,
    revertTileRotation,
    activeBoardId,
    difficulty,
    triggerHint,
    applyGameStartedResponse,
    applyServerTimeUpFreeze,
    applyRotateResolutionMeta,
    startNextBoard,
    beginGame,
    isSettingsOpen,
    setIsSettingsOpen,
    soundEnabled,
    setSoundEnabled,
    volume,
    setVolume,
    nextLevel,
    resetToTutorialPhase,
    startNewGame,
    theme,
    hintedCells,
  } = useGame();

  const stageAccent = STAGE_THEME_COLORS[stageThemeKey(stageId)].resultAccent;
  const templateTheme = React.useMemo(
    () => ({
      ...theme,
      primary: stageAccent,
      glow: stageAccent,
      background: theme.background,
    }),
    [stageAccent, theme],
  );

  const instructionOverride = useGameStore((s) => s.instructionOverride);
  const instructionsContentByStage = React.useMemo(():
    | Partial<StageInstructionContentMap>
    | undefined => {
    const o = instructionOverride;
    if (
      !o ||
      (!o.pages?.length &&
        !o.gameLabel &&
        !o.playNowButton &&
        !o.learnHowToPlay)
    ) {
      return undefined;
    }
    return { [stageId]: o } as Partial<StageInstructionContentMap>;
  }, [instructionOverride, stageId]);

  const hasSeenWelcome = phase !== GAME_SECTION_PHASE.INSTRUCTIONS;
  const [isAwaitingStartResponse, setIsAwaitingStartResponse] =
    React.useState(false);
  const [isBootstrappingSession, setIsBootstrappingSession] =
    React.useState(false);
  const [hasStartSuccessGrid, setHasStartSuccessGrid] = React.useState(false);
  const [isRoundTransitionLoading, setIsRoundTransitionLoading] =
    React.useState(false);
  const [pendingBoardAccent, setPendingBoardAccent] = React.useState<
    string | null
  >(null);
  const [isStageCompletedModalOpen, setIsStageCompletedModalOpen] =
    React.useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = React.useState(false);
  const [isAlreadyFinishedModalActive, setIsAlreadyFinishedModalActive] =
    React.useState(false);
  const { setStageCompleteSummary, resetStageCompleteSummary } =
    useStageCompleteSummary();
  const [isSolvedHighlightActive, setIsSolvedHighlightActive] =
    React.useState(false);
  const [isBoardTransitionActive, setIsBoardTransitionActive] =
    React.useState(false);
  const [isSessionExpired, setIsSessionExpired] = React.useState(false);
  const [isConnectionAlertDelayElapsed, setIsConnectionAlertDelayElapsed] =
    React.useState(false);
  const [isPlayNavPending, startPlayNavTransition] = useTransition();
  const [isLearnNavPending, startLearnNavTransition] = useTransition();
  const [isDemoExitPending, setIsDemoExitPending] = React.useState(false);
  const [showDemoCompleteModal, setShowDemoCompleteModal] = React.useState(false);
  const isWaitingForNextLevelActionRef = useRef(false);
  const solvedModalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastStartedKeyRef = useRef<string | null>(null);
  const pendingRotationsRef = useRef<
    Array<{
      id: number;
      x: number;
      y: number;
      enqueuedAt: number;
      lastSentAt: number;
      retries: number;
      expired: boolean;
      boardId: string | null;
    }>
  >([]);
  const pendingRotationIdRef = useRef(0);
  const pendingBatchAttemptIdRef = useRef(0);
  const pendingBatchAttemptRef = useRef<{
    attemptId: number;
    moveIds: number[];
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const hasBoardSolvedAckRef = useRef(false);
  const initializedPhaseRef = useRef<GameSectionProps["phase"] | null>(null);
  const isTutorialLevel = phase === GAME_SECTION_PHASE.DEMO;
  const isLivePhase = phase === GAME_SECTION_PHASE.LIVE;

  useEffect(() => {
    if (initializedPhaseRef.current === phase) {
      return;
    }
    initializedPhaseRef.current = phase;
    hasBoardSolvedAckRef.current = false;
    isWaitingForNextLevelActionRef.current = false;
    setIsAwaitingStartResponse(false);
    setIsRoundTransitionLoading(false);
    setHasStartSuccessGrid(false);
    setPendingBoardAccent(null);
    setIsAlreadyFinishedModalActive(false);
    setIsStageCompletedModalOpen(false);
    setIsSolvedHighlightActive(false);
    setIsBoardTransitionActive(false);
    setIsSessionExpired(false);
    lastStartedKeyRef.current = null;
    resetStageCompleteSummary();
    if (pendingBatchAttemptRef.current?.timeoutId) {
      clearTimeout(pendingBatchAttemptRef.current.timeoutId);
    }
    pendingBatchAttemptRef.current = null;
    pendingRotationsRef.current = [];
    if (solvedModalTimeoutRef.current) {
      clearTimeout(solvedModalTimeoutRef.current);
      solvedModalTimeoutRef.current = null;
    }

    if (phase === GAME_SECTION_PHASE.DEMO) {
      disconnect();
      resetToTutorialPhase();
      return;
    }
    if (phase === GAME_SECTION_PHASE.LIVE) {
      startNewGame();
      return;
    }
    disconnect();
    resetToTutorialPhase();
  }, [
    disconnect,
    phase,
    resetStageCompleteSummary,
    resetToTutorialPhase,
    startNewGame,
  ]);

  const clearPendingBatchAttempt = React.useCallback(() => {
    if (pendingBatchAttemptRef.current?.timeoutId) {
      clearTimeout(pendingBatchAttemptRef.current.timeoutId);
    }
    pendingBatchAttemptRef.current = null;
  }, []);

  const redirectToResultPage = React.useCallback(
    ({
      stage,
      score,
      completed,
      total,
      variant,
    }: {
      stage: string;
      score: number;
      completed: number;
      total: number;
      variant: GameResultVariant;
    }) => {
      setGameResult({
        stage,
        score,
        completed,
        total,
        variant,
      });
      router.replace("/result");
    },
    [router, setGameResult],
  );

  const emitRotateRecoveryBatch = React.useCallback(
    (reason: "reconnect" | "round_complete" | "stale") => {
      if (!isLivePhase || !isConnected) {
        return;
      }
      if (hasBoardSolvedAckRef.current) {
        return;
      }
      if (pendingBatchAttemptRef.current) {
        return;
      }
      const orderedPending = [...pendingRotationsRef.current].sort(
        (a, b) => a.enqueuedAt - b.enqueuedAt,
      );
      if (orderedPending.length === 0) {
        return;
      }

      const attemptId = pendingBatchAttemptIdRef.current + 1;
      pendingBatchAttemptIdRef.current = attemptId;
      const moveIds = orderedPending.map((move) => move.id);
      rotateGameTileBatch({
        moves: orderedPending.map((move) => ({
          r: move.y,
          c: move.x,
          timestamp: move.enqueuedAt,
          boardId: move.boardId,
        })),
      });

      const timeoutId = setTimeout(() => {
        const activeAttempt = pendingBatchAttemptRef.current;
        if (activeAttempt?.attemptId !== attemptId) {
          return;
        }
        const activeIds = new Set(activeAttempt.moveIds);
        const now = Date.now();
        pendingRotationsRef.current.forEach((pending) => {
          if (activeIds.has(pending.id)) {
            rotateGameTile({
              r: pending.y,
              c: pending.x,
              timestamp: pending.enqueuedAt,
              boardId: pending.boardId,
            });
          }
        });
        pendingRotationsRef.current = pendingRotationsRef.current.map(
          (pending) =>
            activeIds.has(pending.id)
              ? {
                  ...pending,
                  expired: false,
                  retries: pending.retries + 1,
                  lastSentAt: now,
                }
              : pending,
        );
        pendingBatchAttemptRef.current = null;
      }, ROTATE_BATCH_ACK_TIMEOUT_MS);

      pendingBatchAttemptRef.current = {
        attemptId,
        moveIds,
        timeoutId,
      };

      logger.info("[RotateRecoveryBatch] emitted", {
        reason,
        attemptId,
        moves: moveIds.length,
      });
    },
    [isConnected, isLivePhase, rotateGameTile, rotateGameTileBatch],
  );

  useEffect(() => {
    if (!isLivePhase) {
      return () => {};
    }
    return onGameStarted((rawResponse) => {
      if (isWaitingForNextLevelActionRef.current) {
        return;
      }
      const response = Array.isArray(rawResponse)
        ? rawResponse[1]
        : rawResponse;
      const isSuccess =
        typeof response === "object" &&
        response !== null &&
        "success" in response &&
        (response as { success: boolean }).success === true;

      if (!isSuccess) {
        hasBoardSolvedAckRef.current = false;
        setIsAwaitingStartResponse(false);
        setIsRoundTransitionLoading(false);
        setPendingBoardAccent(null);
        return;
      }
      const startPayload = response as Parameters<
        typeof applyGameStartedResponse
      >[0];
      const expectedAccentRaw =
        startPayload.data?.board?.color ??
        (startPayload.data as { color?: string | null })?.color ??
        null;
      setPendingBoardAccent(normalizeHexColor(expectedAccentRaw));
      applyGameStartedResponse(
        response as Parameters<typeof applyGameStartedResponse>[0],
      );
      setHasStartSuccessGrid(true);
      clearPendingBatchAttempt();
      pendingRotationsRef.current = [];
      hasBoardSolvedAckRef.current = false;
      setIsAwaitingStartResponse(false);
      setIsRoundTransitionLoading(false);
    });
  }, [
    applyGameStartedResponse,
    clearPendingBatchAttempt,
    isLivePhase,
    onGameStarted,
  ]);

  useEffect(() => {
    if (!isLivePhase) return () => {};
    return onAlreadyFinished((rawResponse) => {
      const parsed = parseAlreadyFinishedResponse(rawResponse);
      if (!parsed?.success || !parsed.data) return;
      const stage = String(parsed.data.stage);
      const score =
        typeof parsed.data.score === "number" ? parsed.data.score : 0;
      const completed =
        typeof parsed.data.boardsCompleted === "number"
          ? parsed.data.boardsCompleted
          : 0;
      const total = Math.max(
        1,
        typeof parsed.data.boardsTotal === "number"
          ? parsed.data.boardsTotal
          : 1,
        completed,
      );
      const normalizedStatus = String(parsed.data.status ?? "").toUpperCase();
      const variant =
        normalizedStatus === GAME_STAGE_STATUS.FAILED ? "failure" : "success";
      setStageCompleteSummary({
        totalScore: null,
        score,
        boardsCompleted: completed,
        boardsTotal: total,
        stageNumber: stage,
        stageStatus: normalizedStatus || null,
        completedLevel: null,
        message: parsed.data.message ?? null,
        completionReason: null,
      });
      setIsAlreadyFinishedModalActive(true);
      redirectToResultPage({
        stage,
        score,
        completed,
        total,
        variant,
      });
      setIsAwaitingStartResponse(false);
      setIsRoundTransitionLoading(false);
      setHasStartSuccessGrid(false);
      setPendingBoardAccent(null);
      hasBoardSolvedAckRef.current = true;
      isWaitingForNextLevelActionRef.current = true;
    });
  }, [
    isLivePhase,
    onAlreadyFinished,
    parseAlreadyFinishedResponse,
    redirectToResultPage,
    setHasStartSuccessGrid,
    setStageCompleteSummary,
  ]);

  useEffect(() => {
    if (!isLivePhase) return () => {};
    return onGameCompleted((rawResponse) => {
      const parsed = parseCompleteResponse(rawResponse);
      if (!parsed?.success || !parsed.data) return;
      const reason = parsed.data.reason?.toUpperCase();
      if (reason !== "TIME_UP") return;

      applyServerTimeUpFreeze();
      setStageCompleteSummary({
        totalScore: null,
        score: typeof parsed.data.score === "number" ? parsed.data.score : null,
        boardsCompleted:
          typeof parsed.data.boardsCompleted === "number"
            ? parsed.data.boardsCompleted
            : null,
        boardsTotal:
          typeof parsed.data.boardsTotal === "number"
            ? parsed.data.boardsTotal
            : null,
        stageNumber: null,
        stageStatus: null,
        completedLevel: null,
        message: null,
        completionReason: "TIME_UP",
      });
      setIsAlreadyFinishedModalActive(false);
      redirectToResultPage({
        stage: stageId,
        score: typeof parsed.data.score === "number" ? parsed.data.score : 0,
        completed:
          typeof parsed.data.boardsCompleted === "number"
            ? parsed.data.boardsCompleted
            : 0,
        total: Math.max(
          1,
          typeof parsed.data.boardsTotal === "number"
            ? parsed.data.boardsTotal
            : 1,
          typeof parsed.data.boardsCompleted === "number"
            ? parsed.data.boardsCompleted
            : 0,
        ),
        variant: GAME_RESULT_VARIANT.FAILURE,
      });
      setIsAwaitingStartResponse(false);
      setIsRoundTransitionLoading(false);
      setHasStartSuccessGrid(false);
      setPendingBoardAccent(null);
      clearPendingBatchAttempt();
      pendingRotationsRef.current = [];
      hasBoardSolvedAckRef.current = true;
      isWaitingForNextLevelActionRef.current = true;
      if (solvedModalTimeoutRef.current) {
        clearTimeout(solvedModalTimeoutRef.current);
        solvedModalTimeoutRef.current = null;
      }
      setIsSolvedHighlightActive(false);
      setIsBoardTransitionActive(false);
    });
  }, [
    applyServerTimeUpFreeze,
    clearPendingBatchAttempt,
    isLivePhase,
    onGameCompleted,
    parseCompleteResponse,
    redirectToResultPage,
    stageId,
    setHasStartSuccessGrid,
    setStageCompleteSummary,
  ]);

  useEffect(() => {
    return onSocketError((errorPayload) => {
      const code = normalizeSocketErrorCode(
        parseSocketIoErrorMessage(errorPayload),
      );
      handleKnownSocketAuthErrors(code, {
        onAuthFailed: () => toast.error(t("game.authFailedToast")),
        onSessionExpired: () => setIsSessionExpired(true),
      });
    });
  }, [onSocketError, t]);

  useEffect(() => {
    if (!isLivePhase) return () => {};
    return onSocketException((rawPayload) => {
      const parsed = parseSocketExceptionResponse(rawPayload);
      if (!parsed) return;

      const handled = handleKnownSocketAuthErrors(
        normalizeSocketErrorCode(parsed.message),
        {
          onAuthFailed: () => toast.error(t("game.authFailedToast")),
          onSessionExpired: () => setIsSessionExpired(true),
        },
      );
      if (!handled) {
        toast.error(parsed.message);
      }
    });
  }, [isLivePhase, onSocketException, parseSocketExceptionResponse, t]);

  useEffect(() => {
    if (!isLivePhase) return () => {};
    return onRotateResolved((rawResponse) => {
      if (isWaitingForNextLevelActionRef.current) {
        return;
      }
      const parsed = parseRotateResponse(rawResponse);
      if (!parsed) return;

      if (pendingBatchAttemptRef.current) {
        const activeIds = new Set(pendingBatchAttemptRef.current.moveIds);
        clearPendingBatchAttempt();
        pendingRotationsRef.current = pendingRotationsRef.current.filter(
          (pending) => !activeIds.has(pending.id),
        );
      } else {
        const pendingIndex = pendingRotationsRef.current.findIndex(
          (pending) => !pending.expired,
        );
        if (pendingIndex !== -1) {
          pendingRotationsRef.current.splice(pendingIndex, 1);
        } else if (pendingRotationsRef.current.length > 0) {
          pendingRotationsRef.current.shift();
        }
      }
      if (!parsed.success) {
        // Keep optimistic state; failed/late validates are replayed on reconnect.
        return;
      }

      const resolution = applyRotateResolutionMeta(parsed);
      if (resolution.isBoardSolved) {
        hasBoardSolvedAckRef.current = true;
        const pendingAfterSolvedAck = [
          ...pendingRotationsRef.current,
        ].reverse();
        pendingAfterSolvedAck.forEach((pending) => {
          revertTileRotation(pending.x, pending.y);
        });
        clearPendingBatchAttempt();
        pendingRotationsRef.current = [];
        if (resolution.isStageComplete) {
          setStageCompleteSummary({
            totalScore:
              typeof parsed.data?.totalScore === "number"
                ? parsed.data.totalScore
                : null,
            score:
              typeof parsed.data?.score === "number" ? parsed.data.score : null,
            boardsCompleted:
              typeof parsed.data?.boardsCompleted === "number"
                ? parsed.data.boardsCompleted
                : null,
            boardsTotal:
              typeof parsed.data?.boardsTotal === "number"
                ? parsed.data.boardsTotal
                : null,
            stageNumber: null,
            stageStatus: null,
            completedLevel:
              typeof parsed.data?.completedLevel === "string"
                ? parsed.data.completedLevel
                : null,
            message:
              typeof parsed.data?.message === "string"
                ? parsed.data.message
                : null,
            completionReason: null,
          });
        }
        const expectedNextBoardAccent = normalizeHexColor(
          parsed.data?.nextBoard?.color ?? null,
        );
        isWaitingForNextLevelActionRef.current = true;
        clearPendingBatchAttempt();
        pendingRotationsRef.current = [];
        if (solvedModalTimeoutRef.current) {
          clearTimeout(solvedModalTimeoutRef.current);
        }
        setIsSolvedHighlightActive(true);
        setIsBoardTransitionActive(true);
        setIsStageCompletedModalOpen(false);
        setPendingBoardAccent(expectedNextBoardAccent);
        solvedModalTimeoutRef.current = setTimeout(() => {
          setIsSolvedHighlightActive(false);
          setIsBoardTransitionActive(false);
          if (resolution.isStageComplete) {
            solvedModalTimeoutRef.current = setTimeout(() => {
              setIsRoundTransitionLoading(false);
              setIsAlreadyFinishedModalActive(false);
              redirectToResultPage({
                stage: stageId,
                score:
                  typeof parsed.data?.score === "number"
                    ? parsed.data.score
                    : 0,
                completed:
                  typeof parsed.data?.boardsCompleted === "number"
                    ? parsed.data.boardsCompleted
                    : 0,
                total: Math.max(
                  1,
                  typeof parsed.data?.boardsTotal === "number"
                    ? parsed.data.boardsTotal
                    : 1,
                  typeof parsed.data?.boardsCompleted === "number"
                    ? parsed.data.boardsCompleted
                    : 0,
                ),
                variant: GAME_RESULT_VARIANT.SUCCESS,
              });
              solvedModalTimeoutRef.current = null;
            }, SOLVED_RESULT_REVEAL_DELAY_MS);
            return;
          } else {
            const advanced = startNextBoard();
            if (advanced) {
              hasBoardSolvedAckRef.current = false;
              setHasStartSuccessGrid(true);
              setIsRoundTransitionLoading(false);
              setIsAwaitingStartResponse(false);
            } else {
              hasBoardSolvedAckRef.current = false;
              isWaitingForNextLevelActionRef.current = false;
              lastStartedKeyRef.current = null;
              setHasStartSuccessGrid(false);
              setIsAwaitingStartResponse(true);
              setIsRoundTransitionLoading(true);
              startGame();
            }
          }
          solvedModalTimeoutRef.current = null;
        }, SOLVED_NEXT_BOARD_HOLD_MS);
      }
    });
  }, [
    applyRotateResolutionMeta,
    clearPendingBatchAttempt,
    isLivePhase,
    isWaitingForNextLevelActionRef,
    onRotateResolved,
    parseRotateResponse,
    redirectToResultPage,
    revertTileRotation,
    stageId,
    setStageCompleteSummary,
    startGame,
    startNextBoard,
  ]);

  useEffect(() => {
    if (!isLivePhase) {
      return;
    }
    if (!isWaitingForNextLevelActionRef.current) {
      return;
    }
    if (!hasStartSuccessGrid) {
      return;
    }
    const usesDynamicThemeColors = config.settings.dynamicColors !== false;
    const accentReady =
      !pendingBoardAccent ||
      !usesDynamicThemeColors ||
      normalizeHexColor(theme.primary) === pendingBoardAccent;
    if (accentReady) {
      isWaitingForNextLevelActionRef.current = false;
    }
  }, [
    config.settings.dynamicColors,
    hasStartSuccessGrid,
    isLivePhase,
    pendingBoardAccent,
    theme.primary,
  ]);

  useEffect(() => {
    return () => {
      clearPendingBatchAttempt();
      if (solvedModalTimeoutRef.current) {
        clearTimeout(solvedModalTimeoutRef.current);
      }
      pendingRotationsRef.current = [];
    };
  }, [clearPendingBatchAttempt]);

  useEffect(() => {
    if (!isLivePhase) return;
    const interval = setInterval(() => {
      const now = Date.now();
      let hasExpiredPending = false;
      pendingRotationsRef.current = pendingRotationsRef.current.map(
        (pending) => {
          if (pending.expired) {
            return pending;
          }
          if (now - pending.lastSentAt >= PENDING_ROTATION_STALE_MS) {
            hasExpiredPending = true;
            return { ...pending, expired: true };
          }
          return pending;
        },
      );
      if (isConnected && hasExpiredPending && !hasBoardSolvedAckRef.current) {
        emitRotateRecoveryBatch("stale");
      }
    }, PENDING_ROTATION_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [emitRotateRecoveryBatch, isConnected, isLivePhase]);

  useEffect(() => {
    emitRotateRecoveryBatch("reconnect");
  }, [emitRotateRecoveryBatch, isConnected, socket?.id]);

  useEffect(() => {
    const shouldTrackConnectionDelay =
      isLivePhase && hasSeenWelcome && !isConnected && !isSessionExpired;

    if (!shouldTrackConnectionDelay) {
      const resetTimeoutId = globalThis.setTimeout(() => {
        setIsConnectionAlertDelayElapsed(false);
      }, 0);
      return () => {
        globalThis.clearTimeout(resetTimeoutId);
      };
    }

    const showTimeoutId = globalThis.setTimeout(() => {
      setIsConnectionAlertDelayElapsed(true);
    }, CONNECTION_ALERT_DELAY_MS);

    return () => {
      globalThis.clearTimeout(showTimeoutId);
    };
  }, [hasSeenWelcome, isConnected, isLivePhase, isSessionExpired]);

  const emitStartForStage = React.useCallback(() => {
    const sid = socket?.id;
    if (!sid) return;
    // game:start has no client payload; backend resolves stage from the auth token.
    // Dedupe per socket connection only — do not wait on demo/config stageId, which
    // can load after the socket connects and would otherwise block the first emit.
    const dedupeKey = sid;
    if (lastStartedKeyRef.current === dedupeKey) {
      return;
    }

    lastStartedKeyRef.current = dedupeKey;
    hasBoardSolvedAckRef.current = false;
    isWaitingForNextLevelActionRef.current = false;
    setHasStartSuccessGrid(false);
    setIsAwaitingStartResponse(true);
    setIsRoundTransitionLoading(false);
    setPendingBoardAccent(null);
    startGame();
  }, [socket?.id, startGame]);

  useEffect(() => {
    if (!isLivePhase) return;
    if (!hasSeenWelcome) return;
    if (!isConnected || !socket?.id) return;
    emitStartForStage();
  }, [emitStartForStage, hasSeenWelcome, isConnected, isLivePhase, socket?.id]);

  useEffect(() => {
    if (
      !isTutorialLevel ||
      !hasSeenWelcome ||
      hasStarted ||
      isLoading ||
      grid.length === 0
    ) {
      return;
    }
    beginGame();
  }, [
    beginGame,
    grid.length,
    hasSeenWelcome,
    hasStarted,
    isLoading,
    isTutorialLevel,
  ]);

  const { handleHint, levelHintMessage } = useHintController({
    levelIndex: tutorialRoundIndex,
    hintedCells,
    isWon,
    triggerHint,
    t,
  });

  useAudio(
    config.settings.audio.backgroundTrackUrl,
    true,
    soundEnabled && hasSeenWelcome,
    volume,
  );

  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!isTutorialLevel || !isWon || isStageCompletedModalOpen) {
      return undefined;
    }
    if (solvedModalTimeoutRef.current) {
      clearTimeout(solvedModalTimeoutRef.current);
    }
    solvedModalTimeoutRef.current = setTimeout(() => {
      setIsSolvedHighlightActive(true);
      setIsBoardTransitionActive(true);
      solvedModalTimeoutRef.current = setTimeout(() => {
        setIsSolvedHighlightActive(false);
        setIsBoardTransitionActive(false);
        const isFinalDemoLevel = tutorialRoundIndex + 1 >= TUTORIAL_LEVEL_COUNT;
        if (isFinalDemoLevel) {
          solvedModalTimeoutRef.current = setTimeout(() => {
            setShowDemoCompleteModal(true);
            solvedModalTimeoutRef.current = null;
          }, FINAL_DEMO_REDIRECT_DELAY_MS);
          return;
        }
        nextLevel();
        solvedModalTimeoutRef.current = null;
      }, BOARD_SOLVED_TRANSITION_MS);
    }, TILE_ROTATION_TWEEN_MS);

    return () => {
      if (solvedModalTimeoutRef.current) {
        clearTimeout(solvedModalTimeoutRef.current);
        solvedModalTimeoutRef.current = null;
      }
    };
  }, [
    isStageCompletedModalOpen,
    isTutorialLevel,
    isWon,
    tutorialRoundIndex,
    nextLevel,
    router,
  ]);

  const finishDemo = React.useCallback(() => {
    setIsDemoExitPending(true);
    setShowDemoCompleteModal(false);
    router.replace("/");
  }, [router]);

  useEffect(() => {
    if (!isWon && !isTimeUp) {
      hasBoardSolvedAckRef.current = false;
      if (isAlreadyFinishedModalActive) {
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsStageCompletedModalOpen(false);
      setIsSolvedHighlightActive(false);
      setIsBoardTransitionActive(false);
      resetStageCompleteSummary();
      isWaitingForNextLevelActionRef.current = false;
      if (solvedModalTimeoutRef.current) {
        clearTimeout(solvedModalTimeoutRef.current);
        solvedModalTimeoutRef.current = null;
      }
    }
  }, [
    isAlreadyFinishedModalActive,
    isTimeUp,
    isWon,
    resetStageCompleteSummary,
  ]);

  const showConnectionAlert =
    isLivePhase &&
    hasSeenWelcome &&
    !isConnected &&
    !isSessionExpired &&
    isConnectionAlertDelayElapsed;

  // Show the offline modal when the browser loses network OR the socket
  // connection drops (after its built-in delay). Skip during demo — it's local.
  useEffect(() => {
    if (phase === GAME_SECTION_PHASE.DEMO) return;
    if (!isOnline || showConnectionAlert) {
      queueMicrotask(() => {
        setIsOfflineModalOpen(true);
      });
    }
  }, [isOnline, showConnectionAlert, phase]);

  // Auto-close the modal once the browser is back online and the socket reconnects.
  useEffect(() => {
    if (isOnline && !showConnectionAlert) {
      queueMicrotask(() => {
        setIsOfflineModalOpen(false);
      });
    }
  }, [isOnline, showConnectionAlert]);

  const handleOfflineRetry = React.useCallback(() => {
    if (!navigator.onLine || showConnectionAlert) return;
    setIsOfflineModalOpen(false);
  }, [showConnectionAlert]);

  const showSessionExpiredAlert =
    isTutorialLevel && hasSeenWelcome && isSessionExpired;
  const headerTimeLeftSeconds = isStageCompletedModalOpen ? 0 : timeLeftSeconds;
  const showHintButton = isTutorialLevel;
  const usesDynamicThemeColors = config.settings.dynamicColors !== false;
  const isPendingAccentSatisfied =
    !pendingBoardAccent ||
    !usesDynamicThemeColors ||
    normalizeHexColor(theme.primary) === pendingBoardAccent;
  const showLiveRoundStatsSkeleton =
    !isTutorialLevel &&
    hasSeenWelcome &&
    !isStageCompletedModalOpen &&
    (!hasStartSuccessGrid ||
      isAwaitingStartResponse ||
      !isPendingAccentSatisfied);
  const showStatsSkeleton = isLoading || showLiveRoundStatsSkeleton;
  const canRenderStartedBoard =
    hasStartSuccessGrid && !isAwaitingStartResponse && isPendingAccentSatisfied;
  const canRenderTransitionLoader =
    isAwaitingStartResponse && isRoundTransitionLoading;
  const shouldRenderGrid = isTutorialLevel
    ? grid.length > 0
    : grid.length > 0 &&
      (isSolvedHighlightActive ||
        isBoardTransitionActive ||
        canRenderStartedBoard ||
        canRenderTransitionLoader);
  // Canonical runtime accent for all UI surfaces.
  const activeAccentColor = templateTheme.primary;

  const configuredGridSide = config.settings.gridSizes[difficulty];
  const longestGridSide = React.useMemo(() => {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    if (rows > 0 && cols > 0) {
      return Math.max(rows, cols);
    }
    return configuredGridSide;
  }, [grid, configuredGridSide]);

  const unifiedMobileInsetScale = React.useMemo(() => {
    return resolveDynamicMobileInsetScale(longestGridSide);
  }, [longestGridSide]);

  const handleTileClick = React.useCallback(
    (x: number, y: number) => {
      const hasBlockingOverlay =
        isSettingsOpen ||
        isTimeUp ||
        isStageCompletedModalOpen ||
        isSolvedHighlightActive ||
        isBoardTransitionActive;
      if (hasBlockingOverlay) {
        return;
      }
      if (!isTutorialLevel && isAwaitingStartResponse) {
        return;
      }
      if (!isTutorialLevel && hasBoardSolvedAckRef.current) {
        return;
      }
      if (!hasStarted) {
        beginGame();
      }
      if (isTutorialLevel) {
        rotateTile(x, y);
        return;
      }
      rotateTile(x, y);
      const pendingId = pendingRotationIdRef.current + 1;
      pendingRotationIdRef.current = pendingId;
      const now = Date.now();
      pendingRotationsRef.current.push({
        id: pendingId,
        x,
        y,
        enqueuedAt: now,
        lastSentAt: now,
        retries: 0,
        expired: false,
        boardId: activeBoardId,
      });
      rotateGameTile({ r: y, c: x, timestamp: now, boardId: activeBoardId });
    },
    [
      activeBoardId,
      beginGame,
      hasStarted,
      isBoardTransitionActive,
      isAwaitingStartResponse,
      isTimeUp,
      isSettingsOpen,
      isSolvedHighlightActive,
      isStageCompletedModalOpen,
      isTutorialLevel,
      rotateGameTile,
      rotateTile,
    ],
  );

  const handleStartFreshDemoSession = React.useCallback(() => {
    if (isBootstrappingSession) return;
    disconnect();
    setIsSettingsOpen(false);
    Storage.clearAllStorageTypes();
    clearLegacyUrlSearchParams();
    void (async () => {
      try {
        await syncTokenFromStorage();
      } catch (error) {
        logger.warn("Sync token from storage failed during demo reset", error);
        toast.error(t("demo.sessionRefreshFailed"));
      }
      resetToTutorialPhase();
      startNewGame();
      setIsSessionExpired(false);
      setIsAwaitingStartResponse(false);
      setIsRoundTransitionLoading(false);
      setHasStartSuccessGrid(false);
      setPendingBoardAccent(null);
      setIsAlreadyFinishedModalActive(false);
      setIsStageCompletedModalOpen(false);
      setIsSolvedHighlightActive(false);
      setIsBoardTransitionActive(false);
      resetStageCompleteSummary();
      if (solvedModalTimeoutRef.current) {
        clearTimeout(solvedModalTimeoutRef.current);
        solvedModalTimeoutRef.current = null;
      }
      lastStartedKeyRef.current = null;
      hasBoardSolvedAckRef.current = false;
      isWaitingForNextLevelActionRef.current = false;
      clearPendingBatchAttempt();
      pendingRotationsRef.current = [];
      initializedPhaseRef.current = null;
      router.replace("/");
    })();
  }, [
    clearPendingBatchAttempt,
    disconnect,
    isBootstrappingSession,
    syncTokenFromStorage,
    resetToTutorialPhase,
    router,
    startNewGame,
    resetStageCompleteSummary,
    setIsSettingsOpen,
    t,
  ]);

  const handleLearnHowToPlay = React.useCallback(() => {
    startLearnNavTransition(() => {
      router.push("/demo");
    });
  }, [router, startLearnNavTransition]);

  const handleExitDemo = React.useCallback(() => {
    setIsDemoExitPending(true);
    disconnect();
    Storage.clearAllStorageTypes();
    clearLegacyUrlSearchParams();
    void (async () => {
      try {
        await syncTokenFromStorage();
      } catch (error) {
        logger.warn("Sync token from storage failed during demo exit", error);
        toast.error(t("demo.sessionRefreshFailed"));
      }
      hasBoardSolvedAckRef.current = false;
      clearPendingBatchAttempt();
      pendingRotationsRef.current = [];
      if (solvedModalTimeoutRef.current) {
        clearTimeout(solvedModalTimeoutRef.current);
        solvedModalTimeoutRef.current = null;
      }
      setIsAlreadyFinishedModalActive(false);
      setIsStageCompletedModalOpen(false);
      resetStageCompleteSummary();
      setIsSolvedHighlightActive(false);
      setIsBoardTransitionActive(false);
      setIsSessionExpired(false);
      setIsAwaitingStartResponse(false);
      setIsRoundTransitionLoading(false);
      setHasStartSuccessGrid(false);
      setPendingBoardAccent(null);
      isWaitingForNextLevelActionRef.current = false;
      initializedPhaseRef.current = null;
      router.replace("/");
    })();
  }, [
    clearPendingBatchAttempt,
    disconnect,
    syncTokenFromStorage,
    resetStageCompleteSummary,
    router,
    t,
  ]);

  const handlePlayNow = React.useCallback(() => {
    if (isBootstrappingSession) return;
    const envStageId = getEnvStageId();
    startPlayNavTransition(() => {
      lastStartedKeyRef.current = null;
      hasBoardSolvedAckRef.current = false;
      clearPendingBatchAttempt();
      pendingRotationsRef.current = [];

      const navigateToLive = () => {
        router.push("/game");
      };

      if (token) {
        navigateToLive();
        return;
      }

      if (!envStageId) {
        toast.error(t("demo.sessionStartFailed"));
        return;
      }

      setIsBootstrappingSession(true);
      void authService
        .ensureUserSession(envStageId)
        .then(() => syncTokenFromStorage())
        .then(navigateToLive)
        .catch((error) => {
          logger.error("Background session bootstrap failed", error);
          toast.error(t("demo.sessionStartFailed"));
        })
        .finally(() => {
          setIsBootstrappingSession(false);
        });
    });
  }, [
    clearPendingBatchAttempt,
    isBootstrappingSession,
    syncTokenFromStorage,
    router,
    startPlayNavTransition,
    t,
    token,
  ]);
  if (isDemoExitPending) {
    return (
      <GameSectionLoading
        theme={templateTheme}
        activeAccentColor={activeAccentColor}
        showHintButton={showHintButton}
      />
    );
  }

  if (phase === GAME_SECTION_PHASE.DEMO && isLoading) {
    return (
      <GameSectionLoading
        theme={templateTheme}
        activeAccentColor={activeAccentColor}
        showHintButton={showHintButton}
      />
    );
  }

  if (phase === GAME_SECTION_PHASE.INSTRUCTIONS) {
    if (isInstructionsContentLoading) {
      return <GameInstructionsSkeleton stage={stageId} />;
    }
    return (
      <GameInstructionsScreen
        stage={stageId}
        contentByStage={instructionsContentByStage}
        isLearnHowToPlayLoading={isLearnNavPending}
        isPlayNowLoading={isBootstrappingSession || isPlayNavPending}
        hideLearnHowToPlay={!enableDemo}
        hidePlayNow={!isPlayEnabled}
        onLearnHowToPlay={handleLearnHowToPlay}
        onPlayNow={handlePlayNow}
      />
    );
  }

  let sessionBadgeLabel: string | null = null;
  if (hasSeenWelcome && isTutorialLevel) {
    sessionBadgeLabel = t("demo.badge");
  }

  const showDemoDoneButton =
    phase === GAME_SECTION_PHASE.DEMO && !isStageCompletedModalOpen;
  const shouldReserveTopActionSlot = !isStageCompletedModalOpen;

  return (
    <GameTemplate theme={templateTheme}>
      <div className="relative z-30 w-full shrink-0">
        <GameHeader
          key={`game-header-${activeAccentColor}`}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onHint={handleHint}
          showHintButton={showHintButton}
          isHintDisabled={!showHintButton || isLoading}
          primaryColor={activeAccentColor}
        />
      </div>
      {shouldReserveTopActionSlot ? (
        <div className="relative z-20 flex min-h-9 w-full items-start justify-end pt-1">
          {showDemoDoneButton ? (
            <button
              type="button"
              className="inline-flex min-h-9 max-w-[min(100%,18rem)] shrink-0 items-center justify-center rounded-full border border-solid px-4 py-1.5 text-center text-[13px] font-semibold leading-tight tracking-wide text-white backdrop-blur-sm transition-all hover:scale-[1.04] active:scale-[0.97] sm:max-w-none sm:whitespace-nowrap sm:px-5 sm:py-2 sm:text-sm"
              style={{
                borderColor: hexToRgba(activeAccentColor, 0.1),
                background: `linear-gradient(97.19deg, ${hexToRgba(activeAccentColor, 0.2)} 4.98%, ${hexToRgba(activeAccentColor, 0.2)} 59.39%, ${hexToRgba(activeAccentColor, 0.2)} 112.77%)`,
              }}
              onClick={handleExitDemo}
            >
              {t("demo.exitButton")}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex w-full flex-1 flex-col justify-center">
        {hasSeenWelcome ? (
          <MobileGameStatsChip
            moves={moves}
            timeLeftSeconds={headerTimeLeftSeconds}
            timeShowsInfinity={isTutorialLevel}
            showSkeleton={showStatsSkeleton}
            accentColor={activeAccentColor}
          />
        ) : null}

        <GamePlayArea
          shouldRenderGrid={shouldRenderGrid}
          sessionBadgeLabel={sessionBadgeLabel}
          hintMessage={isTutorialLevel ? levelHintMessage : null}
          hintIsWon={isWon}
          hintIsTimeUp={isTimeUp}
          hintReserveVerticalSlot={isTutorialLevel && hasSeenWelcome}
          animateTileEntrance={isTutorialLevel}
          mobileInsetScaleOverride={unifiedMobileInsetScale}
          grid={grid}
          theme={templateTheme}
          showSessionExpiredAlert={showSessionExpiredAlert}
          sessionExpiredLabel={t("game.sessionExpiredBanner")}
          onTileClick={handleTileClick}
          isSolvedHighlightActive={isSolvedHighlightActive}
          isBoardTransitionActive={isBoardTransitionActive}
        />
      </div>
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        accentColor={templateTheme.primary}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        volume={volume}
        setVolume={setVolume}
        onStartFreshDemoSession={handleStartFreshDemoSession}
        demoSessionPending={isBootstrappingSession}
      />
      <OfflineStatusModal
        isOpen={isOfflineModalOpen}
        stageId={stageId}
        onRetry={handleOfflineRetry}
      />
      {showDemoCompleteModal && (
        <GameClearModal
          title={t('demo.demoCleared')}
          accentColor={STAGE_THEME_COLORS[stageThemeKey(stageId)].resultAccent}
          eclipseColor={STAGE_THEME_COLORS[stageThemeKey(stageId)].eclipse}
          onConfirm={finishDemo}
        />
      )}
    </GameTemplate>
  );
}
