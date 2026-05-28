import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IMAGES } from '@/assets/images';
import { useAudio } from '@/audio';
import { AuthGateScreen } from '@/components/shared/AuthGateScreen';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { GameClearModal } from '@/components/shared/GameClearModal';
import { Card, CardContent } from '@/components/ui/card';
import { getStageTheme } from '@/constants/stageTheme';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { gameApi } from '@/features/sequence-recall/api/game.api';
import { GameResultOverlay } from '@/features/sequence-recall/components/GameResultOverlay';
import { InstructionsLobbyScreen } from '@/features/sequence-recall/components/InstructionsLobbyScreen';
import { SequenceBoard } from '@/features/sequence-recall/components/SequenceBoard';
import { SequenceDots } from '@/features/sequence-recall/components/SequenceDots';
import { SessionTimerBar } from '@/features/sequence-recall/components/SessionTimerBar';
import {
  BOARD_INSTRUCTION,
  ROUND_INTIAL_START_DELAY_MS,
  ROUND_LAST_MESSAGE,
  ROUND_TRANSITION_DELAY_MS,
  ROUND_TRANSITION_MESSAGE,
  WRONG_MOVE_HANDLING,
} from '@/features/sequence-recall/constants';
import {
  GAME_STATE_QUERY_KEY,
  useFinishPlayback,
  useFreshResetGame,
  useGameStateQuery,
  useReplayRound,
  useRestartGame,
  useSessionTimeoutGame,
  useStartGame,
  useSubmitMove,
} from '@/features/sequence-recall/hooks/useGameCommands';
import { useGameConfig } from '@/features/sequence-recall/hooks/useGameConfig';
import { useGameConfigQuery } from '@/features/sequence-recall/hooks/useGameConfigQuery';
import { useGameOver } from '@/features/sequence-recall/hooks/useGameOver';
import { useGameStart } from '@/features/sequence-recall/hooks/useGameStart';
import { useNextSequence } from '@/features/sequence-recall/hooks/useNextSequence';
import { useParentResizeNotifier } from '@/features/sequence-recall/hooks/useParentResizeNotifier';
import { usePrevSequence } from '@/features/sequence-recall/hooks/usePrevSequence';
import { useSequencePlayback } from '@/features/sequence-recall/hooks/useSequencePlayback';
import { useSessionTimer } from '@/features/sequence-recall/hooks/useSessionTimer';
import { useStageContent } from '@/features/sequence-recall/hooks/useStageContent';
import { useTimeSync } from '@/features/sequence-recall/hooks/useTimeSync';
import { useValidate } from '@/features/sequence-recall/hooks/useValidate';
import { getApiErrorMessage } from '@/lib/api/getApiErrorMessage';
import { sendReadySignal } from '@/lib/embed/messaging';
import { cn } from '@/lib/utils';
import { fetchDevSession } from '@/services/authService'; // TODO(temp): 409 dev-session refresh
import { ApiRequestError } from '@/types/api.types';
import type {
  GameOverReason,
  GameStartResponse,
  NextSequenceResponse,
  ValidateRequest,
} from '@/types/api.types';
import {
  BOARD_MODE,
  GAME_PHASE,
  type BoardMode,
  type GameConfig,
  type GamePhase,
  type GameState,
} from '@/types/game';
import { buildGameThemeStyle } from '@/utils/gameThemeStyle';
import { generateDemoSequence } from '@/utils/sequence';
import { storage } from '@/utils/storage';
import { appConfig } from '@app/config/appConfig';
import { useApiError } from '@hooks/useApiError';

interface ApiGameSession {
  gameSessionId: string;
  endTime: string;
  isResumed: boolean;
  maxRounds: number;
  serverConfig: {
    timeLimit: number;
    maxRounds: number;
    initialSequenceLength: number;
    bonusTimeRatio: number;
    flashDelay: number;
    cellCount: number;
  };
}

interface PersistedActiveSession {
  sessionId: string;
  stageId: string;
  currentDemoRound: number;
  currentActualRound: number;
  isDemoMode: boolean;
  updatedAt: string;
}

const ACTIVE_GAME_SESSION_KEY = STORAGE_KEYS.ACTIVE_GAME_SESSION;
const PENDING_GAME_FINALIZATION_KEY = 'pending_game_finalization';

interface PendingGameFinalization {
  sessionId: string;
  stageId: string;
  reason: GameOverReason;
  validatePayload: ValidateRequest;
  requiresGameOver: boolean;
  updatedAt: string;
}

type CurrentSessionLike = {
  status: number;
  currentDemoRound?: number;
  currentActualRound: number;
  isDemoMode?: boolean;
};

/**
 * Checks whether record.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of isRecord.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Checks whether current session like.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of isCurrentSessionLike.
 */
function isCurrentSessionLike(value: unknown): value is CurrentSessionLike {
  if (!isRecord(value)) return false;
  return (
    typeof value.status === 'number' &&
    typeof value.currentActualRound === 'number' &&
    (typeof value.currentDemoRound === 'number' || typeof value.currentDemoRound === 'undefined') &&
    (typeof value.isDemoMode === 'boolean' || typeof value.isDemoMode === 'undefined')
  );
}

/**
 * Checks whether pending game finalization.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of isPendingGameFinalization.
 */
function isPendingGameFinalization(value: unknown): value is PendingGameFinalization {
  if (!isRecord(value)) return false;
  return (
    typeof value.sessionId === 'string' &&
    typeof value.stageId === 'string' &&
    (value.reason === 'COMPLETED' || value.reason === 'TIME_UP') &&
    typeof value.requiresGameOver === 'boolean' &&
    isRecord(value.validatePayload)
  );
}

/**
 * Sequence recall game shell.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function SequenceRecallGameShell() {
  const audio = useAudio();
  const { t } = useTranslation();
  const { showApiError, clearApiError } = useApiError();
  // Stable ref so effects always call the latest t() without listing it in deps
  const tRef = useRef(t);
  tRef.current = t;
  const FALLBACK_DEMO_MIN_SEQUENCE = 2;
  const FALLBACK_DEMO_MAX_SEQUENCE = 4;
  const [wrongCueActive, setWrongCueActive] = useState(false);
  const [levelCompleteBurst, setLevelCompleteBurst] = useState(false);
  const [wrongTileId, setWrongTileId] = useState<number | null>(null);
  const [audioType] = useState<'piano' | 'retro'>('piano');
  const [endGameConfirmOpen, setEndGameConfirmOpen] = useState(false);
  const [playMode, setPlayMode] = useState<'socket' | 'practice'>('socket');
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isFrontendDemo, setIsFrontendDemo] = useState(false);
  const [demoCurrentLength, setDemoCurrentLength] = useState(FALLBACK_DEMO_MIN_SEQUENCE);
  const [showDemoCompleteModal, setShowDemoCompleteModal] = useState(false);

  // Holds the session data received from the game:start ack
  const [socketSession, setSocketSession] = useState<ApiGameSession | null>(null);
  // endTime received in the first real round's game:new_round push (round >= 1)
  const [socketEndTime, setSocketEndTime] = useState<string | null>(null);
  // Holds the server-authoritative game-over data (finalScore, bonus, reason)
  const [gameOverData, setGameOverData] = useState<{
    finalScore: number;
    bonus: number;
    completedRounds: number;
    successfulRounds: number;
    reason: GameOverReason;
  } | null>(null);

  // API round tracking — updated from start and next-sequence responses
  const [currentDemoRound, setCurrentDemoRound] = useState(0);
  const [currentActualRound, setCurrentActualRound] = useState(0);
  const [isApiDemo, setIsApiDemo] = useState(false);

  // Incremented every time we enter showing-sequence so useSequencePlayback
  // always restarts — even when the sequence reference is unchanged (retry after wrong input)
  const [playbackKey, setPlaybackKey] = useState(0);

  const previousPhaseRef = useRef<string | null>(null);
  const boardCenterRef = useRef<HTMLDivElement | null>(null);
  const wrongCueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelCompleteBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const hasAttemptedRestoreRef = useRef(false);
  const gameThemeStyle = useMemo(() => buildGameThemeStyle(appConfig.socket.stageNumber), []);

  const gameStart = useGameStart();
  const gameOverMutation = useGameOver();
  const rawConfigQuery = useGameConfig();
  const demoMinSequence = rawConfigQuery.data?.demoMinSequence ?? FALLBACK_DEMO_MIN_SEQUENCE;
  const demoMaxSequence = Math.max(
    demoMinSequence,
    rawConfigQuery.data?.demoMaxSequence ?? FALLBACK_DEMO_MAX_SEQUENCE,
  );
  const isLearnHowToPlayEnabled = rawConfigQuery.data?.enableDemo === true;
  const nextSeqMutation = useNextSequence();
  const nextSeqMutateRef = useRef(nextSeqMutation.mutateAsync);
  nextSeqMutateRef.current = nextSeqMutation.mutateAsync;
  const prevSeqMutation = usePrevSequence();
  const prevSeqMutateRef = useRef(prevSeqMutation.mutateAsync);
  prevSeqMutateRef.current = prevSeqMutation.mutateAsync;
  const validateMutation = useValidate();
  const validateRef = useRef(validateMutation.mutate);
  validateRef.current = validateMutation.mutate;
  const validateAsyncRef = useRef(validateMutation.mutateAsync);
  validateAsyncRef.current = validateMutation.mutateAsync;
  // ── Mock / local game commands (active until Events 2 & 3 are wired) ─────
  const configQuery = useGameConfigQuery();
  const hasRawConfig = Boolean(rawConfigQuery.data);
  const { contentByStage: stageContentByStage, isLoading: isStageContentLoading } = useStageContent(
    { enabled: hasRawConfig || rawConfigQuery.isSuccess },
  );
  const baseConfig: GameConfig | null = configQuery.data ?? null;
  const practiceConfig = useMemo(() => {
    if (!baseConfig) return null;
    return {
      ...baseConfig,
      turnLimit: 3,
      sessionTimerSeconds: 0,
      initialSequenceLength: 2,
    };
  }, [baseConfig]);
  const config: GameConfig | null = playMode === 'practice' ? practiceConfig : baseConfig;

  const gameStateQuery = useGameStateQuery(config, Boolean(config));
  const startGame = useStartGame(config);

  const freshResetBaseGame = useFreshResetGame(baseConfig);

  const finishPlayback = useFinishPlayback(config);
  const submitMove = useSubmitMove(config);
  const replayRound = useReplayRound(config);
  const restartGame = useRestartGame(config);
  const sessionTimeoutGame = useSessionTimeoutGame(config);

  const state = gameStateQuery.data;
  const difficulty = useMemo(() => {
    if (!config || !state) return null;
    return config.difficultyByLevel[state.level] ?? config.difficultyByLevel[1];
  }, [config, state]);

  // Server config takes priority over mock config for board/round sizing
  const boxCount = socketSession?.serverConfig.cellCount ?? config?.boxCount ?? 4;
  const sessionTimerSeconds = config?.sessionTimerSeconds ?? 0;
  // Use the server's authoritative total duration for the progress bar when available.
  // Without this, mock's 60s would divide into a 180s server countdown → 300%+ progress.
  const timerTotalSeconds = socketSession?.serverConfig.timeLimit ?? sessionTimerSeconds;
  const isTerminalPhase =
    state?.phase === GAME_PHASE.GAME_OVER || state?.phase === GAME_PHASE.SESSION_COMPLETE;
  const shouldPollTimeSync =
    Boolean(socketSession) && !isTerminalPhase && !isApiDemo && currentActualRound > 0;
  const timeSyncQuery = useTimeSync(
    shouldPollTimeSync ? (socketSession?.gameSessionId ?? null) : null,
  );

  const isDemoRound = Boolean(socketSession) && isApiDemo;

  const clearPersistedSession = useCallback(() => {
    storage.remove(ACTIVE_GAME_SESSION_KEY);
  }, []);

  const clearPendingFinalization = useCallback(() => {
    storage.remove(PENDING_GAME_FINALIZATION_KEY);
  }, []);

  const persistActiveSession = useCallback(
    async (partial: Omit<PersistedActiveSession, 'updatedAt'>) => {
      const payload: PersistedActiveSession = {
        ...partial,
        updatedAt: new Date().toISOString(),
      };

      await storage.setSecure(ACTIVE_GAME_SESSION_KEY, payload);
    },
    [],
  );

  const persistPendingFinalization = useCallback(
    (payload: Omit<PendingGameFinalization, 'updatedAt'>) => {
      const nextPayload: PendingGameFinalization = {
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      storage.set(PENDING_GAME_FINALIZATION_KEY, nextPayload);
    },
    [],
  );

  const submitValidateWithRecovery = useCallback(
    async (payload: ValidateRequest, reason: GameOverReason, requiresGameOver: boolean) => {
      persistPendingFinalization({
        sessionId: payload.gameSessionId,
        stageId: appConfig.socket.stageId,
        reason,
        validatePayload: payload,
        requiresGameOver,
      });
      try {
        await validateAsyncRef.current(payload);
        clearPendingFinalization();
      } catch {
        // Keep pending payload for refresh-recovery.
      }
    },
    [clearPendingFinalization, persistPendingFinalization],
  );

  // enabled=false during demo rounds so the timer never starts until round 1.
  const { sessionTimerDisplay, sessionTimerWarning, sessionTimerCritical, resetTimer } =
    useSessionTimer({
      sessionTimerSeconds,
      endTime: timeSyncQuery.data?.endTime ?? socketEndTime ?? socketSession?.endTime ?? null,
      enabled: !isDemoRound && !isFrontendDemo,
      state,
      sessionTimeoutGame,
    });
  const shouldShowTimerBar =
    isDemoRound ||
    isTerminalPhase ||
    (!isFrontendDemo &&
      timerTotalSeconds > 0 &&
      state?.phase !== GAME_PHASE.READY &&
      state?.phase !== GAME_PHASE.LOADING);
  const timerDisplayValue = isTerminalPhase ? 0 : (sessionTimerDisplay ?? timerTotalSeconds);

  useEffect(() => {
    sendReadySignal();
  }, []);

  const finalizeRecoveredSession = useCallback(
    async (persisted: PersistedActiveSession, pending: PendingGameFinalization | null) => {
      const reason: GameOverReason =
        pending?.reason ??
        ((rawConfigQuery.data?.totalRounds ?? 0) > 0 &&
        persisted.currentActualRound >= (rawConfigQuery.data?.totalRounds ?? 0)
          ? 'COMPLETED'
          : 'TIME_UP');

      if (
        pending &&
        pending.sessionId === persisted.sessionId &&
        pending.stageId === appConfig.socket.stageId
      ) {
        try {
          await validateAsyncRef.current(pending.validatePayload);
          clearPendingFinalization();
        } catch {
          // Keep pending payload for next retry; still attempt game-over below.
        }
      }

      const gameOver = await gameApi.gameOver({
        gameSessionId: persisted.sessionId,
        reason,
        completedRounds: Math.max(0, persisted.currentActualRound),
        timestamp: new Date().toISOString(),
      });

      setPlayMode('socket');
      setGameOverData(gameOver);
      setCurrentDemoRound(persisted.currentDemoRound);
      setCurrentActualRound(Math.max(gameOver.completedRounds, persisted.currentActualRound));
      setIsApiDemo(false);

      queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: reason === 'COMPLETED' ? GAME_PHASE.SESSION_COMPLETE : GAME_PHASE.GAME_OVER,
          activeTile: null,
          feedback:
            reason === 'COMPLETED' ? 'game.feedback.sessionComplete' : 'game.feedback.timeUp',
        };
      });

      clearPersistedSession();
      clearPendingFinalization();
    },
    [
      clearPendingFinalization,
      clearPersistedSession,
      queryClient,
      rawConfigQuery.data?.totalRounds,
    ],
  );

  useEffect(() => {
    void (async () => {
      const persisted = await storage.getSecure<PersistedActiveSession>(ACTIVE_GAME_SESSION_KEY);
      if (persisted?.sessionId && persisted.stageId === appConfig.socket.stageId) {
        setIsRestoringSession(true);
      } else {
        setIsRestoringSession(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (hasAttemptedRestoreRef.current) return;
    if (socketSession) return;
    if (!hasRawConfig || !gameStateQuery.data) return;

    hasAttemptedRestoreRef.current = true;

    void (async () => {
      const [token, persisted, pendingRaw] = await Promise.all([
        storage.getSecure<string>(STORAGE_KEYS.AUTH_TOKEN),
        storage.getSecure<PersistedActiveSession>(ACTIVE_GAME_SESSION_KEY),
        storage.getSecure<PendingGameFinalization>(PENDING_GAME_FINALIZATION_KEY),
      ]);
      const pending = isPendingGameFinalization(pendingRaw) ? pendingRaw : null;

      if (!token || !persisted) {
        setIsRestoringSession(false);
        return;
      }

      setIsRestoringSession(true);

      if (!persisted.sessionId || persisted.stageId !== appConfig.socket.stageId) {
        clearPersistedSession();
        setIsRestoringSession(false);
        return;
      }

      gameApi
        .currentSession(appConfig.socket.stageId, persisted.sessionId)
        .then(async (sessionRaw: unknown) => {
          if (!isCurrentSessionLike(sessionRaw)) {
            clearPersistedSession();
            return;
          }

          const session = sessionRaw;
          const isSessionActive = session.status === 1;
          if (!isSessionActive) {
            return finalizeRecoveredSession(persisted, pending).catch(() => {
              clearPersistedSession();
              clearPendingFinalization();
            });
          }

          if (pending && pending.sessionId === persisted.sessionId) {
            if (pending.requiresGameOver) {
              return finalizeRecoveredSession(persisted, pending).catch(() => {
                clearPersistedSession();
                clearPendingFinalization();
              });
            }
            try {
              await validateAsyncRef.current(pending.validatePayload);
              clearPendingFinalization();
            } catch {
              // Keep pending payload for next refresh retry.
            }
          }

          if (pending && pending.sessionId !== persisted.sessionId) {
            clearPendingFinalization();
            return;
          }

          setCurrentDemoRound(session.currentDemoRound ?? 0);
          setCurrentActualRound(session.currentActualRound);
          setIsApiDemo(session.isDemoMode ?? false);
          return gameStart.mutateAsync({ stageId: appConfig.socket.stageId }).then((data) => {
            setPlayMode('socket');
            setGameOverData(null);
            const startPayload = data as unknown as Record<string, unknown>;
            const startedSessionId =
              typeof startPayload.sessionId === 'string'
                ? startPayload.sessionId
                : data.gameSessionId;
            const startedDemoRound =
              typeof startPayload.currentDemoRound === 'number'
                ? startPayload.currentDemoRound
                : data.current_demo_round;
            const startedActualRound =
              typeof startPayload.currentActualRound === 'number'
                ? startPayload.currentActualRound
                : data.current_actual_round;
            const startedIsDemo =
              typeof startPayload.isDemoMode === 'boolean' ? startPayload.isDemoMode : data.isDemo;
            const startFlashDelay =
              typeof startPayload.flashDelay === 'number'
                ? startPayload.flashDelay
                : data.timeDelay;
            const normalizedSessionId = startedSessionId || '';
            const normalizedDemoRound = data.isResumed
              ? (session.currentDemoRound ??
                (typeof startedDemoRound === 'number' ? startedDemoRound : 0))
              : typeof startedDemoRound === 'number'
                ? startedDemoRound
                : 0;
            const normalizedActualRound = data.isResumed
              ? session.currentActualRound
              : typeof startedActualRound === 'number'
                ? startedActualRound
                : 1;
            const normalizedIsDemo = data.isResumed
              ? (session.isDemoMode ??
                (typeof startedIsDemo === 'boolean' ? startedIsDemo : normalizedActualRound < 1))
              : typeof startedIsDemo === 'boolean'
                ? startedIsDemo
                : normalizedActualRound < 1;
            const normalizedFlashDelay = typeof startFlashDelay === 'number' ? startFlashDelay : 0;

            const resumedSession: ApiGameSession = {
              gameSessionId: normalizedSessionId,
              endTime: data.endTime ?? '',
              isResumed: data.isResumed,
              maxRounds: baseConfig?.turnLimit ?? 0,
              serverConfig: {
                timeLimit: baseConfig?.sessionTimerSeconds ?? 0,
                maxRounds: baseConfig?.turnLimit ?? 0,
                initialSequenceLength: baseConfig?.initialSequenceLength ?? 1,
                bonusTimeRatio: 1,
                flashDelay: normalizedFlashDelay,
                cellCount: baseConfig?.boxCount ?? 4,
              },
            };

            setSocketSession(resumedSession);
            setCurrentDemoRound(normalizedDemoRound);
            setCurrentActualRound(normalizedActualRound);
            setIsApiDemo(normalizedIsDemo);
            void persistActiveSession({
              sessionId: normalizedSessionId,
              stageId: appConfig.socket.stageId,
              currentDemoRound: normalizedDemoRound,
              currentActualRound: normalizedActualRound,
              isDemoMode: normalizedIsDemo,
            });
            prefetchedSequenceRef.current = null;
            queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                phase: GAME_PHASE.LOADING,
                round: data.isResumed ? normalizedActualRound : data.currentRound,
                revealedSequence: data.sequence,
                sequence: data.sequence,
                playerInput: [],
                feedback: 'game.feedback.getReady',
              };
            });

            if (startDelayTimerRef.current) clearTimeout(startDelayTimerRef.current);
            startDelayTimerRef.current = setTimeout(() => {
              queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  phase: GAME_PHASE.SHOWING_SEQUENCE,
                  feedback: data.isResumed
                    ? 'game.feedback.sessionResumed'
                    : 'game.feedback.getReady',
                };
              });
              startDelayTimerRef.current = null;
            }, ROUND_INTIAL_START_DELAY_MS);
          });
        })
        .catch(() => {
          return finalizeRecoveredSession(persisted, pending).catch(() => {
            clearPersistedSession();
            clearPendingFinalization();
          });
        })
        .finally(() => {
          setIsRestoringSession(false);
        });
    })();
  }, [
    socketSession,
    hasRawConfig,
    gameStateQuery.data,
    clearPersistedSession,
    clearPendingFinalization,
    finalizeRecoveredSession,
    gameStart,
    baseConfig,
    persistActiveSession,
    queryClient,
  ]);

  // Stable refs so the auto-advance timer never captures a stale mutation.
  const replayRoundRef = useRef(replayRound.mutateAsync);
  replayRoundRef.current = replayRound.mutateAsync;
  const finishPlaybackRef = useRef(finishPlayback.mutateAsync);
  finishPlaybackRef.current = finishPlayback.mutateAsync;
  // Ref so the auto-advance closure always reads the current session without
  // adding socketSession to the deps array (which would reset the timer on ack).
  const socketSessionRef = useRef(socketSession);
  socketSessionRef.current = socketSession;

  // Stable refs for API round tracking — read inside timer callbacks and effects
  // to avoid stale closures without adding them to dependency arrays.
  const prefetchedSequenceRef = useRef<NextSequenceResponse | null>(null);
  // When replaying the current sequence after a wrong move, skip one prefetch cycle
  // so PLAY_AGAIN does not spam next-sequence calls on every retry.
  const skipNextPrefetchRef = useRef(false);
  // Per-tap events for the current attempt — reset on each new sequence display.
  const tapEventsRef = useRef<Array<{ sequence: number; sequenceTimestamp: string }>>([]);
  const currentDemoRoundRef = useRef(currentDemoRound);
  currentDemoRoundRef.current = currentDemoRound;
  const currentActualRoundRef = useRef(currentActualRound);
  currentActualRoundRef.current = currentActualRound;
  const isApiDemoRef = useRef(isApiDemo);
  isApiDemoRef.current = isApiDemo;
  const totalRoundsRef = useRef(rawConfigQuery.data?.totalRounds ?? 0);
  totalRoundsRef.current = rawConfigQuery.data?.totalRounds ?? 0;
  // Guards against duplicate /game-over submits for the same terminal phase.
  const gameOverSubmitKeyRef = useRef<string | null>(null);
  const isFrontendDemoRef = useRef(isFrontendDemo);
  isFrontendDemoRef.current = isFrontendDemo;
  const demoCurrentLengthRef = useRef(demoCurrentLength);
  demoCurrentLengthRef.current = demoCurrentLength;
  const demoBaseSequenceRef = useRef<number[]>([]);
  const boxCountRef = useRef(boxCount);
  boxCountRef.current = boxCount;

  // In socket mode the mock repository's internal state is stale (it never
  // receives server patches). Patching the query cache directly preserves the
  // server-authoritative round, sequence, and score fields.
  const socketFinishPlaybackRef = useRef(() => {
    queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phase: GAME_PHASE.AWAITING_INPUT,
        activeTile: null,
        feedback: 'game.feedback.yourTurn',
      };
    });
  });

  // Applies a next-sequence response into the query cache and updates round state.
  const applyNextSequence = useCallback(
    (seq: NextSequenceResponse) => {
      prefetchedSequenceRef.current = null;
      const nextPayload = seq as unknown as Record<string, unknown>;
      const nextDemoRound =
        typeof nextPayload.currentDemoRound === 'number'
          ? nextPayload.currentDemoRound
          : seq.current_demo_round;
      const nextActualRound =
        typeof nextPayload.currentActualRound === 'number'
          ? nextPayload.currentActualRound
          : seq.current_actual_round;
      const nextIsDemo =
        typeof nextPayload.isDemoMode === 'boolean' ? nextPayload.isDemoMode : seq.isDemo;
      const normalizedDemoRound = typeof nextDemoRound === 'number' ? nextDemoRound : 0;
      const normalizedActualRound = typeof nextActualRound === 'number' ? nextActualRound : 1;
      const normalizedIsDemo = typeof nextIsDemo === 'boolean' ? nextIsDemo : false;
      setCurrentDemoRound(normalizedDemoRound);
      setCurrentActualRound(normalizedActualRound);
      setIsApiDemo(normalizedIsDemo);
      if (!normalizedIsDemo && seq.endTime) {
        setSocketEndTime(seq.endTime);
      }
      queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: GAME_PHASE.SHOWING_SEQUENCE,
          round: normalizedActualRound,
          revealedSequence: seq.sequence,
          sequence: seq.sequence,
          playerInput: [],
          activeTile: null,
        };
      });
    },
    [queryClient],
  );
  const applyNextSequenceRef = useRef(applyNextSequence);
  applyNextSequenceRef.current = applyNextSequence;

  const buildSequenceRequest = useCallback(
    (session: ApiGameSession) => ({
      gameSessionId: session.gameSessionId,
      stageId: appConfig.socket.stageId,
      current_demo_round: currentDemoRoundRef.current,
      current_actual_round: currentActualRoundRef.current,
    }),
    [],
  );

  const replayCurrentSequence = useCallback(() => {
    skipNextPrefetchRef.current = true;
    tapEventsRef.current = [];
    queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phase: GAME_PHASE.SHOWING_SEQUENCE,
        playerInput: [],
        activeTile: null,
        feedback: 'game.feedback.watchCarefully',
      };
    });
  }, [queryClient]);

  // Auto-advance after round-success or round-failure
  useEffect(() => {
    const phase = state?.phase;
    if (phase !== GAME_PHASE.ROUND_SUCCESS && phase !== GAME_PHASE.ROUND_FAILURE) return;

    const timer = setTimeout(() => {
      // Guard against stale closures: if phase was changed externally (e.g., demo
      // skipped via Done button) before this timer fires, bail out immediately.
      const livePhase = queryClient.getQueryData<GameState>(GAME_STATE_QUERY_KEY)?.phase;
      if (livePhase !== phase) return;

      if (isFrontendDemoRef.current) {
        if (phase === GAME_PHASE.ROUND_FAILURE) {
          replayCurrentSequence();
        } else {
          const nextLength = demoCurrentLengthRef.current + 1;
          if (nextLength > demoMaxSequence) {
            setShowDemoCompleteModal(true);
          } else {
            setDemoCurrentLength(nextLength);
            const nextTile = Math.floor(Math.random() * boxCountRef.current) + 1;
            const newSeq = [...demoBaseSequenceRef.current, nextTile];
            demoBaseSequenceRef.current = newSeq;
            queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                phase: GAME_PHASE.SHOWING_SEQUENCE,
                round: nextLength - demoMinSequence + 1,
                revealedSequence: newSeq,
                sequence: newSeq,
                playerInput: [],
                activeTile: null,
              };
            });
          }
        }
        return;
      }

      if (phase === GAME_PHASE.ROUND_FAILURE) {
        if (socketSessionRef.current) {
          // Send validate for the failed attempt, then branch behavior by wrongMoveHandling.
          const session = socketSessionRef.current;
          const events = [...tapEventsRef.current];
          const isDemoPhase = isApiDemoRef.current;
          const validatePayload: ValidateRequest = {
            gameSessionId: session.gameSessionId,
            roundNumber: currentActualRoundRef.current,
            playerSequence: events.map((e) => e.sequence),
            sequenceEvents: events,
            timestamp: new Date().toISOString(),
            isCorrect: false,
          };
          if (!isDemoPhase) {
            void submitValidateWithRecovery(validatePayload, 'TIME_UP', false);
          } else {
            validateRef.current(validatePayload);
          }

          const wrongMoveHandlingCandidate = Number(rawConfigQuery.data?.wrongMoveHandling);
          const wrongMoveHandling = Number.isFinite(wrongMoveHandlingCandidate)
            ? wrongMoveHandlingCandidate
            : WRONG_MOVE_HANDLING.NEXT_SEQUENCE;
          const sequenceReq = buildSequenceRequest(session);
          const hasPreviousSequence = isDemoPhase
            ? currentDemoRoundRef.current > 1
            : currentActualRoundRef.current > 1;

          // During demo rounds, GAME_END must not terminate the whole session.
          // Fallback to replaying current sequence.
          if (wrongMoveHandling === WRONG_MOVE_HANDLING.GAME_END && isDemoPhase) {
            replayCurrentSequence();
            return;
          }

          if (wrongMoveHandling === WRONG_MOVE_HANDLING.GAME_END) {
            tapEventsRef.current = [];
            queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                phase: GAME_PHASE.GAME_OVER,
                activeTile: null,
                feedback: 'game.feedback.timeUp',
              };
            });
            return;
          }

          if (wrongMoveHandling === WRONG_MOVE_HANDLING.PLAY_AGAIN) {
            replayCurrentSequence();
            return;
          }

          if (wrongMoveHandling === WRONG_MOVE_HANDLING.PREV_SEQUENCE) {
            // No previous sequence exists on the first demo/actual round.
            if (!hasPreviousSequence) {
              replayCurrentSequence();
              return;
            }

            void (async () => {
              try {
                const seq = await prevSeqMutateRef.current(sequenceReq);
                if (!seq.sequence.length) {
                  replayCurrentSequence();
                  return;
                }
                applyNextSequenceRef.current(seq);
              } catch {
                replayCurrentSequence();
              }
            })();
            return;
          }

          // NEXT_SEQUENCE (default): end the game on the last actual round,
          // otherwise advance to the next sequence with safe fallback to replay-current.
          const isLastActualRoundOnWrong =
            !isDemoPhase &&
            totalRoundsRef.current > 0 &&
            currentActualRoundRef.current >= totalRoundsRef.current;

          if (isLastActualRoundOnWrong) {
            tapEventsRef.current = [];
            queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                phase: GAME_PHASE.GAME_OVER,
                activeTile: null,
                feedback: 'game.feedback.gameOver',
              };
            });
            return;
          }

          const prefetched = prefetchedSequenceRef.current;
          if (prefetched) {
            applyNextSequenceRef.current(prefetched);
            return;
          }

          void (async () => {
            try {
              const seq = await nextSeqMutateRef.current(sequenceReq);
              if (!seq.sequence.length) {
                replayCurrentSequence();
                return;
              }
              applyNextSequenceRef.current(seq);
            } catch {
              replayCurrentSequence();
            }
          })();
        } else {
          void finishPlaybackRef.current();
        }
      } else if (socketSessionRef.current) {
        // API mode: send validate then apply next sequence (pre-fetched or on-demand).
        const session = socketSessionRef.current;
        const events = [...tapEventsRef.current];
        const isLastActualRound =
          !isApiDemoRef.current &&
          totalRoundsRef.current > 0 &&
          currentActualRoundRef.current >= totalRoundsRef.current;
        if (isLastActualRound) {
          const validatePayload: ValidateRequest = {
            gameSessionId: session.gameSessionId,
            roundNumber: currentActualRoundRef.current,
            playerSequence: events.map((e) => e.sequence),
            sequenceEvents: events,
            timestamp: new Date().toISOString(),
            isCorrect: true,
          };
          // Await validate so the backend stores the final score before game-over is called.
          void (async () => {
            await submitValidateWithRecovery(validatePayload, 'COMPLETED', true);
            tapEventsRef.current = [];
            queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                phase: GAME_PHASE.SESSION_COMPLETE,
                activeTile: null,
                feedback: 'game.feedback.sessionComplete',
              };
            });
          })();
          return;
        }
        const validatePayload: ValidateRequest = {
          gameSessionId: session.gameSessionId,
          roundNumber: currentActualRoundRef.current,
          playerSequence: events.map((e) => e.sequence),
          sequenceEvents: events,
          timestamp: new Date().toISOString(),
          isCorrect: true,
        };
        if (!isApiDemoRef.current) {
          void submitValidateWithRecovery(validatePayload, 'TIME_UP', false);
        } else {
          validateRef.current(validatePayload);
        }
        const prefetched = prefetchedSequenceRef.current;
        if (prefetched) {
          applyNextSequenceRef.current(prefetched);
        } else {
          void (async () => {
            try {
              const seq = await nextSeqMutateRef.current({
                gameSessionId: session.gameSessionId,
                stageId: appConfig.socket.stageId,
                current_demo_round: currentDemoRoundRef.current,
                current_actual_round: currentActualRoundRef.current,
              });
              applyNextSequenceRef.current(seq);
            } catch (err: unknown) {
              showApiError({
                title: tRef.current('errors.requestFailed'),
                description: getApiErrorMessage(err, tRef.current('game.toast.somethingWrong')),
              });
            }
          })();
        }
      } else {
        // Practice mode: advance locally.
        void replayRoundRef.current();
      }
    }, ROUND_TRANSITION_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [
    state?.phase,
    queryClient,
    rawConfigQuery.data?.wrongMoveHandling,
    demoMinSequence,
    demoMaxSequence,
    buildSequenceRequest,
    replayCurrentSequence,
    submitValidateWithRecovery,
    showApiError,
  ]);

  // Increment playbackKey and reset tap-event buffer every time a new sequence starts.
  useEffect(() => {
    if (state?.phase === GAME_PHASE.SHOWING_SEQUENCE) {
      setPlaybackKey((k) => k + 1);
      tapEventsRef.current = [];
    }
  }, [state?.phase]);

  // API terminal submit: once per terminal reason for the active session.
  useEffect(() => {
    if (!socketSession) return;
    if (state?.phase !== GAME_PHASE.GAME_OVER && state?.phase !== GAME_PHASE.SESSION_COMPLETE)
      return;
    const reason = state.phase === GAME_PHASE.SESSION_COMPLETE ? 'COMPLETED' : 'TIME_UP';
    const submitKey = `${socketSession.gameSessionId}:${reason}`;
    if (gameOverSubmitKeyRef.current === submitKey) return;
    gameOverSubmitKeyRef.current = submitKey;

    gameOverMutation
      .mutateAsync({
        gameSessionId: socketSession.gameSessionId,
        reason,
        completedRounds: Math.max(0, currentActualRoundRef.current),
        timestamp: new Date().toISOString(),
      })
      .then((response) => {
        clearPendingFinalization();
        setGameOverData(response);
      })
      .catch((err: unknown) => {
        showApiError({
          title: tRef.current('errors.requestFailed'),
          description: getApiErrorMessage(err, tRef.current('game.toast.somethingWrong')),
        });
      });
  }, [socketSession, state?.phase, gameOverMutation, clearPendingFinalization, showApiError]);

  useEffect(() => {
    if (!socketSession) return;
    if (isTerminalPhase) {
      clearPersistedSession();
      return;
    }

    void persistActiveSession({
      sessionId: socketSession.gameSessionId,
      stageId: appConfig.socket.stageId,
      currentDemoRound,
      currentActualRound,
      isDemoMode: isApiDemo,
    });
  }, [
    socketSession,
    currentDemoRound,
    currentActualRound,
    isApiDemo,
    isTerminalPhase,
    persistActiveSession,
    clearPersistedSession,
  ]);

  // API mode timer-expiry fallback:
  // If server game-over push is delayed/missed, force a local TIME_UP terminal phase
  // so the game-over submit flow runs and fetches final results.
  useEffect(() => {
    if (!socketSession) return;
    if (isFrontendDemo) return;
    if (sessionTimerDisplay !== 0) return;
    if (
      !state?.phase ||
      (
        [
          GAME_PHASE.GAME_OVER,
          GAME_PHASE.SESSION_COMPLETE,
          GAME_PHASE.READY,
          GAME_PHASE.LOADING,
        ] as GamePhase[]
      ).includes(state.phase)
    ) {
      return;
    }

    tapEventsRef.current = [];
    queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phase: GAME_PHASE.GAME_OVER,
        activeTile: null,
        feedback: 'game.feedback.timeUp',
      };
    });
  }, [socketSession, isDemoRound, isFrontendDemo, sessionTimerDisplay, state?.phase, queryClient]);

  // Pre-fetch the next sequence in the background while the current one is playing.
  // Skipped for the last demo round — that fetch is deferred until after the player
  // inputs so the backend knows demo is complete before sending the first real round.
  // Also skipped for the last actual round because the game should go to game-over.
  useEffect(() => {
    if (state?.phase !== GAME_PHASE.SHOWING_SEQUENCE) return;
    const session = socketSessionRef.current;
    if (!session) return;
    if (skipNextPrefetchRef.current) {
      skipNextPrefetchRef.current = false;
      return;
    }

    const totalDemo = rawConfigQuery.data?.totalDemoRounds ?? 0;
    const totalRounds = rawConfigQuery.data?.totalRounds ?? 0;
    const isLastDemo =
      isApiDemoRef.current && totalDemo > 0 && currentDemoRoundRef.current >= totalDemo;
    const isLastActualRound =
      !isApiDemoRef.current && totalRounds > 0 && currentActualRoundRef.current >= totalRounds;
    if (isLastDemo || isLastActualRound) return;

    nextSeqMutateRef
      .current({
        gameSessionId: session.gameSessionId,
        stageId: appConfig.socket.stageId,
        current_demo_round: currentDemoRoundRef.current,
        current_actual_round: currentActualRoundRef.current,
      })
      .then((data) => {
        prefetchedSequenceRef.current = data;
      })
      .catch(() => undefined);
  }, [state?.phase, rawConfigQuery.data?.totalDemoRounds, rawConfigQuery.data?.totalRounds]);

  const handlePlaybackComplete = useCallback(() => {
    // Guard: if phase changed away from SHOWING_SEQUENCE (e.g., demo skipped via Done),
    // the playback is stale — don't transition game state.
    const livePhase = queryClient.getQueryData<GameState>(GAME_STATE_QUERY_KEY)?.phase;
    if (livePhase !== GAME_PHASE.SHOWING_SEQUENCE) return;

    // Socket mode and frontend demo: patch cache directly to avoid reading stale mock repo state.
    if (socketSessionRef.current || isFrontendDemoRef.current) {
      socketFinishPlaybackRef.current();
    } else {
      void finishPlayback.mutateAsync();
    }
  }, [finishPlayback, queryClient]);

  const activePlaybackTile = useSequencePlayback({
    sequence: state?.revealedSequence ?? [],
    playbackMs: Math.round(
      (config?.playback.tileFlashMs ?? difficulty?.playbackMs ?? 450) *
        (config?.playback.speedMultiplier ?? 1),
    ),
    gapMs: Math.round(
      (socketSession?.serverConfig.flashDelay ??
        config?.playback.tileGapMs ??
        difficulty?.gapMs ??
        120) * (config?.playback.speedMultiplier ?? 1),
    ),
    enabled: state?.phase === GAME_PHASE.SHOWING_SEQUENCE,
    onComplete: handlePlaybackComplete,
    playbackKey,
  });

  useParentResizeNotifier(state?.score ?? 0, state?.level ?? 1, state?.lives ?? 0);

  // Visual cue effects (wrong shake / success flash)
  useEffect(() => {
    const phase = state?.phase;
    if (!phase) return;

    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    const enteredFailurePhase = previousPhase !== phase && phase === GAME_PHASE.ROUND_FAILURE;
    const enteredSuccessPhase = previousPhase !== phase && phase === GAME_PHASE.ROUND_SUCCESS;

    if (!enteredFailurePhase && !enteredSuccessPhase) return;

    if (enteredFailurePhase) {
      if (wrongCueTimerRef.current) clearTimeout(wrongCueTimerRef.current);
      setWrongCueActive(true);
      wrongCueTimerRef.current = setTimeout(() => {
        setWrongCueActive(false);
        setWrongTileId(null);
        wrongCueTimerRef.current = null;
      }, 1000);
    }

    if (enteredSuccessPhase) {
      setLevelCompleteBurst(true);
      if (levelCompleteBurstTimerRef.current) {
        clearTimeout(levelCompleteBurstTimerRef.current);
      }
      levelCompleteBurstTimerRef.current = setTimeout(() => {
        setLevelCompleteBurst(false);
        levelCompleteBurstTimerRef.current = null;
      }, 2300);
    }
  }, [state?.phase]);

  useEffect(() => {
    return () => {
      if (wrongCueTimerRef.current) clearTimeout(wrongCueTimerRef.current);
      if (levelCompleteBurstTimerRef.current) clearTimeout(levelCompleteBurstTimerRef.current);
      if (startDelayTimerRef.current) clearTimeout(startDelayTimerRef.current);
    };
  }, []);

  // Unified tile input: routes to API session flow when active, mock otherwise
  const handleTileInput = useCallback(
    (tileId: number) => {
      if (socketSession || isFrontendDemoRef.current) {
        // API mode / frontend demo: client-side correctness check against the live cache.
        // The local GameRepository is NOT called — its internal state is never
        // started in API mode, so calling submitMove would overwrite the cache
        // with the repository's initial 'ready' state.
        const preState = queryClient.getQueryData<GameState>(GAME_STATE_QUERY_KEY);
        if (preState?.phase === GAME_PHASE.AWAITING_INPUT) {
          const correct = preState.revealedSequence[preState.playerInput.length] === tileId;
          if (!correct) setWrongTileId(tileId);
        }
        if (socketSession) {
          tapEventsRef.current.push({
            sequence: tileId,
            sequenceTimestamp: new Date().toISOString(),
          });
        }
        queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
          if (!prev || prev.phase !== GAME_PHASE.AWAITING_INPUT) return prev;
          const correct = prev.revealedSequence[prev.playerInput.length] === tileId;
          if (!correct) {
            return {
              ...prev,
              phase: GAME_PHASE.ROUND_FAILURE,
              playerInput: [],
              streak: 0,
              activeTile: null,
              feedback: 'game.feedback.wrongTryAgain',
            };
          }
          const nextInput = [...prev.playerInput, tileId];
          if (nextInput.length < prev.revealedSequence.length) {
            return {
              ...prev,
              playerInput: nextInput,
              activeTile: tileId,
              feedback: 'game.feedback.keepGoing',
            };
          }
          return {
            ...prev,
            phase: GAME_PHASE.ROUND_SUCCESS,
            // Keep the completed taps visible briefly until the next sequence starts.
            playerInput: nextInput,
            streak: prev.streak + 1,
            activeTile: tileId,
            feedback: 'game.feedback.correct',
          };
        });
      } else {
        // Practice mode: run through the local game repository.
        const preState = queryClient.getQueryData<GameState>(GAME_STATE_QUERY_KEY);
        if (preState?.phase === GAME_PHASE.AWAITING_INPUT) {
          const correct = preState.revealedSequence[preState.playerInput.length] === tileId;
          if (!correct) setWrongTileId(tileId);
        }
        void submitMove.mutateAsync(tileId);
      }
    },
    [socketSession, submitMove, queryClient],
  );

  // Keyboard: support keys 1..boxCount
  useEffect(() => {
    /**
     * Key handler.
     *
     * @param {KeyboardEvent} event - The event.
     *
     * @returns {void} No return value.
     */
    const keyHandler = (event: KeyboardEvent) => {
      if (!state || state.phase !== GAME_PHASE.AWAITING_INPUT) return;
      const keyNum = Number(event.key);
      if (Number.isInteger(keyNum) && keyNum >= 1 && keyNum <= boxCount) {
        handleTileInput(keyNum);
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
    };
  }, [state, handleTileInput, boxCount]);

  /**
   * Gets round transition instruction.
   *
   * @returns {string | null} The result of getRoundTransitionInstruction.
   */
  const getRoundTransitionInstruction = (): string | null => {
    if (!state || isDemoRound) return null;
    if (state.phase === GAME_PHASE.ROUND_SUCCESS) {
      const totalRounds = rawConfigQuery.data?.totalRounds ?? 0;
      const isLastRound = totalRounds > 0 && currentActualRound >= totalRounds;
      return isLastRound
        ? ROUND_LAST_MESSAGE
        : (ROUND_TRANSITION_MESSAGE[WRONG_MOVE_HANDLING.NEXT_SEQUENCE] ?? null);
    }
    if (state.phase === GAME_PHASE.ROUND_FAILURE) {
      if (isFrontendDemo) return null;
      const wrongMoveHandling = Number(rawConfigQuery.data?.wrongMoveHandling);
      return (
        ROUND_TRANSITION_MESSAGE[wrongMoveHandling as keyof typeof ROUND_TRANSITION_MESSAGE] ?? null
      );
    }
    return null;
  };

  const canInput = state?.phase === GAME_PHASE.AWAITING_INPUT;
  const disableBoard = !canInput || submitMove.isPending;
  const inputGlowMs = 300;
  const boardMode: BoardMode = !state
    ? BOARD_MODE.IDLE
    : state.phase === GAME_PHASE.SHOWING_SEQUENCE
      ? BOARD_MODE.PLAYBACK
      : canInput
        ? BOARD_MODE.INPUT
        : BOARD_MODE.IDLE;

  /**
   * Handles restart.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  const handleRestart = async () => {
    clearPersistedSession();
    setSocketSession(null);
    socketSessionRef.current = null;
    setSocketEndTime(null);
    setCurrentDemoRound(0);
    setCurrentActualRound(0);
    setIsApiDemo(false);
    gameOverSubmitKeyRef.current = null;
    prefetchedSequenceRef.current = null;
    resetTimer();
    await restartGame.mutateAsync();
  };

  /**
   * Handles start.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  const handleStart = async (isRetry = false) => {
    if (!window.navigator.onLine) {
      showApiError({
        variant: 'warning',
        title: t('errors.offline'),
        description: t('game.toast.offline'),
      });
      return;
    }

    clearApiError();
    setPlayMode('socket');
    setGameOverData(null);
    try {
      await audio.unlockAudio();
      const data: GameStartResponse = await gameStart.mutateAsync({
        stageId: appConfig.socket.stageId,
      });
      const startPayload = data as unknown as Record<string, unknown>;
      const startedSessionId =
        typeof startPayload.sessionId === 'string' ? startPayload.sessionId : data.gameSessionId;
      const startedDemoRound =
        typeof startPayload.currentDemoRound === 'number'
          ? startPayload.currentDemoRound
          : data.current_demo_round;
      const startedActualRound =
        typeof startPayload.currentActualRound === 'number'
          ? startPayload.currentActualRound
          : data.current_actual_round;
      const startedIsDemo =
        typeof startPayload.isDemoMode === 'boolean' ? startPayload.isDemoMode : data.isDemo;
      const startFlashDelay =
        typeof startPayload.flashDelay === 'number' ? startPayload.flashDelay : data.timeDelay;
      const normalizedSessionId = startedSessionId || '';
      const normalizedDemoRound = typeof startedDemoRound === 'number' ? startedDemoRound : 0;
      const normalizedActualRound = typeof startedActualRound === 'number' ? startedActualRound : 1;
      const normalizedIsDemo = typeof startedIsDemo === 'boolean' ? startedIsDemo : false;
      const normalizedFlashDelay = typeof startFlashDelay === 'number' ? startFlashDelay : 0;

      const session: ApiGameSession = {
        gameSessionId: normalizedSessionId,
        endTime: data.endTime ?? '',
        isResumed: data.isResumed,
        maxRounds: baseConfig?.turnLimit ?? 0,
        serverConfig: {
          timeLimit: baseConfig?.sessionTimerSeconds ?? 0,
          maxRounds: baseConfig?.turnLimit ?? 0,
          initialSequenceLength: baseConfig?.initialSequenceLength ?? 1,
          bonusTimeRatio: 1,
          flashDelay: normalizedFlashDelay,
          cellCount: baseConfig?.boxCount ?? 4,
        },
      };

      setSocketSession(session);
      setCurrentDemoRound(normalizedDemoRound);
      setCurrentActualRound(normalizedActualRound);
      setIsApiDemo(normalizedIsDemo);
      void persistActiveSession({
        sessionId: normalizedSessionId,
        stageId: appConfig.socket.stageId,
        currentDemoRound: normalizedDemoRound,
        currentActualRound: normalizedActualRound,
        isDemoMode: normalizedIsDemo,
      });
      prefetchedSequenceRef.current = null;

      if (startDelayTimerRef.current) clearTimeout(startDelayTimerRef.current);
      queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: GAME_PHASE.LOADING,
          round: data.currentRound,
          revealedSequence: data.sequence,
          sequence: data.sequence,
          playerInput: [],
          feedback: 'game.feedback.getReady',
        };
      });

      startDelayTimerRef.current = setTimeout(() => {
        queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phase: GAME_PHASE.SHOWING_SEQUENCE,
            feedback: data.isResumed ? 'game.feedback.sessionResumed' : 'game.feedback.getReady',
          };
        });
        startDelayTimerRef.current = null;
      }, ROUND_INTIAL_START_DELAY_MS);
    } catch (err: unknown) {
      // TODO(temp): 409 dev-session refresh — stage already completed, refresh session and retry
      if (!isRetry && err instanceof ApiRequestError && err.statusCode === 409) {
        try {
          const sessionData = await fetchDevSession(appConfig.socket.stageId);
          await storage.setSecure(STORAGE_KEYS.AUTH_TOKEN, sessionData.token);
          await handleStart(true);
          return;
        } catch {
          // fall through to show error if retry also fails
        }
      }
      // end TODO(temp)
      showApiError({
        title: t('errors.startFailed'),
        description: getApiErrorMessage(err, t('game.toast.somethingWrong')),
      });
    }
  };

  /**
   * Handles end game confirm.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  const handleEndGameConfirm = async () => {
    setEndGameConfirmOpen(false);
    await handleRestart();
  };

  /**
   * Handles practice back to lobby.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  const handlePracticeBackToLobby = async () => {
    clearPersistedSession();
    setPlayMode('socket');
    setSocketSession(null);
    socketSessionRef.current = null;
    setGameOverData(null);
    setSocketEndTime(null);
    gameOverSubmitKeyRef.current = null;
    resetTimer();
    await freshResetBaseGame.mutateAsync();
  };

  /**
   * Handles practice start real game.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  const handlePracticeStartRealGame = async () => {
    await handleStart();
  };

  const handleLearnHowToPlay = () => {
    if (!isLearnHowToPlayEnabled) return;
    const length = demoMinSequence;
    setIsFrontendDemo(true);
    setDemoCurrentLength(length);
    const seq = generateDemoSequence(length, boxCount);
    demoBaseSequenceRef.current = seq;
    queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phase: GAME_PHASE.LOADING,
        round: 1,
        revealedSequence: seq,
        sequence: seq,
        playerInput: [],
        activeTile: null,
        feedback: 'game.feedback.watchSequence',
      };
    });
    if (startDelayTimerRef.current) clearTimeout(startDelayTimerRef.current);
    startDelayTimerRef.current = setTimeout(() => {
      queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return { ...prev, phase: GAME_PHASE.SHOWING_SEQUENCE };
      });
      startDelayTimerRef.current = null;
    }, ROUND_INTIAL_START_DELAY_MS);
  };

  const handleSkipDemo = () => {
    if (startDelayTimerRef.current) clearTimeout(startDelayTimerRef.current);
    setIsFrontendDemo(false);
    setDemoCurrentLength(demoMinSequence);
    demoBaseSequenceRef.current = [];
    queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
      if (!prev) return prev;
      return { ...prev, phase: GAME_PHASE.READY, playerInput: [], activeTile: null };
    });
  };

  const finishDemo = useCallback(() => {
    setIsFrontendDemo(false);
    setDemoCurrentLength(demoMinSequence);
    demoBaseSequenceRef.current = [];
    setShowDemoCompleteModal(false);
    queryClient.setQueryData<GameState>(GAME_STATE_QUERY_KEY, (prev) => {
      if (!prev) return prev;
      return { ...prev, phase: GAME_PHASE.READY, playerInput: [], activeTile: null };
    });
  }, [demoMinSequence, queryClient]);

  const isStarting = gameStart.isPending || startGame.isPending;

  const isLobbyPhase =
    hasRawConfig &&
    !socketSession &&
    !isRestoringSession &&
    (state?.phase === GAME_PHASE.READY || (!state && !gameStateQuery.isError));

  useLayoutEffect(() => {
    const board = boardCenterRef.current;
    if (!board) return undefined;

    const root = document.documentElement;
    let animationFrameId: number | null = null;

    const updateMandalaCenter = () => {
      animationFrameId = null;
      const rect = board.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      root.style.setProperty(
        '--sequence-board-center-x',
        `${String(rect.left + rect.width / 2)}px`,
      );
      root.style.setProperty(
        '--sequence-board-center-y',
        `${String(rect.top + rect.height / 2)}px`,
      );
    };

    const scheduleUpdate = () => {
      if (animationFrameId !== null) return;
      animationFrameId = window.requestAnimationFrame(updateMandalaCenter);
    };

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate);

    scheduleUpdate();
    resizeObserver?.observe(board);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
      root.style.removeProperty('--sequence-board-center-x');
      root.style.removeProperty('--sequence-board-center-y');
    };
  }, [boxCount, state?.phase]);

  if (isRestoringSession && !socketSession) {
    return <AuthGateScreen gameThemeStyle={gameThemeStyle} error={null} loaderOnly />;
  }

  if (isLobbyPhase) {
    return (
      <InstructionsLobbyScreen
        stage={appConfig.socket.stageNumber}
        isStarting={isStarting || gameStateQuery.isLoading}
        onPlayNow={() => void handleStart()}
        onLearnHowToPlay={isLearnHowToPlayEnabled ? handleLearnHowToPlay : undefined}
        hideLearnHowToPlay={!isLearnHowToPlayEnabled}
        contentByStage={stageContentByStage}
        isContentLoading={isStageContentLoading}
      />
    );
  }

  if (
    configQuery.isError ||
    rawConfigQuery.isError ||
    gameStateQuery.isError ||
    !config ||
    !state
  ) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto w-full max-w-full px-0 min-h-screen"
      >
        <Card className="relative overflow-hidden rounded-[8px] bg-transparent !border-0">
          <div
            className="background-layer"
            style={{ backgroundImage: `url('${IMAGES.brownBg}')` }}
          />
          <div className="pointer-events-none absolute inset-0" />
          <CardContent className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-between md:justify-center gap-6 px-3 py-3">
            <p className="text-[13px] uppercase tracking-[0.18em] !text-[#9E9BA4]">
              {t('game.errorTitle')}
            </p>
            <div className="flex w-full items-center gap-3 rounded-[8px] border border-rose-500/60 bg-slate-950/75 px-4 py-5 text-amber-100">
              <AlertTriangle size={18} />
              <span className="text-sm tracking-[0.08em]">{t('game.errorMessage')}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="rounded-[8px] border border-amber-400/60 bg-amber-500/20 px-6 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200 transition-colors hover:bg-amber-500/30"
            >
              {t('game.errorRefresh')}
            </button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const practiceCompleteOpen =
    playMode === 'practice' && state.phase === GAME_PHASE.SESSION_COMPLETE;
  const instructionText =
    getRoundTransitionInstruction() ??
    (isDemoRound || isFrontendDemo ? (BOARD_INSTRUCTION[boardMode] ?? null) : null);
  const headerLevelLabel =
    state.phase === GAME_PHASE.ROUND_SUCCESS
      ? t('game.levelComplete')
      : isFrontendDemo
        ? t('game.demo')
        : isDemoRound
          ? `${t('game.level')} ${String(Math.max(1, currentDemoRound)).padStart(2, '0')}`
          : `${t('game.level')} ${String(Math.max(1, currentActualRound)).padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mx-auto w-full max-w-full px-0 min-h-screen"
    >
      <Card
        className={`game-shell relative !border-0 overflow-hidden rounded-[8px] bg-transparent ${wrongCueActive ? 'game-shell-wrong-glow' : ''} ${levelCompleteBurst ? 'game-shell--level-complete' : ''}`}
        // style={{ cursor: `url('${IMAGES.handCursor}') 8 4, auto` }}
      >
        <div className="background-layer" style={{ backgroundImage: `url('${IMAGES.brownBg}')` }} />
        {levelCompleteBurst && <div className="level-complete-burst" aria-hidden="true" />}
        <div className="pointer-events-none absolute inset-0" />
        <div className="sequence-gameplay-screen relative z-10 flex min-h-[100dvh] flex-col items-center">
          <div className="gameplay-header">
            <span className="gameplay-header__level">{headerLevelLabel}</span>
            {shouldShowTimerBar && (
              <SessionTimerBar
                sessionTimerDisplay={timerDisplayValue}
                sessionTimerSeconds={timerTotalSeconds}
                sessionTimerWarning={sessionTimerWarning}
                sessionTimerCritical={sessionTimerCritical}
                isDemo={isDemoRound}
                isLoading={!isDemoRound && !isTerminalPhase && sessionTimerDisplay === null}
              />
            )}
            {isFrontendDemo && (
              <button
                type="button"
                onClick={handleSkipDemo}
                disabled={false}
                aria-disabled={false}
                className="gameplay-header-inner sequence-header-button pointer-events-auto relative z-20"
              >
                {t('game.done')}
              </button>
            )}
          </div>

          <div className="sequence-play-area">
            <div className="sequence-instruction-row flex items-center justify-center text-center">
              <p
                className={cn(
                  'sequence-instruction-text  transition-opacity duration-200 font-playfair font-semibold',
                  instructionText === BOARD_INSTRUCTION[BOARD_MODE.INPUT]
                    ? 'text-[#9E9BA4]'
                    : 'text-secondarytext',
                  instructionText ? 'opacity-100' : 'opacity-100',
                )}
              >
                {instructionText ? t(instructionText) : ''}
              </p>
            </div>

            <div ref={boardCenterRef} className="sequence-board-wrapper relative z-10">
              <CardContent className="flex items-center justify-center">
                <div
                  className={`${state.phase === GAME_PHASE.SHOWING_SEQUENCE ? 'board-pulse' : ''} ${wrongCueActive ? 'board-wrong-shake' : ''}`}
                >
                  <SequenceBoard
                    boxCount={boxCount}
                    activeTile={activePlaybackTile}
                    disabled={disableBoard}
                    mode={boardMode}
                    isDemoMode={isDemoRound}
                    audioType={audioType}
                    inputGlowMs={inputGlowMs}
                    remainingTaps={Math.max(
                      state.revealedSequence.length - state.playerInput.length,
                      0,
                    )}
                    sequenceLength={state.revealedSequence.length}
                    clickedSequence={state.playerInput}
                    onInput={handleTileInput}
                    showCompletedTick={isTerminalPhase}
                    overrideInstruction={getRoundTransitionInstruction()}
                    wrongTileId={wrongTileId}
                  />
                </div>
              </CardContent>
            </div>

            <div className="sequence-dots-slot">
              <SequenceDots
                mode={boardMode}
                sequenceLength={state.revealedSequence.length}
                clickedSequence={state.playerInput}
              />
            </div>
          </div>

          <GameResultOverlay
            open={
              state.phase === GAME_PHASE.GAME_OVER ||
              (state.phase === GAME_PHASE.SESSION_COMPLETE && playMode !== 'practice')
            }
            isSuccess={state.phase === GAME_PHASE.SESSION_COMPLETE}
            stage={appConfig.socket.stageNumber}
            gameOverData={gameOverData}
            totalRounds={rawConfigQuery.data?.totalRounds ?? 0}
            onContinue={() => {
              window.location.reload();
            }}
          />
        </div>
      </Card>

      <ConfirmationDialog
        open={endGameConfirmOpen}
        title={t('game.endGameDialog.title')}
        description={t('game.endGameDialog.description')}
        confirmLabel={
          restartGame.isPending
            ? t('game.endGameDialog.confirming')
            : t('game.endGameDialog.confirm')
        }
        confirmVariant="danger"
        isConfirming={restartGame.isPending}
        onCancel={() => {
          setEndGameConfirmOpen(false);
        }}
        onConfirm={() => void handleEndGameConfirm()}
      />

      <ConfirmationDialog
        open={practiceCompleteOpen}
        title={t('game.practiceDialog.title')}
        description={t('game.practiceDialog.description')}
        cancelLabel={t('game.practiceDialog.cancel')}
        confirmLabel={
          isStarting ? t('game.practiceDialog.confirming') : t('game.practiceDialog.confirm')
        }
        isConfirming={isStarting}
        onCancel={() => void handlePracticeBackToLobby()}
        onConfirm={() => void handlePracticeStartRealGame()}
      />

      {showDemoCompleteModal && (
        <GameClearModal
          title={t('game.demoCleared')}
          accentColor={getStageTheme(appConfig.socket.stageNumber).accent}
          eclipseColor={getStageTheme(appConfig.socket.stageNumber).eclipse}
          onConfirm={finishDemo}
        />
      )}
    </motion.div>
  );
}
