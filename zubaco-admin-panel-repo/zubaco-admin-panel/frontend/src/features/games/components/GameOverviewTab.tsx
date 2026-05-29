import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/utils/format';
import {
  CalendarDays,
  GripVertical,
  Layers,
  Map as MapIcon,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AdminGame,
  GameContentPage,
  GameContentPointType,
  GameContentSection,
} from '@/types/game';
import Link from 'next/link';
import { ROUTES } from '@/config/routes';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogDrawerContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useToast } from '@/providers/ToastProvider';
import { useUpdateGameByIdMutation } from '@/lib/react-query/games';
import { cn } from '@/utils/cn';

function normalizeTitleKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Pairs EN/HI pages by list index — localized titles differ so title keys must not be used to match rows. */
function rowEditorKey(index: number): string {
  return `row:${index}`;
}

function parseRowEditorKey(key: string): number | null {
  if (!key.startsWith('row:')) return null;
  const n = Number(key.slice(4));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function getSectionForLanguage(
  game: AdminGame,
  language: string,
): GameContentSection | undefined {
  return game.content_sections?.find(
    (s) => s.language.toLowerCase() === language.toLowerCase(),
  );
}


function SectionActions({
  visible,
  onVisibleChange,
  onEdit,
  onDelete,
  disabled,
}: {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Visible in app
        </span>
        <Switch
          checked={visible}
          onCheckedChange={onVisibleChange}
          disabled={disabled}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-xl border-white/10 bg-white/[0.02] hover:bg-white/[0.06] !min-h-[initial] w-[30px] h-[30px]"
        onClick={onEdit}
        disabled={disabled}
        aria-label="Edit section"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-xl border-white/10 bg-white/[0.02] hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 !min-h-[initial] w-[30px] h-[30px]"
        onClick={onDelete}
        disabled={disabled}
        aria-label="Delete section"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function InfoRow({ icon, label, children }: InfoRowProps) {
  return (
    <div className="border-b border-white/8 pb-4 mb-4 last:mb-0 last:border-b-0 last:pb-0">
      <div className="mb-2 flex items-center gap-2 text-white/45">
        <span className="shrink-0">{icon}</span>
        <span className="text-xs uppercase tracking-[0.25em]">{label}</span>
      </div>
      <div className="text-sm font-medium text-white/85">{children}</div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-xs uppercase tracking-[0.3em] text-white/40">{title}</p>
  );
}

function createEmptyPage(): GameContentPage {
  return {
    visible_in_app: true,
    title: '',
    description: '',
    point_type: 'ORDERED',
    points: [{ title: '', description: '' }],
  };
}

function createEmptyPageFromTemplate(
  template?: Partial<GameContentPage>,
): GameContentPage {
  const base = createEmptyPage();
  return {
    ...base,
    title: typeof template?.title === 'string' ? template.title : base.title,
    point_type:
      template?.point_type === 'UNORDERED' ? 'UNORDERED' : base.point_type,
    visible_in_app:
      typeof template?.visible_in_app === 'boolean'
        ? template.visible_in_app
        : base.visible_in_app,
  };
}

function cleanPage(page: GameContentPage): GameContentPage {
  return {
    ...page,
    title: page.title.trim(),
    description: page.description?.trim() ? page.description.trim() : undefined,
    points: (page.points ?? [])
      .map((point) => ({
        title: point.title.trim(),
        description: point.description?.trim()
          ? point.description.trim()
          : undefined,
      }))
      .filter((point) => point.title.length > 0 || Boolean(point.description)),
  };
}

function buildSectionPatchPayload(args: {
  existing?: GameContentSection;
  gameId: string;
  language: string;
  pages: GameContentPage[];
  stageId?: string;
  playNowButton?: string;
  learnHowToPlay?: string;
}) {
  const language = args.language.trim();
  return {
    id: args.existing?.id,
    game_id: args.existing?.game_id ?? args.gameId,
    ...(args.stageId ? { stage_id: args.stageId } : {}),
    language,
    content: {
      pages: args.pages,
      play_now_button: args.playNowButton ?? args.existing?.content?.play_now_button,
      learn_how_to_play: args.learnHowToPlay ?? args.existing?.content?.learn_how_to_play,
    },
  };
}

function PageEditorDrawer({
  open,
  editorKey,
  editLocale,
  initialPage,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  editorKey: string;
  /** Same as overview EN/HI toggle — only this locale is edited in the drawer. */
  editLocale: 'en' | 'hi';
  initialPage: GameContentPage;
  onClose: () => void;
  onSave: (page: GameContentPage) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<GameContentPage>(() => createEmptyPage());
  const [titleError, setTitleError] = useState<string | null>(null);

  const setCurrent = (next: GameContentPage) => {
    setDraft(next);
  };

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [prevEditorKey, setPrevEditorKey] = useState(editorKey);
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevEditLocale, setPrevEditLocale] = useState(editLocale);

  if (
    open !== prevOpen ||
    (open && editorKey !== prevEditorKey) ||
    (open && editLocale !== prevEditLocale)
  ) {
    setPrevOpen(open);
    setPrevEditorKey(editorKey);
    setPrevEditLocale(editLocale);
    setTitleError(null);

    if (!open) {
      setDraft(createEmptyPage());
      setDragIndex(null);
    } else {
      // Hydrate when the drawer opens, the row changes, or overview language changes while open
      setDraft(initialPage);
      setDragIndex(null);
    }
  }

  const reorderPoints = (from: number, to: number) => {
    if (from === to) return;
    const points = [...(draft.points ?? [])];
    const [moved] = points.splice(from, 1);
    if (!moved) return;
    points.splice(to, 0, moved);
    setCurrent({ ...draft, points });
  };

  const setPointType = (value: string) => {
    const next = value === 'UNORDERED' ? 'UNORDERED' : 'ORDERED';
    setCurrent({ ...draft, point_type: next as GameContentPointType });
  };

  const localeLabel = editLocale === 'hi' ? 'Hindi' : 'English';

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogDrawerContent className="bg-[#1f1d1b] text-white max-w-[640px]">
        <div className="border-b border-white/8 px-6 py-6">
          <DialogTitle className="text-2xl font-semibold text-white">
            Edit Page
          </DialogTitle>
          <p className="mt-2 text-sm text-white/55">
            Update title, description, point type, and points ({localeLabel}).
          </p>
        </div>

        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Title
            </p>
            <Input
              value={draft.title}
              onChange={(e) => {
                const val = e.target.value;
                setCurrent({ ...draft, title: val });
                if (titleError && val.trim()) {
                  setTitleError(null);
                }
              }}
              placeholder="How to Play"
              className={cn(
                "border-white/10 bg-black/20 text-white placeholder:text-white/35",
                titleError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {titleError && (
              <p className="text-xs text-red-500 mt-1">{titleError}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Description
            </p>
            <textarea
              value={draft.description ?? ''}
              onChange={(e) =>
                setCurrent({ ...draft, description: e.target.value })
              }
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Overview text"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Point Type
            </p>
            <Select value={draft.point_type} onValueChange={setPointType}>
              <SelectTrigger className="border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="Select point type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ORDERED">Ordered</SelectItem>
                <SelectItem value="UNORDERED">Unordered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Points
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-xl bg-white/[0.06] hover:bg-white/[0.10]"
                onClick={() =>
                  setCurrent({
                    ...draft,
                    points: [
                      ...(draft.points ?? []),
                      { title: '', description: '' },
                    ],
                  })
                }
              >
                + Add point
              </Button>
            </div>

            <div className="space-y-3">
              {(draft.points ?? []).map((point, index) => (
                <div
                  key={`${index}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    reorderPoints(dragIndex, index);
                    setDragIndex(null);
                  }}
                  className={[
                    'group rounded-2xl border border-white/10 bg-black/10 p-3 transition',
                    dragIndex === index ? 'opacity-70' : 'opacity-100',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-white/45">
                      <GripVertical className="h-4 w-4 cursor-grab active:cursor-grabbing" />
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-xs font-semibold text-white/70">
                        {index + 1}
                      </div>
                    </div>

                    <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        value={point.title}
                        onChange={(e) =>
                          setCurrent({
                            ...draft,
                            points: (draft.points ?? []).map((p, i) =>
                              i === index ? { ...p, title: e.target.value } : p,
                            ),
                          })
                        }
                        placeholder={
                          draft.point_type === 'ORDERED'
                            ? 'Step title'
                            : 'Point title'
                        }
                        className="h-10 rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
                      />
                      <Input
                        value={point.description ?? ''}
                        onChange={(e) =>
                          setCurrent({
                            ...draft,
                            points: (draft.points ?? []).map((p, i) =>
                              i === index
                                ? { ...p, description: e.target.value }
                                : p,
                            ),
                          })
                        }
                        placeholder="Description (optional)"
                        className="h-10 rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
                      />
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-xl border border-white/10 bg-black/20 text-white/65 hover:bg-white/[0.06] hover:text-white"
                      onClick={() =>
                        setCurrent({
                          ...draft,
                          points: (draft.points ?? []).filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                      aria-label="Remove point"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl bg-white/[0.04] hover:bg-white/[0.08]"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              className="rounded-xl"
              onClick={() => {
                if (!draft.title || !draft.title.trim()) {
                  setTitleError('Title is required');
                  return;
                }
                onSave(cleanPage(draft));
              }}
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </DialogDrawerContent>
    </Dialog>
  );
}

interface GameOverviewTabProps {
  game: AdminGame;
  language: 'EN' | 'HI';
  stageId?: string;
}

export function GameOverviewTab({
  game,
  language,
  stageId,
}: GameOverviewTabProps) {
  const stages = game.stages ?? [];
  const [activeLanguage, setActiveLanguage] = useState<'en' | 'hi'>(
    language.toLowerCase() === 'hi' ? 'hi' : 'en',
  );
  const isGameActive = (game.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE';

  const { toast } = useToast();
  const updateMutation = useUpdateGameByIdMutation();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [deletingRowKey, setDeletingRowKey] = useState<string | null>(null);
  const [sectionDragIndex, setSectionDragIndex] = useState<number | null>(null);
  const [localGameVisible, setLocalGameVisible] = useState(
    game.visibleInApp ?? true,
  );

  const [prevVisibleInApp, setPrevVisibleInApp] = useState(game.visibleInApp);
  if (game.visibleInApp !== prevVisibleInApp) {
    setPrevVisibleInApp(game.visibleInApp);
    setLocalGameVisible(game.visibleInApp ?? true);
  }

  const contentSectionEn = useMemo(
    () => getSectionForLanguage(game, 'en'),
    [game],
  );
  const contentSectionHi = useMemo(
    () => getSectionForLanguage(game, 'hi'),
    [game],
  );

  const [buttonLabelsLang, setButtonLabelsLang] = useState<'en' | 'hi'>('en');
  const [buttonLabels, setButtonLabels] = useState({
    en: {
      playNow: contentSectionEn?.content.play_now_button ?? '',
      learnHowToPlay: contentSectionEn?.content.learn_how_to_play ?? '',
    },
    hi: {
      playNow: contentSectionHi?.content.play_now_button ?? '',
      learnHowToPlay: contentSectionHi?.content.learn_how_to_play ?? '',
    },
  });

  const [enPages, setEnPages] = useState<GameContentPage[]>(
    contentSectionEn?.content.pages ?? [],
  );
  const [hiPages, setHiPages] = useState<GameContentPage[]>(
    contentSectionHi?.content.pages ?? [],
  );

  // Sync local state from backend only on first load or navigation (section reference change)
  const [prevEnSection, setPrevEnSection] = useState(contentSectionEn);
  if (contentSectionEn !== prevEnSection) {
    setPrevEnSection(contentSectionEn);
    setEnPages(contentSectionEn?.content.pages ?? []);
    setButtonLabels((prev) => ({
      ...prev,
      en: {
        playNow: contentSectionEn?.content.play_now_button ?? '',
        learnHowToPlay: contentSectionEn?.content.learn_how_to_play ?? '',
      },
    }));
  }
  const [prevHiSection, setPrevHiSection] = useState(contentSectionHi);
  if (contentSectionHi !== prevHiSection) {
    setPrevHiSection(contentSectionHi);
    setHiPages(contentSectionHi?.content.pages ?? []);
    setButtonLabels((prev) => ({
      ...prev,
      hi: {
        playNow: contentSectionHi?.content.play_now_button ?? '',
        learnHowToPlay: contentSectionHi?.content.learn_how_to_play ?? '',
      },
    }));
  }

  const sectionModels = useMemo(() => {
    const len = Math.max(enPages.length, hiPages.length);
    return Array.from({ length: len }, (_, index) => {
      const en = enPages[index];
      const hi = hiPages[index];
      return {
        key: rowEditorKey(index),
        index,
        title: en?.title || hi?.title || '',
        en,
        hi,
      };
    });
  }, [enPages, hiPages]);

  const visibleSectionModels = sectionModels.filter((m) =>
    activeLanguage === 'hi' ? m.hi : m.en,
  );

  const handleDeletePage = async (rowKey: string) => {
    const index = parseRowEditorKey(rowKey);
    if (index === null) return;
    const nextEnPages = enPages.filter((_, i) => i !== index);
    const nextHiPages = hiPages.filter((_, i) => i !== index);
    await persistSectionPages({ enPages: nextEnPages, hiPages: nextHiPages });
  };

  const handleReorderSections = async (from: number, to: number) => {
    if (from === to) return;
    const nextEnPages = [...enPages];
    const nextHiPages = [...hiPages];

    const [movedEn] = nextEnPages.splice(from, 1);
    const [movedHi] = nextHiPages.splice(from, 1);

    if (movedEn) nextEnPages.splice(to, 0, movedEn);
    if (movedHi) nextHiPages.splice(to, 0, movedHi);

    await persistSectionPages({ enPages: nextEnPages, hiPages: nextHiPages });
  };

  const handleTogglePageVisible = async (
    rowKey: string,
    visibleInApp: boolean,
  ) => {
    const index = parseRowEditorKey(rowKey);
    if (index === null) return;
    const nextEnPages = enPages.map((p, i) =>
      i === index ? { ...p, visible_in_app: visibleInApp } : p,
    );
    const nextHiPages = hiPages.map((p, i) =>
      i === index ? { ...p, visible_in_app: visibleInApp } : p,
    );

    await persistSectionPages({ enPages: nextEnPages, hiPages: nextHiPages });
  };

  const handleToggleGameVisible = async (visibleInApp: boolean) => {
    setLocalGameVisible(visibleInApp);
    try {
      await updateMutation.mutateAsync({
        id: game.id,
        payload: { visibleInApp },
        stageId,
      });
      toast({
        title: 'Game visibility updated',
        description: 'Metadata visibility updated successfully.',
        variant: 'success',
      });
    } catch (err) {
      setLocalGameVisible(!visibleInApp); // Rollback
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const persistSectionPages = async (args: {
    enPages?: GameContentPage[];
    hiPages?: GameContentPage[];
    playNowButtonEn?: string;
    playNowButtonHi?: string;
    learnHowToPlayEn?: string;
    learnHowToPlayHi?: string;
  }) => {
    const resolvedEnPages = args.enPages ?? enPages;
    const resolvedHiPages = args.hiPages ?? hiPages;

    const sectionPayloads = [
      buildSectionPatchPayload({
        existing: contentSectionEn,
        gameId: game.id,
        language: 'EN',
        pages: resolvedEnPages,
        stageId,
        playNowButton: args.playNowButtonEn,
        learnHowToPlay: args.learnHowToPlayEn,
      }),
      buildSectionPatchPayload({
        existing: contentSectionHi,
        gameId: game.id,
        language: 'HI',
        pages: resolvedHiPages,
        stageId,
        playNowButton: args.playNowButtonHi,
        learnHowToPlay: args.learnHowToPlayHi,
      }),
    ];

    const findPageVisibility = (pages: GameContentPage[], key: string) =>
      pages.find((p) => normalizeTitleKey(p.title) === key)?.visible_in_app;

    const aboutVisible = findPageVisibility(resolvedEnPages, 'about');
    const scoringRulesVisible = findPageVisibility(
      resolvedEnPages,
      'scoring_rules',
    );
    const antiCheatRulesVisible = findPageVisibility(
      resolvedEnPages,
      'anti_cheat_rules',
    );

    // Snapshot current state for rollback
    const prevEnPages = enPages;
    const prevHiPages = hiPages;
    const prevButtonLabels = buttonLabels;

    // Optimistic update — no GET refetch after PATCH
    setEnPages(resolvedEnPages);
    setHiPages(resolvedHiPages);
    if (args.playNowButtonEn !== undefined || args.learnHowToPlayEn !== undefined) {
      setButtonLabels((prev) => ({
        ...prev,
        en: {
          playNow: args.playNowButtonEn ?? prev.en.playNow,
          learnHowToPlay: args.learnHowToPlayEn ?? prev.en.learnHowToPlay,
        },
        hi: {
          playNow: args.playNowButtonHi ?? prev.hi.playNow,
          learnHowToPlay: args.learnHowToPlayHi ?? prev.hi.learnHowToPlay,
        },
      }));
    }

    try {
      await updateMutation.mutateAsync({
        id: game.id,
        payload: {
          content_sections: sectionPayloads,
          ...(aboutVisible !== undefined && { aboutVisible }),
          ...(scoringRulesVisible !== undefined && { scoringRulesVisible }),
          ...(antiCheatRulesVisible !== undefined && { antiCheatRulesVisible }),
        },
        stageId,
      });
      toast({
        title: 'Content updated',
        description: 'Content section saved successfully.',
        variant: 'success',
      });
      return true;
    } catch (err) {
      // Rollback to state before the optimistic update
      setEnPages(prevEnPages);
      setHiPages(prevHiPages);
      setButtonLabels(prevButtonLabels);
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const editingModel = editingKey
    ? sectionModels.find((m) => m.key === editingKey)
    : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="lg:max-w-[70%] w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">
              Content Sections
            </h2>
            <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
              <button
                onClick={() => setActiveLanguage('en')}
                className={[
                  'rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                  activeLanguage === 'en'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-white/55 hover:text-white',
                ].join(' ')}
              >
                EN
              </button>
              <button
                onClick={() => setActiveLanguage('hi')}
                className={[
                  'rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                  activeLanguage === 'hi'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-white/55 hover:text-white',
                ].join(' ')}
              >
                HI
              </button>
            </div>
          </div>
          <Button
            onClick={() => setEditingKey('new_section')}
            className="rounded-xl"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        {sectionModels
          .filter((m) => (activeLanguage === 'hi' ? m.hi : m.en))
          .map((m) => {
            const page = (activeLanguage === 'hi' ? m.hi : m.en)!;
            return (
              <Card
                key={m.key}
                draggable
                onDragStart={() => setSectionDragIndex(m.index)}
                onDragEnd={() => setSectionDragIndex(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (sectionDragIndex === null) return;
                  handleReorderSections(sectionDragIndex, m.index);
                  setSectionDragIndex(null);
                }}
                className={[
                  'border-white/10 bg-white/[0.02] transition',
                  sectionDragIndex === m.index ? 'opacity-50' : 'opacity-100',
                ].join(' ')}
              >
                <CardHeader className="pt-4 pb-2">
                  <CardTitle className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <GripVertical className="h-4 w-4 shrink-0 text-white/20 cursor-grab active:cursor-grabbing" />
                      <SectionHeader title={page.title} />
                    </div>
                    <SectionActions
                      visible={page.visible_in_app}
                      onVisibleChange={(checked) =>
                        handleTogglePageVisible(m.key, checked)
                      }
                      onEdit={() => setEditingKey(m.key)}
                      onDelete={() => setDeletingRowKey(m.key)}
                      disabled={updateMutation.isPending}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {page.description && (
                    <p className="text-sm leading-relaxed text-white/80 mb-4">
                      {page.description}
                    </p>
                  )}

                  {page.points.length > 0 && (
                    <ul className="space-y-4">
                      {page.points.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-4">
                          {page.point_type === 'ORDERED' ? (
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-[10px] font-bold text-primary">
                              {idx + 1}
                            </div>
                          ) : (
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
                          )}
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-white/90">
                              {point.title}
                            </p>
                            {point.description && (
                              <p className="text-xs text-white/55 leading-relaxed">
                                {point.description}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!page.description && page.points.length === 0 && (
                    <div className="py-6 text-center text-sm italic text-white/50">
                      No content configured for this section.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

        {visibleSectionModels.length === 0 && (
          <div className="py-12 text-center rounded-2xl border border-dashed border-white/10">
            <p className="text-sm text-white/40">
              No content sections available in {activeLanguage.toUpperCase()}.
            </p>
          </div>
        )}

        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SectionHeader title="App Button Labels" />
              </div>
              <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setButtonLabelsLang('en')}
                  className={[
                    'rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                    buttonLabelsLang === 'en'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-white/55 hover:text-white',
                  ].join(' ')}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setButtonLabelsLang('hi')}
                  className={[
                    'rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                    buttonLabelsLang === 'hi'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-white/55 hover:text-white',
                  ].join(' ')}
                >
                  HI
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Play Now Button
              </p>
              <Input
                value={buttonLabels[buttonLabelsLang].playNow}
                onChange={(e) =>
                  setButtonLabels((prev) => ({
                    ...prev,
                    [buttonLabelsLang]: {
                      ...prev[buttonLabelsLang],
                      playNow: e.target.value,
                    },
                  }))
                }
                placeholder="Play Now"
                className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Learn How to Play
              </p>
              <Input
                value={buttonLabels[buttonLabelsLang].learnHowToPlay}
                onChange={(e) =>
                  setButtonLabels((prev) => ({
                    ...prev,
                    [buttonLabelsLang]: {
                      ...prev[buttonLabelsLang],
                      learnHowToPlay: e.target.value,
                    },
                  }))
                }
                placeholder="Learn How to Play"
                className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                disabled={updateMutation.isPending}
                onClick={() =>
                  persistSectionPages({
                    playNowButtonEn: buttonLabels.en.playNow,
                    playNowButtonHi: buttonLabels.hi.playNow,
                    learnHowToPlayEn: buttonLabels.en.learnHowToPlay,
                    learnHowToPlayHi: buttonLabels.hi.learnHowToPlay,
                  })
                }
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Labels'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10">
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SectionHeader title="Assigned Stages" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stages.length > 0 ? (
              <div className="divide-y divide-white/8">
                {stages.map((stage) => (
                  <Link
                    key={stage.id}
                    href={ROUTES.STAGES_DETAIL(stage.id)}
                    className="group -mx-6 flex items-center justify-between px-6 py-3 transition-colors hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <span className="text-xs font-bold">
                          {stage.stage_number}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {stage.stage_name}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-white/35">
                          Stage {stage.stage_number}
                        </p>
                      </div>
                    </div>
                    <MapIcon className="h-4 w-4 text-white/45 opacity-0 transition-all group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm italic text-white/50">
                No stages assigned to this game yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 lg:max-w-[30%] w-full sticky top-[70px]">
        <Card className="border-white/10">
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SectionHeader title="Metadata" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Visible in app
                </span>
                <Switch
                  checked={localGameVisible}
                  onCheckedChange={handleToggleGameVisible}
                  disabled={updateMutation.isPending}
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow icon={<Tag className="h-4 w-4" />} label="Game ID">
              <span className="text-sm font-mono break-all">{game.id}</span>
            </InfoRow>
            <InfoRow icon={<Layers className="h-4 w-4" />} label="Status">
              {isGameActive ? 'ACTIVE' : 'INACTIVE'}
            </InfoRow>
            <InfoRow icon={<Layers className="h-4 w-4" />} label="Total Stages">
              {String(stages.length)}
            </InfoRow>
            <InfoRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Created At"
            >
              {formatDate(game.created_at)}
            </InfoRow>
            <InfoRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Last Updated"
            >
              {formatDate(game.updated_at)}
            </InfoRow>
          </CardContent>
        </Card>
      </div>

      <PageEditorDrawer
        open={editingKey !== null}
        editorKey={editingKey ?? ''}
        editLocale={activeLanguage}
        initialPage={
          (activeLanguage === 'hi' ? editingModel?.hi : editingModel?.en) ??
          createEmptyPageFromTemplate({
            title: editingKey === 'new_section' ? '' : editingModel?.title,
          })
        }
        isSaving={updateMutation.isPending}
        onClose={() => setEditingKey(null)}
        onSave={async (page) => {
          if (!editingKey) return;

          const cleaned = cleanPage(page);
          const rowIndex = parseRowEditorKey(editingKey);
          let nextEnPages: GameContentPage[];
          let nextHiPages: GameContentPage[];

          if (editingKey === 'new_section') {
            const sibling = createEmptyPageFromTemplate({
              visible_in_app: cleaned.visible_in_app,
            });
            if (activeLanguage === 'en') {
              nextEnPages = [...enPages, cleaned];
              nextHiPages = [...hiPages, sibling];
            } else {
              nextHiPages = [...hiPages, cleaned];
              nextEnPages = [...enPages, sibling];
            }
          } else if (rowIndex !== null) {
            const pad = (pages: GameContentPage[], len: number) => {
              const out = [...pages];
              while (out.length < len) out.push(createEmptyPage());
              return out;
            };
            const maxLen = Math.max(
              enPages.length,
              hiPages.length,
              rowIndex + 1,
            );
            const paddedEn = pad(enPages, maxLen);
            const paddedHi = pad(hiPages, maxLen);
            nextEnPages = paddedEn.map((p, i) =>
              i === rowIndex && activeLanguage === 'en' ? cleaned : p,
            );
            nextHiPages = paddedHi.map((p, i) =>
              i === rowIndex && activeLanguage === 'hi' ? cleaned : p,
            );
          } else {
            return;
          }

          const ok = await persistSectionPages({
            enPages: nextEnPages,
            hiPages: nextHiPages,
          });
          if (ok) setEditingKey(null);
        }}
      />

      <ConfirmationModal
        isOpen={deletingRowKey !== null}
        onClose={() => setDeletingRowKey(null)}
        onConfirm={async () => {
          if (!deletingRowKey) return;
          await handleDeletePage(deletingRowKey);
          setDeletingRowKey(null);
        }}
        title="Delete section?"
        description={`"${sectionModels.find((m) => m.key === deletingRowKey)?.title ?? 'This section'}" will be removed from both EN and HI. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
