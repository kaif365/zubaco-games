'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { DetailPageLayout } from '@/components/shared/DetailPageLayout';
import { GameOverviewTab } from './GameOverviewTab';
import { useGame } from '../hooks/useGame';
import { useStageGameConfig } from '../hooks/useStageGameConfig';
import { ROUTES } from '@/config/routes';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { GamePoolTab } from './GamePoolTab';
import { getGameMetadata } from '@/config/game-registry';
import type { GameConfig } from '@/types/game-config';
import type {
  ArrowGameConfig,
  InfinityGameConfig,
  SequenceGameConfig,
  SudokuGameConfig,
  SlidingPuzzleGameConfig,
  SpotTheDifferenceGameConfig,
} from '@/types/game-config';
import type { AdminGame } from '@/types/game';
import { GameType } from '@/types/game';
import { slugifyGameName } from '@/utils/slugify';
import { useToast } from '@/providers/ToastProvider';
import { useUpdateGameByIdMutation } from '@/lib/react-query/games';

const DETAIL_TAB_IDS = ['overview', 'config', 'pool'] as const;

function buildDetailTabs(poolTabLabel: string, hasPool: boolean = true) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'config', label: 'Configuration' },
  ];

  if (hasPool) {
    tabs.push({ id: 'pool', label: poolTabLabel });
  }

  return tabs;
}

function ConfigTabContent({
  gameName,
  stageId,
  config,
  configDataUpdatedAt,
  gameId,
}: {
  gameName: string;
  stageId: string;
  config: GameConfig | null | undefined;
  configDataUpdatedAt: number;
  gameId?: string;
}) {
  const metadata = getGameMetadata(gameName);
  const ConfigComponent = metadata?.configComponent;
  const defaults =
    (metadata?.stageConfig?.defaults?.(stageId) as
      | GameConfig
      | null
      | undefined) ?? null;
  // Some APIs return `null` (no config) while others return `undefined` (no payload).
  // For games that support rendering without an existing config, always fall back to defaults.
  const effectiveConfig: GameConfig | null = config ?? defaults ?? null;

  if (!ConfigComponent) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        Configuration is not available for &quot;{gameName}&quot; yet.
      </div>
    );
  }

  if (!effectiveConfig && !metadata?.allowConfigRenderWithoutExisting) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        No configuration found for this game&apos;s stage yet.
      </div>
    );
  }

  if (!effectiveConfig) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        Configuration is not available for this game&apos;s stage yet.
      </div>
    );
  }

  return (
    <ConfigComponent
      key={`${stageId}-${effectiveConfig?.id ?? 'new'}-${configDataUpdatedAt}`}
      gameId={gameId}
      gameName={gameName}
      stageId={stageId}
      config={effectiveConfig}
      configDataUpdatedAt={configDataUpdatedAt}
    />
  );
}

function configSlugFromAdminGame(game: AdminGame): string {
  if (game.game_type?.trim()) {
    return slugifyGameName(game.game_type.replace(/_/g, ' '));
  }
  return slugifyGameName(game.name);
}

function toGameEntityConfig(game: AdminGame): GameConfig | null {
  const slug = configSlugFromAdminGame(game);

  if (
    slug === 'sequence-recall' ||
    slug === 'sequence' ||
    game.gameType === GameType.SequenceRecall
  ) {
    const config: SequenceGameConfig = {
      id: game.id,
      stageId: game.id,
      cellCount: game.cell_count ?? 4,
      timeLimit: game.time_limit ?? 60,
      minSequence: game.min_sequence ?? 3,
      maxSequence: game.max_sequence ?? 8,
      enableDemo: game.enable_demo ?? false,
      demoMinSequence: game.demo_min_sequence ?? 3,
      demoMaxSequence: game.demo_max_sequence ?? 5,
      flashDelay: game.flash_delay ?? 300,
      levelDelay: game.level_delay ?? 1,
      bonusTimeRatio: game.bonus_time_ratio ?? 2,
      scorePerClick: game.score_per_click ?? 10,
      wrongMoveHandling: game.wrong_move_handling ?? 4,
      createdAt: game.created_at,
    };
    return config;
  }

  const levelConfigs = game.level_configs ?? [];
  if (slug === 'arrows' || slug === 'block-fill') {
    const config: ArrowGameConfig = {
      id: game.id,
      stageId: game.id,
      timeLimit: game.time_limit ?? 60,
      enableDemo: game.enable_demo ?? false,
      levels: levelConfigs.map((level) => ({
        levelId: level.level_id,
        boardCount: level.board_count,
      })),
      demoLevels: levelConfigs
        .filter((level) => level.is_demo)
        .map((level) => ({
          levelId: level.level_id,
          boardCount: level.board_count,
        })),
      createdAt: game.created_at,
    };
    return config;
  }

  if (slug === 'infinity-loop') {
    const config: InfinityGameConfig = {
      id: game.id,
      stageId: game.id,
      timeLimit: game.time_limit ?? 60,
      levels: levelConfigs.map((level) => ({
        levelId: level.level_id,
        boardCount: level.board_count,
      })),
      createdAt: game.created_at,
    };
    return config;
  }

  if (slug === 'sudoku' || game.gameType === GameType.Sudoku) {
    const config: SudokuGameConfig = {
      id: game.id,
      stageId: game.id,
      timeLimit: game.time_limit ?? 60,
      enableDemo: game.enable_demo ?? false,
      levels: (levelConfigs.length > 0
        ? levelConfigs
        : (game.game_config?.levels ?? [])
      ).map((level) => ({
        levelId: level.level_id || level.levelId || level.id || '',
        boardCount: level.board_count ?? level.boardCount ?? 0,
      })),
      demoLevels: [],
      createdAt: game.created_at,
      __kind: 'sudoku',
    };
    return config;
  }

  if (slug === 'sliding-puzzle' || game.gameType === GameType.SlidingPuzzle) {
    const config: SlidingPuzzleGameConfig = {
      id: game.id,
      stageId: game.id,
      timeLimit: game.time_limit ?? 60,
      enableDemo: game.enable_demo ?? false,
      enableNumbers: (game.game_config?.enableNumbers as boolean) ?? true,
      levels: levelConfigs
        .filter((level) => !level.is_demo)
        .map((level) => ({
          levelId: level.level_id || level.levelId || level.id || '',
          boardCount: level.board_count ?? level.boardCount ?? 0,
          displayTime: level.display_time ?? level.displayTime ?? 0,
        })),
      demoLevels: levelConfigs
        .filter((level) => level.is_demo)
        .map((level) => ({
          levelId: level.level_id || level.levelId || level.id || '',
          boardCount: level.board_count ?? level.boardCount ?? 0,
          displayTime: level.display_time ?? level.displayTime ?? 0,
        })),
      createdAt: game.created_at,
      __kind: 'sliding-puzzle',
    };
    return config;
  }

  if (slug === 'spot-the-difference' || game.gameType === GameType.SpotTheDifference) {
    const levelConfigs = game.level_configs ?? [];
    const config: SpotTheDifferenceGameConfig = {
      id: game.id,
      stageId: game.id,
      timeLimit: game.time_limit ?? 300,
      hintCount: game.hint_count ?? 2,
      enableDemo: game.enable_demo ?? false,
      levels: levelConfigs
        .filter((level) => !level.is_demo)
        .map((level) => ({
          levelId: level.level_id || level.levelId || level.id || '',
          boardCount: level.board_count ?? level.boardCount ?? 0,
        })),
      demoLevels: levelConfigs
        .filter((level) => level.is_demo)
        .map((level) => ({
          levelId: level.level_id || level.levelId || level.id || '',
          boardCount: level.board_count ?? level.boardCount ?? 0,
        })),
      createdAt: game.created_at,
      __kind: 'spot-the-difference',
    };
    return config;
  }

  return null;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-border pb-0">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

interface GameDetailPageProps {
  gameId: string;
  stageId: string;
}

export function GameDetailPage({ gameId, stageId }: GameDetailPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();



  const language = searchParams.get('lang') ?? 'EN';
  const { data: game, isLoading: gameLoading } = useGame(gameId, stageId);
  const primaryStageId = stageId || game?.stages?.[0]?.id || '';
  const isStageScoped = Boolean(stageId);

  const { toast } = useToast();
  const updateMutation = useUpdateGameByIdMutation();

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const registryGameName = game?.game_type?.trim()
    ? game.game_type.replace(/_/g, ' ')
    : (game?.name ?? '');
  const metadata = getGameMetadata(registryGameName);
  const detailTabs = useMemo(
    () => buildDetailTabs(metadata?.poolTabLabel ?? 'Pool', !!metadata?.poolComponent),
    [metadata?.poolTabLabel, metadata?.poolComponent],
  );

  const tabQuery = searchParams.get('tab');
  const activeTab = useMemo(() => {
    const isValid = tabQuery && (DETAIL_TAB_IDS as readonly string[]).includes(tabQuery);
    const tabId = isValid ? tabQuery : 'overview';
    if (!detailTabs.some((t) => t.id === tabId)) {
      return 'overview';
    }
    return tabId;
  }, [tabQuery, detailTabs]);
  const configStageId = metadata?.fixedStageConfigId
    ?? (isStageScoped ? primaryStageId : (metadata?.fallbackStageConfigId ?? ''));
  const usesRemoteStageConfig = Boolean(configStageId);

  const stageConfigQuery = useStageGameConfig(configStageId, registryGameName, {
    enabled:
      Boolean(registryGameName) &&
      activeTab === 'config' &&
      usesRemoteStageConfig,
  });

  const config = usesRemoteStageConfig
    ? stageConfigQuery.data
    : game
      ? toGameEntityConfig(game)
      : null;
  const configLoading = usesRemoteStageConfig ? stageConfigQuery.isLoading : false;
  const configDataUpdatedAt = usesRemoteStageConfig
    ? stageConfigQuery.dataUpdatedAt
    : Number.isFinite(Date.parse(game?.updated_at ?? ''))
      ? Date.parse(game!.updated_at)
      : 0;

  if (gameLoading) {
    return (
      <PageContainer>
        <DetailSkeleton />
      </PageContainer>
    );
  }

  if (!game) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-lg font-medium text-foreground">Game not found</p>
          <p className="text-sm text-muted-foreground">
            The game you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Button variant="ghost" asChild>
            <Link href={ROUTES.GAMES}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Games
            </Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  const subtitle = `Total Stages: ${game.stages?.length || 0}`;
  const isActive = (game.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE';

  const handleToggleGameStatus = async () => {
    const next = isActive ? 'INACTIVE' : 'ACTIVE';

    try {
      await updateMutation.mutateAsync({
        id: game.id,
        payload: { status: next },
        stageId,
      });
      toast({
        title: `Game marked ${next}`,
        description: 'Status updated successfully.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageContainer>
      <DetailPageLayout
        title={game.name}
        subtitle={subtitle}
        actions={
          <>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1 sm:flex">
              <span
                className={[
                  'h-2 w-2 rounded-full',
                  isActive ? 'bg-emerald-500' : 'bg-white/35',
                ].join(' ')}
                aria-hidden="true"
              />
              <span
                className={[
                  'text-[10px] font-semibold uppercase tracking-[0.22em]',
                  isActive ? 'text-emerald-200/90' : 'text-white/55',
                ].join(' ')}
              >
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 rounded-xl border-white/10 bg-white/[0.02] px-5 text-sm font-semibold text-white hover:bg-white/[0.06]"
              onClick={handleToggleGameStatus}
              disabled={updateMutation.isPending}
            >
              {isActive ? 'Disable' : 'Enable'}
            </Button>
          </>
        }
        tabs={detailTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <GameOverviewTab
              game={game}
              language={language === 'HI' ? 'HI' : 'EN'}
              stageId={stageId}
            />
          </div>
        )}
        {activeTab === 'pool' && (
          <GamePoolTab
            gameId={gameId}
            gameName={isStageScoped ? game.name : registryGameName}
          />
        )}

        {activeTab === 'config' &&
          (configLoading ? (
            <div className="w-full space-y-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : (
            <ConfigTabContent
              gameId={usesRemoteStageConfig ? undefined : gameId}
              gameName={registryGameName}
              stageId={usesRemoteStageConfig ? configStageId : gameId}
              config={config}
              configDataUpdatedAt={configDataUpdatedAt}
            />
          ))}
      </DetailPageLayout>
    </PageContainer>
  );
}
