import { del, get, patch, post, put } from '@/lib/api/http';
import type {
  FilterParams,
  PaginatedResponse,
  PaginationParams,
} from '@/types/common';
import { GameType } from '@/types/game';
import type {
  AdminGame,
  Game,
  GameContentSection,
  LevelConfig,
} from '@/types/game';
import type { Stage } from '@/types/stage';

interface ApiEnvelope<TData> {
  success: boolean;
  statusCode: number;
  message: string;
  data: TData;
}

interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface ApiGame {
  id: string;
  name: string;
  type?: string;
  game_type?: string;
  status?: string;
  time_limit?: number;
  hint_count?: number;
  enable_demo?: boolean;
  cell_count?: number;
  min_sequence?: number;
  max_sequence?: number;
  demo_min_sequence?: number;
  demo_max_sequence?: number;
  flash_delay?: number;
  level_delay?: number;
  bonus_time_ratio?: number;
  score_per_click?: number;
  wrong_move_handling?: number;
  total_actual_rounds?: number;
  total_demo_rounds?: number;
  active_level_id?: string;
  il_title?: string;
  il_description?: string;
  il_background_sound_url?: string;
  il_tap_sound_url?: string;
  game_config?: Record<string, unknown>;
  meta_data_visible?: boolean;
  about_visible?: boolean;
  scoring_rules_visible?: boolean;
  anti_cheat_rules_visible?: boolean;
  about?: { content: Record<string, string[]> };
  scoringRules?: { content: Record<string, string[]> };
  antiCheatRules?: { content: Record<string, string[]> };
  level_configs?: Array<{
    level_id?: string;
    board_count?: number;
    sort_order?: number;
    is_demo?: boolean;
  }>;
  stage_content?: Array<{
    id?: string;
    game_id?: string;
    stage_id?: string;
    language: string;
    content: {
      pages: Array<{
        visible_in_app: boolean;
        title: string;
        description?: string;
        point_type: 'ORDERED' | 'UNORDERED';
        points: Array<{
          title: string;
          description?: string;
        }>;
      }>;
      play_now_button?: string;
      learn_how_to_play?: string;
    };
    created_at?: string;
    updated_at?: string;
  }>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  stages: Stage[];
  languages?: string[];
}

const GAME_TYPE_SLUGS: Partial<Record<string, GameType>> = {
  'sequence-recall': GameType.SequenceRecall,
  sequence_recall: GameType.SequenceRecall,
  sequence: GameType.SequenceRecall,
  arrow: GameType.Arrow,
  arrows: GameType.Arrow,
  arrow_game: GameType.Arrow,
  'arrow-game': GameType.Arrow,
  arrows_game: GameType.Arrow,
  'arrows-game': GameType.Arrow,
  sudoku: GameType.Sudoku,
  'sliding-puzzle': GameType.SlidingPuzzle,
  sliding_puzzle: GameType.SlidingPuzzle,
  'block-fill': GameType.BlockFill,
  block_fill: GameType.BlockFill,
  'infinity-loop': GameType.InfinityLoop,
  infinity_loop: GameType.InfinityLoop,
  'memory-card-matching': GameType.MemoryCardMatching,
  memory_card_matching: GameType.MemoryCardMatching,
};

function normalizeGameTypeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

function resolveGameType(apiGame: ApiGame): GameType {
  const fromApiType = apiGame.game_type
    ? normalizeGameTypeKey(apiGame.game_type)
    : '';
  if (fromApiType && GAME_TYPE_SLUGS[fromApiType] !== undefined) {
    return GAME_TYPE_SLUGS[fromApiType]!;
  }

  const candidate = normalizeGameTypeKey(apiGame.name);
  return GAME_TYPE_SLUGS[candidate] ?? GameType.Generic;
}

function normalizeStageContent(
  sections: ApiGame['stage_content'] | undefined,
): GameContentSection[] | undefined {
  if (!Array.isArray(sections) || sections.length === 0) return undefined;

  const normalized: GameContentSection[] = [];
  for (const section of sections) {
    const language =
      typeof section?.language === 'string' ? section.language.trim() : '';
    if (!language) continue;
    const pages = Array.isArray(section?.content?.pages)
      ? section.content!.pages!
      : [];
    normalized.push({
      id: typeof section.id === 'string' ? section.id : undefined,
      game_id:
        typeof section.game_id === 'string' ? section.game_id : undefined,
      stage_id:
        typeof section.stage_id === 'string' ? section.stage_id : undefined,
      language,
      content: {
        pages: pages
          .filter((page) => Boolean(page))
          .map((page) => ({
            visible_in_app: Boolean(page.visible_in_app),
            title: typeof page.title === 'string' ? page.title : '',
            description:
              typeof page.description === 'string'
                ? page.description
                : undefined,
            point_type: (page.point_type === 'UNORDERED'
              ? 'UNORDERED'
              : 'ORDERED') as 'ORDERED' | 'UNORDERED',
            points: (Array.isArray(page.points) ? page.points : [])
              .filter((point) => Boolean(point))
              .map((point) => ({
                title: typeof point.title === 'string' ? point.title : '',
                description:
                  typeof point.description === 'string'
                    ? point.description
                    : undefined,
              }))
              .filter(
                (point) =>
                  point.title.trim().length > 0 ||
                  Boolean(point.description?.trim()),
              ),
          }))
          .filter((page) => page.title.trim().length > 0),
        play_now_button:
          typeof section?.content?.play_now_button === 'string'
            ? section.content!.play_now_button
            : undefined,
        learn_how_to_play:
          typeof section?.content?.learn_how_to_play === 'string'
            ? section.content!.learn_how_to_play
            : undefined,
      },
      created_at:
        typeof section.created_at === 'string' ? section.created_at : undefined,
      updated_at:
        typeof section.updated_at === 'string' ? section.updated_at : undefined,
    });
  }

  return normalized.length ? normalized : undefined;
}

function migrateLegacyToContentSections(
  apiGame: ApiGame,
): GameContentSection[] | undefined {
  const sectionsByLang: Record<string, GameContentSection> = {};

  const addPage = (
    lang: string,
    title: string,
    content: string[],
    visible: boolean,
  ) => {
    const l = lang.trim().toUpperCase();
    if (!l) return;
    if (!sectionsByLang[l]) {
      sectionsByLang[l] = { language: l, content: { pages: [] } };
    }
    sectionsByLang[l].content.pages.push({
      title,
      visible_in_app: visible,
      point_type: 'UNORDERED',
      points: content.map((text) => ({ title: text })),
    });
  };

  // About
  if (apiGame.about?.content) {
    Object.entries(apiGame.about.content).forEach(([lang, content]) => {
      if (content?.length) {
        addPage(lang, 'About', content, apiGame.about_visible ?? true);
      }
    });
  }
  // Scoring Rules
  if (apiGame.scoringRules?.content) {
    Object.entries(apiGame.scoringRules.content).forEach(([lang, content]) => {
      if (content?.length) {
        addPage(
          lang,
          'Scoring Rules',
          content,
          apiGame.scoring_rules_visible ?? true,
        );
      }
    });
  }
  // Anti-Cheat Rules
  if (apiGame.antiCheatRules?.content) {
    Object.entries(apiGame.antiCheatRules.content).forEach(
      ([lang, content]) => {
        if (content?.length) {
          addPage(
            lang,
            'Anti-Cheat Rules',
            content,
            apiGame.anti_cheat_rules_visible ?? true,
          );
        }
      },
    );
  }

  const result = Object.values(sectionsByLang);
  return result.length > 0 ? result : undefined;
}
function normalizeLevelConfigs(
  configs: ApiGame['level_configs'] | undefined,
): AdminGame['level_configs'] | undefined {
  if (!configs?.length) return undefined;

  return configs
    .filter(
      (entry): entry is Partial<LevelConfig> & { level_id: string } =>
        Boolean(entry) && typeof entry.level_id === 'string',
    )
    .map((entry, index) => ({
      level_id: entry.level_id,
      board_count:
        typeof entry.board_count === 'number' ? entry.board_count : 0,
      sort_order:
        typeof entry.sort_order === 'number' ? entry.sort_order : index,
      is_demo: typeof entry.is_demo === 'boolean' ? entry.is_demo : false,
    }));
}

function deriveLegacySections(apiGame: ApiGame) {
  const sections: {
    about: { visibleInApp: boolean; content: Record<string, string[]> };
    scoringRules: { visibleInApp: boolean; content: Record<string, string[]> };
    antiCheatRules: {
      visibleInApp: boolean;
      content: Record<string, string[]>;
    };
  } = {
    about: {
      visibleInApp: apiGame.about_visible ?? true,
      content: apiGame.about?.content ?? {},
    },
    scoringRules: {
      visibleInApp: apiGame.scoring_rules_visible ?? true,
      content: apiGame.scoringRules?.content ?? {},
    },
    antiCheatRules: {
      visibleInApp: apiGame.anti_cheat_rules_visible ?? true,
      content: apiGame.antiCheatRules?.content ?? {},
    },
  };

  apiGame.stage_content?.forEach((section) => {
    const lang = section.language.toLowerCase();

    // About
    const aboutPage = section.content.pages.find(
      (p) => p.title.toUpperCase() === 'ABOUT',
    );
    if (aboutPage) {
      sections.about.content[lang] = [
        aboutPage.description || '',
        ...aboutPage.points.map((p) => p.description || ''),
      ].filter(Boolean);
      sections.about.visibleInApp = aboutPage.visible_in_app;
    }

    // Scoring Rules
    const scoringPage = section.content.pages.find(
      (p) => p.title.toUpperCase() === 'SCORING_RULES',
    );
    if (scoringPage) {
      sections.scoringRules.content[lang] = scoringPage.points
        .map((p) => p.description || '')
        .filter(Boolean);
      sections.scoringRules.visibleInApp = scoringPage.visible_in_app;
    }

    // Anti-Cheat Rules
    const antiCheatPage = section.content.pages.find(
      (p) => p.title.toUpperCase() === 'ANTI_CHEAT_RULES',
    );
    if (antiCheatPage) {
      sections.antiCheatRules.content[lang] = antiCheatPage.points
        .map((p) => p.description || '')
        .filter(Boolean);
      sections.antiCheatRules.visibleInApp = antiCheatPage.visible_in_app;
    }
  });

  return sections;
}

interface GamesListData {
  items: ApiGame[];
  pagination: ApiPagination;
}

function mapApiGameToTableModel(item: ApiGame): Game {
  const normalizedStatus = (item.status ?? '').toLowerCase();
  const status: Game['status'] =
    normalizedStatus === 'inactive' || normalizedStatus === 'disabled'
      ? 'inactive'
      : normalizedStatus === 'draft'
        ? 'draft'
        : 'active';

  return {
    id: item.id,
    name: item.name,
    totalLevels: item.stages.length,
    createdAt: item.created_at,
    lastUpdated: item.updated_at,
    stages: item.stages,
    category: 'puzzle',
    status,
  };
}

export interface FetchGamesParams extends PaginationParams, FilterParams {
  token?: string;
}

export async function fetchGames(
  params: FetchGamesParams,
): Promise<PaginatedResponse<Game>> {
  const payload = await get<ApiEnvelope<GamesListData>>('/admin/games', {
    token: params.token,
    query: {
      page: params.page,
      limit: params.pageSize,
      search: params.search,
      status: params.status,
    },
  });

  const items = payload?.data?.items ?? [];
  const pagination = payload?.data?.pagination;
  const data = items.map(mapApiGameToTableModel);

  return {
    data,
    total: pagination?.total ?? data.length,
    page: pagination?.page ?? params.page,
    pageSize: pagination?.limit ?? params.pageSize,
    totalPages: pagination?.total_pages ?? 1,
  };
}

export async function fetchGameById(
  id: string,
  token?: string,
  stage_id?: string,
): Promise<AdminGame | null> {
  const payload = await get<ApiEnvelope<ApiGame>>(`/admin/games/${id}`, {
    token,
    query: stage_id ? { stage_id } : undefined,
    returnNullOn404: true,
  });

  const apiGame = payload?.data;
  if (!apiGame) return null;

  return {
    ...apiGame,
    gameType: resolveGameType(apiGame),
    languages: Array.isArray(apiGame.languages) ? apiGame.languages : undefined,
    content_sections:
      normalizeStageContent(apiGame.stage_content) ??
      migrateLegacyToContentSections(apiGame),
    visibleInApp:
      typeof apiGame.meta_data_visible === 'boolean'
        ? apiGame.meta_data_visible
        : undefined,
    level_configs: normalizeLevelConfigs(apiGame.level_configs),
    ...deriveLegacySections(apiGame),
  };
}

export async function fetchAdminGames(params?: {
  search?: string;
  token?: string;
}): Promise<{ items: AdminGame[]; total: number }> {
  const payload = await get<ApiEnvelope<GamesListData>>('/admin/games', {
    token: params?.token,
    query: {
      search: params?.search,
      limit: 100,
    },
  });

  const items = (payload?.data?.items ?? []).map((item) => ({
    ...item,
    gameType: resolveGameType(item),
    languages: Array.isArray(item.languages) ? item.languages : undefined,
    content_sections:
      normalizeStageContent(item.stage_content) ??
      migrateLegacyToContentSections(item),
    visibleInApp:
      typeof item.meta_data_visible === 'boolean'
        ? item.meta_data_visible
        : undefined,
    level_configs: normalizeLevelConfigs(item.level_configs),
    ...deriveLegacySections(item),
  }));

  return {
    items,
    total: payload?.data?.pagination?.total ?? items.length,
  };
}

export interface GameContentSectionPayload {
  id?: string;
  game_id?: string;
  stage_id?: string;
  language: string;
  content: {
    pages: Array<{
      visible_in_app: boolean;
      title: string;
      description?: string;
      point_type: 'ORDERED' | 'UNORDERED';
      points: Array<{
        title: string;
        description?: string;
      }>;
    }>;
    play_now_button?: string;
    learn_how_to_play?: string;
  };
}

export interface UpsertGameRequest {
  name?: string;
  game_type?: string;
  status?: string;
  time_limit?: number;
  hint_count?: number;
  enable_demo?: boolean;
  cell_count?: number;
  min_sequence?: number;
  max_sequence?: number;
  demo_min_sequence?: number;
  demo_max_sequence?: number;
  flash_delay?: number;
  level_delay?: number;
  bonus_time_ratio?: number;
  score_per_click?: number;
  wrong_move_handling?: number;
  total_actual_rounds?: number;
  total_demo_rounds?: number;
  active_level_id?: string;
  il_title?: string;
  il_description?: string;
  il_background_sound_url?: string;
  il_tap_sound_url?: string;
  about_visible?: boolean;
  scoring_rules_visible?: boolean;
  anti_cheat_rules_visible?: boolean;
  meta_data_visible?: boolean;
  game_config?: Record<string, unknown>;
  level_configs?: Array<{
    level_id: string;
    board_count: number;
    sort_order: number;
    is_demo: boolean;
  }>;
  content_sections?: GameContentSectionPayload[];
  stage_id?: string;
}

export interface UpdateGameRequest {
  visibleInApp?: boolean;
  name?: string;
  gameType?: string;
  status?: string;
  timeLimit?: number;
  hintCount?: number;
  enableDemo?: boolean;
  cellCount?: number;
  minSequence?: number;
  maxSequence?: number;
  demoMinSequence?: number;
  demoMaxSequence?: number;
  flashDelay?: number;
  levelDelay?: number;
  bonusTimeRatio?: number;
  scorePerClick?: number;
  wrongMoveHandling?: number;
  totalActualRounds?: number;
  totalDemoRounds?: number;
  activeLevelId?: string;
  ilTitle?: string;
  ilDescription?: string;
  ilBackgroundSoundUrl?: string;
  ilTapSoundUrl?: string;
  aboutVisible?: boolean;
  scoringRulesVisible?: boolean;
  antiCheatRulesVisible?: boolean;
  gameConfig?: Record<string, unknown>;
  level_configs?: Array<{
    level_id: string;
    board_count: number;
    sort_order: number;
    is_demo: boolean;
  }>;
  content_sections?: GameContentSectionPayload[];
  stageId?: string;
}

function toUpsertPayload(payload: UpdateGameRequest): UpsertGameRequest {
  return {
    name: payload.name,
    game_type: payload.gameType,
    status: payload.status,
    time_limit: payload.timeLimit,
    hint_count: payload.hintCount,
    enable_demo: payload.enableDemo,
    cell_count: payload.cellCount,
    min_sequence: payload.minSequence,
    max_sequence: payload.maxSequence,
    demo_min_sequence: payload.demoMinSequence,
    demo_max_sequence: payload.demoMaxSequence,
    flash_delay: payload.flashDelay,
    level_delay: payload.levelDelay,
    bonus_time_ratio: payload.bonusTimeRatio,
    score_per_click: payload.scorePerClick,
    wrong_move_handling: payload.wrongMoveHandling,
    total_actual_rounds: payload.totalActualRounds,
    total_demo_rounds: payload.totalDemoRounds,
    active_level_id: payload.activeLevelId,
    il_title: payload.ilTitle,
    il_description: payload.ilDescription,
    il_background_sound_url: payload.ilBackgroundSoundUrl,
    il_tap_sound_url: payload.ilTapSoundUrl,
    about_visible: payload.aboutVisible,
    scoring_rules_visible: payload.scoringRulesVisible,
    anti_cheat_rules_visible: payload.antiCheatRulesVisible,
    meta_data_visible: payload.visibleInApp,
    game_config: payload.gameConfig,
    level_configs: payload.level_configs,
    content_sections: payload.content_sections,
    stage_id: payload.stageId,
  };
}

export async function updateGameById(
  id: string,
  payload: UpdateGameRequest,
  token?: string,
): Promise<AdminGame | null> {
  const response = await put<ApiEnvelope<ApiGame>, UpsertGameRequest>(
    `/admin/games/${id}`,
    toUpsertPayload(payload),
    { token, returnNullOn404: true },
  );

  const apiGame = response?.data;
  if (!apiGame) return null;

  return {
    ...apiGame,
    gameType: resolveGameType(apiGame),
    languages: Array.isArray(apiGame.languages) ? apiGame.languages : undefined,
    content_sections:
      normalizeStageContent(apiGame.stage_content) ??
      migrateLegacyToContentSections(apiGame),
    visibleInApp:
      typeof apiGame.meta_data_visible === 'boolean'
        ? apiGame.meta_data_visible
        : undefined,
    level_configs: normalizeLevelConfigs(apiGame.level_configs),
    ...deriveLegacySections(apiGame),
  };
}

export async function patchGameById(
  id: string,
  payload: UpdateGameRequest,
  token?: string,
  stage_id?: string,
): Promise<AdminGame | null> {
  const response = await patch<ApiEnvelope<ApiGame>, UpsertGameRequest>(
    `/admin/games/${id}`,
    toUpsertPayload(payload),
    {
      token,
      query: stage_id ? { stage_id } : undefined,
      returnNullOn404: true,
    },
  );

  const apiGame = response?.data;
  if (!apiGame) return null;

  return {
    ...apiGame,
    gameType: resolveGameType(apiGame),
    languages: Array.isArray(apiGame.languages) ? apiGame.languages : undefined,
    content_sections:
      normalizeStageContent(apiGame.stage_content) ??
      migrateLegacyToContentSections(apiGame),
    visibleInApp:
      typeof apiGame.meta_data_visible === 'boolean'
        ? apiGame.meta_data_visible
        : undefined,
    level_configs: normalizeLevelConfigs(apiGame.level_configs),
    ...deriveLegacySections(apiGame),
  };
}

export async function createGame(
  payload: UpdateGameRequest,
  token?: string,
): Promise<AdminGame | null> {
  const response = await post<ApiEnvelope<ApiGame>, UpsertGameRequest>(
    '/admin/games',
    toUpsertPayload(payload),
    { token },
  );

  const apiGame = response?.data;
  if (!apiGame) return null;

  return {
    ...apiGame,
    gameType: resolveGameType(apiGame),
    languages: Array.isArray(apiGame.languages) ? apiGame.languages : undefined,
    content_sections:
      normalizeStageContent(apiGame.stage_content) ??
      migrateLegacyToContentSections(apiGame),
    visibleInApp:
      typeof apiGame.meta_data_visible === 'boolean'
        ? apiGame.meta_data_visible
        : undefined,
    level_configs: normalizeLevelConfigs(apiGame.level_configs),
    ...deriveLegacySections(apiGame),
  };
}
export async function deleteGame(id: string, token?: string): Promise<void> {
  await del(`/admin/games/${id}`, undefined, { token });
}
