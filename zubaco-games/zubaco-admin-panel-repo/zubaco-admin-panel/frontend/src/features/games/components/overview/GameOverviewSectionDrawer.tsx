import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogDrawerContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import type { LocalizedSectionContent } from '@/types/game';

export type OverviewSectionKey = 'about' | 'scoringRules' | 'antiCheatRules';

type SectionDescriptor = {
  key: OverviewSectionKey;
  title: string;
  description: string;
  mode: 'about' | 'bullets';
};

const SECTION_DESCRIPTORS: Record<OverviewSectionKey, SectionDescriptor> = {
  about: {
    key: 'about',
    title: 'About',
    description: 'Edit the game overview description and steps.',
    mode: 'about',
  },
  scoringRules: {
    key: 'scoringRules',
    title: 'Scoring Rules',
    description: 'Edit the scoring rules shown to players.',
    mode: 'bullets',
  },
  antiCheatRules: {
    key: 'antiCheatRules',
    title: 'Anti-Cheat Rules',
    description: 'Edit the anti-cheat rules shown to players.',
    mode: 'bullets',
  },
};

type LangCode = 'EN' | 'HI';

function normalizeItems(items: string[] | undefined): string[] {
  return (items ?? []).map((entry) => entry ?? '');
}

function buildDraftContent(
  initial: LocalizedSectionContent | undefined,
): Record<LangCode, string[]> {
  const data = initial as Record<string, string[] | undefined> | undefined;
  return {
    EN: normalizeItems(data?.EN ?? data?.en),
    HI: normalizeItems(data?.HI ?? data?.hi),
  };
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={placeholder}
      className="min-h-[92px] w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/30 focus:border-primary"
    />
  );
}

function ListEditor({
  label,
  items,
  onChange,
  itemLabel,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  itemLabel?: (index: number) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.28em] text-white/40">
          {label}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-xl"
          onClick={() => onChange([...items, ''])}
        >
          Add
        </Button>
      </div>

      <div className="space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/8 bg-black/10 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-white/40">
                  {itemLabel ? itemLabel(index) : `Item ${index + 1}`}
                </p>
                <button
                  type="button"
                  className="text-xs text-red-200/80 hover:text-red-200"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
              <div className="mt-3">
                <TextArea
                  value={item}
                  onChange={(value) =>
                    onChange(
                      items.map((entry, i) => (i === index ? value : entry)),
                    )
                  }
                  placeholder="Type here..."
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-sm text-white/50">
            No items yet.
          </div>
        )}
      </div>
    </div>
  );
}

function AboutEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const description = items[0] ?? '';
  const steps = items.slice(1);

  const updateDescription = (value: string) => onChange([value, ...steps]);

  const updateSteps = (next: string[]) => onChange([description, ...next]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-white/40">
          Description
        </p>
        <div className="mt-2">
          <TextArea
            value={description}
            onChange={updateDescription}
            placeholder="Short description about the game..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
          <p className="text-xs uppercase tracking-[0.28em] text-white/40">
            How to play
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-xl bg-white/[0.06] hover:bg-white/[0.10]"
            onClick={() => updateSteps([...steps, ''])}
          >
            + Add bullet
          </Button>
        </div>

        <BulletRulesEditor
          items={steps}
          onChange={updateSteps}
          emptyPlaceholder="Type a bullet..."
        />
      </div>
    </div>
  );
}

function BulletRulesEditor({
  items,
  onChange,
  emptyPlaceholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  emptyPlaceholder: string;
}) {
  const effectiveItems = items.length ? items : [''];

  return (
    <div className="space-y-3">
      {effectiveItems.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          <input
            value={item}
            onChange={(event) => {
              const next = [...effectiveItems];
              next[index] = event.currentTarget.value;
              onChange(next);
            }}
            placeholder={emptyPlaceholder}
            className="h-10 w-full bg-transparent text-sm text-white/85 outline-none placeholder:text-white/30"
          />
          <button
            type="button"
            className="ml-1 shrink-0 rounded-lg p-2 text-white/35 transition hover:bg-white/[0.06] hover:text-white/70"
            onClick={() =>
              onChange(effectiveItems.filter((_, i) => i !== index))
            }
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function GameOverviewSectionDrawer({
  open,
  sectionKey,
  initialContent,
  defaultLanguage,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean;
  sectionKey: OverviewSectionKey | null;
  initialContent: LocalizedSectionContent | undefined;
  defaultLanguage: LangCode;
  isSaving: boolean;
  onClose: () => void;
  onSave: (args: { content: LocalizedSectionContent }) => void;
}) {
  const descriptor = sectionKey ? SECTION_DESCRIPTORS[sectionKey] : null;

  const initialDraft = useMemo(
    () => buildDraftContent(initialContent),
    [initialContent],
  );

  const [language, setLanguage] = useState<LangCode>(defaultLanguage);
  const [draftContent, setDraftContent] =
    useState<Record<LangCode, string[]>>(initialDraft);

  const currentItems = draftContent[language];
  const setCurrentItems = (items: string[]) =>
    setDraftContent((prev) => ({ ...prev, [language]: items }));

  const normalizedContent = useMemo<LocalizedSectionContent>(() => {
    const clean = (items: string[]) =>
      items.map((t) => t.trim()).filter(Boolean);
    return {
      EN: clean(draftContent.EN),
      HI: clean(draftContent.HI),
    };
  }, [draftContent.EN, draftContent.HI]);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
          return;
        }
        setLanguage(defaultLanguage);
        setDraftContent(initialDraft);
      }}
    >
      <DialogDrawerContent className="bg-[#1f1d1b] text-white">
        <div className="border-b border-white/8 px-6 py-6">
          <DialogTitle className="text-2xl font-semibold text-white">
            {descriptor?.title ?? 'Section'}
          </DialogTitle>
          <p className="mt-2 text-sm text-white/55">
            {descriptor?.description ?? 'Update content and visibility.'}
          </p>
        </div>

        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              {descriptor?.title ?? 'Section'}
            </p>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setLanguage('EN')}
                  className={[
                    'rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                    language === 'EN'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-white/55 hover:text-white',
                  ].join(' ')}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('HI')}
                  className={[
                    'rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                    language === 'HI'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-white/55 hover:text-white',
                  ].join(' ')}
                >
                  HI
                </button>
              </div>

              {descriptor?.mode !== 'about' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-xl bg-white/[0.06] hover:bg-white/[0.10]"
                  onClick={() => setCurrentItems([...currentItems, ''])}
                >
                  + Add rule
                </Button>
              ) : null}
            </div>
          </div>

          {descriptor?.mode === 'about' ? (
            <AboutEditor items={currentItems} onChange={setCurrentItems} />
          ) : descriptor?.mode === 'bullets' ? (
            <BulletRulesEditor
              items={currentItems}
              onChange={setCurrentItems}
              emptyPlaceholder={
                sectionKey === 'scoringRules'
                  ? 'Type a rule...'
                  : 'No use of third-party software...'
              }
            />
          ) : (
            <ListEditor
              label={descriptor?.title ?? 'Items'}
              items={currentItems}
              onChange={setCurrentItems}
              itemLabel={(index) => `• Bullet ${index + 1}`}
            />
          )}
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
              disabled={isSaving || !sectionKey}
              className="rounded-xl"
              onClick={() =>
                onSave({
                  content: normalizedContent,
                })
              }
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </DialogDrawerContent>
    </Dialog>
  );
}
