/**
 * Memory card juice — light match confetti, level-complete rain, mismatch feedback.
 */

import { GOLD, GOLD_LIGHT } from '@/constants/game.constants';
import fxStyles from './memorycard-animations.module.css';

const DATA_CARD_ID = 'data-memory-card-id';
const DATA_CARD_INNER = 'data-memory-card-inner';
const CARD_GRID_SELECTOR = '.card-grid';

const CONFETTI_COLORS = [
  GOLD,
  GOLD_LIGHT,
  '#ff6b9d',
  '#5eead4',
  '#a78bfa',
  '#fbbf24',
  '#38bdf8',
  '#fb7185',
];

/** Gold / yellow bias for level-complete fountain (reference: single-point top burst). */
const LEVEL_COMPLETE_GOLD_PALETTE = [GOLD, GOLD_LIGHT, '#f5d547', '#ffd54a', '#e8c547', '#fce44a', '#fbbf24'];

const EASE_POP = 'cubic-bezier(0.34, 1.45, 0.64, 1)';
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_SNAP = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Center blast: readable speed — not a snap */
const EASE_LEVEL_BLAST = 'cubic-bezier(0.14, 0.86, 0.36, 1)';

export type MemoryCardAnimationTarget = HTMLElement;

export interface AnimationHandle {
  cancel: () => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readCardYRotation(inner: HTMLElement): string {
  const fromVar = getComputedStyle(inner).getPropertyValue('--memory-card-y').trim();
  return fromVar || '180deg';
}

function withYRotation(yDeg: string, suffix: string): string {
  return `rotateY(${yDeg}) ${suffix}`.trim();
}

/** Fixed overlay aligned to card — not clipped by parent overflow:hidden. */
function createCardFxLayer(card: HTMLElement): HTMLElement {
  const rect = card.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = fxStyles.cardFxLayer;
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${rect.left}px`;
  layer.style.top = `${rect.top}px`;
  layer.style.width = `${Math.max(rect.width, 1)}px`;
  layer.style.height = `${Math.max(rect.height, 1)}px`;
  document.body.appendChild(layer);
  return layer;
}

function removeWhenDone(node: HTMLElement, anim: Animation): void {
  const cleanup = () => node.remove();
  anim.addEventListener('finish', cleanup, { once: true });
  anim.addEventListener('cancel', cleanup, { once: true });
}

/** Confetti pop from card center on match — no glow, no shadows. */
function spawnMatchConfetti(host: HTMLElement, reduced: boolean): Animation[] {
  const count = reduced ? 10 : 18;
  const anims: Animation[] = [];
  const distMin = reduced ? 26 : 36;
  const distSpan = reduced ? 32 : 58;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.55;
    const dist = distMin + Math.random() * distSpan;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 8;
    const w = 5 + Math.random() * 5;
    const h = w * (0.75 + Math.random() * 0.45);
    const spin = (Math.random() - 0.5) * 280;

    const el = document.createElement('div');
    el.className = fxStyles.confetti;
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? GOLD;
    host.appendChild(el);

    const anim = el.animate(
      [
        { transform: `translate(-50%, -50%) scale(0.2) rotate(0deg)`, opacity: 0 },
        {
          transform: `translate(calc(-50% + ${tx * 0.32}px), calc(-50% + ${ty * 0.32}px)) scale(1.08) rotate(${spin * 0.22}deg)`,
          opacity: 1,
          offset: 0.16,
        },
        {
          transform: `translate(calc(-50% + ${tx * 0.68}px), calc(-50% + ${ty * 0.68}px)) scale(1) rotate(${spin * 0.5}deg)`,
          opacity: 1,
          offset: 0.48,
        },
        {
          transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty + 12}px)) scale(0.42) rotate(${spin}deg)`,
          opacity: 0,
        },
      ],
      { duration: reduced ? 520 : 800, easing: EASE_OUT, fill: 'forwards', delay: i * 14 },
    );
    anims.push(anim);
    removeWhenDone(el, anim);
  }
  return anims;
}

function getInner(card: MemoryCardAnimationTarget): HTMLElement | null {
  return card.querySelector<HTMLElement>(`[${DATA_CARD_INNER}]`);
}

export function getMemoryCardElement(cardId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${DATA_CARD_ID}="${cardId}"]`);
}

export function getCardGridElement(): HTMLElement | null {
  const el = document.querySelector(CARD_GRID_SELECTOR);
  return el instanceof HTMLElement ? el : null;
}

export const MEMORY_CARD_DOM_ATTRS = {
  cardId: DATA_CARD_ID,
  inner: DATA_CARD_INNER,
} as const;

/**
 * Match: quick pop + a little confetti from the card. No shake, glow, or shadows.
 */
export function playMatchAnimation(card: MemoryCardAnimationTarget): AnimationHandle {
  const reduced = prefersReducedMotion();
  const inner = getInner(card);
  const yDeg = inner ? readCardYRotation(inner) : '180deg';
  const cancelled = { value: false };
  const running: Animation[] = [];

  if (inner) {
    inner.classList.add(fxStyles.innerMatchBounce);
    const bounce = inner.animate(
      [
        { transform: withYRotation(yDeg, 'scale(1)'), offset: 0 },
        { transform: withYRotation(yDeg, 'scale(1.1)'), offset: 0.25 },
        { transform: withYRotation(yDeg, 'scale(1)'), offset: 1 },
      ],
      { duration: reduced ? 220 : 380, easing: EASE_POP, fill: 'none' },
    );
    running.push(bounce);
    bounce.addEventListener('finish', () => inner.classList.remove(fxStyles.innerMatchBounce), { once: true });
  }

  const fxHost = createCardFxLayer(card);
  running.push(...spawnMatchConfetti(fxHost, reduced));

  const cleanupTimer = window.setTimeout(() => fxHost.remove(), reduced ? 720 : 1120);

  return {
    cancel: () => {
      if (cancelled.value) return;
      cancelled.value = true;
      window.clearTimeout(cleanupTimer);
      running.forEach((a) => {
        try {
          a.cancel();
        } catch {
          /* finished */
        }
      });
      fxHost.remove();
      inner?.classList.remove(fxStyles.innerMatchBounce);
    },
  };
}

function pickLevelCompleteConfettiColor(): string {
  if (Math.random() < 0.78) {
    return LEVEL_COMPLETE_GOLD_PALETTE[Math.floor(Math.random() * LEVEL_COMPLETE_GOLD_PALETTE.length)] ?? GOLD;
  }
  return CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? GOLD;
}

/**
 * Level complete: one radial blast from the grid center — slightly slower, then done.
 */
export function playLevelCompleteConfetti(grid?: HTMLElement): AnimationHandle {
  const reduced = prefersReducedMotion();
  const gridEl = grid ?? getCardGridElement();
  const cancelled = { value: false };
  const running: Animation[] = [];

  if (!gridEl) {
    return { cancel: () => undefined };
  }

  const rect = gridEl.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return { cancel: () => undefined };
  }

  const layer = document.createElement('div');
  layer.className = fxStyles.levelConfettiLayer;
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${rect.left}px`;
  layer.style.top = `${rect.top}px`;
  layer.style.width = `${rect.width}px`;
  layer.style.height = `${rect.height}px`;
  document.body.appendChild(layer);

  const emitter = document.createElement('div');
  emitter.className = fxStyles.levelEmitterHole;
  layer.appendChild(emitter);
  const emitterBlip = emitter.animate(
    [{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 0.4, offset: 0.48 }, { opacity: 0 }],
    { duration: reduced ? 440 : 560, easing: EASE_OUT, fill: 'forwards' },
  );
  running.push(emitterBlip);

  const pieceCount = reduced ? 28 : 68;
  const burstRadius = Math.max(rect.width, rect.height) * 0.5;
  /** Tight simultaneous launch, with a little stagger */
  const burstSpreadMs = reduced ? 72 : 125;
  const durationMin = reduced ? 760 : 980;
  const durationVar = reduced ? 280 : 380;

  for (let i = 0; i < pieceCount; i++) {
    const w = reduced ? 3.5 + Math.random() * 2.2 : 4 + Math.random() * 3.2;
    const h = w;

    const angle = Math.random() * Math.PI * 2;
    const dist = burstRadius * (0.58 + Math.random() * 0.42);
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;

    const rot0 = Math.random() * 360;
    const rot1 = rot0 + (Math.random() - 0.5) * 480;
    const delay = Math.random() * burstSpreadMs;
    const duration = durationMin + Math.random() * durationVar;

    const piece = document.createElement('div');
    piece.className = `${fxStyles.confetti} ${fxStyles.levelConfettiPiece}`;
    piece.style.left = '50%';
    piece.style.top = '50%';
    piece.style.width = `${w}px`;
    piece.style.height = `${h}px`;
    piece.style.borderRadius = '1px';
    piece.style.background = pickLevelCompleteConfettiColor();
    layer.appendChild(piece);

    const anim = piece.animate(
      [
        {
          transform: `translate(-50%, -50%) scale(0) rotate(${rot0}deg)`,
          opacity: 0,
        },
        {
          transform: `translate(calc(-50% + ${tx * 0.18}px), calc(-50% + ${ty * 0.18}px)) scale(1.06) rotate(${rot0 + (rot1 - rot0) * 0.1}deg)`,
          opacity: 1,
          offset: 0.13,
        },
        {
          transform: `translate(calc(-50% + ${tx * 0.72}px), calc(-50% + ${ty * 0.72}px)) rotate(${rot0 + (rot1 - rot0) * 0.65}deg)`,
          opacity: 0.92,
          offset: 0.58,
        },
        {
          transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot1}deg) scale(0.52)`,
          opacity: 0,
        },
      ],
      { duration, delay, easing: EASE_LEVEL_BLAST, fill: 'forwards' },
    );
    running.push(anim);
    removeWhenDone(piece, anim);
  }

  const maxDuration = Math.ceil(burstSpreadMs + durationMin + durationVar + 80);
  const cleanupTimer = window.setTimeout(() => layer.remove(), maxDuration);

  return {
    cancel: () => {
      if (cancelled.value) return;
      cancelled.value = true;
      window.clearTimeout(cleanupTimer);
      running.forEach((a) => {
        try {
          a.cancel();
        } catch {
          /* noop */
        }
      });
      layer.remove();
    },
  };
}

/** Mismatch: shake + soft red transparent tint. No confetti. */
export function playMismatchAnimation(card: MemoryCardAnimationTarget): AnimationHandle {
  const reduced = prefersReducedMotion();
  const inner = getInner(card);
  const yDeg = inner ? readCardYRotation(inner) : '180deg';
  const cancelled = { value: false };
  const running: Animation[] = [];

  card.classList.add(fxStyles.wrapperMismatch);

  /**
   * Game-style "nope" wobble:
   * tiny anticipation -> strong side hit -> smooth decaying rebounds.
   */
  const shakeAnim = card.animate(
    [
      { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
      { transform: `translate3d(${reduced ? 1.5 : 3}px, 0, 0) rotate(${reduced ? 0.12 : 0.22}deg)`, offset: 0.08 },
      { transform: `translate3d(${reduced ? -5.5 : -12}px, ${reduced ? -0.4 : -0.8}px, 0) rotate(${reduced ? -0.55 : -1.05}deg)`, offset: 0.2 },
      { transform: `translate3d(${reduced ? 4.8 : 10}px, ${reduced ? 0.35 : 0.75}px, 0) rotate(${reduced ? 0.45 : 0.92}deg)`, offset: 0.34 },
      { transform: `translate3d(${reduced ? -3.8 : -7.6}px, 0, 0) rotate(${reduced ? -0.34 : -0.66}deg)`, offset: 0.5 },
      { transform: `translate3d(${reduced ? 2.8 : 5.6}px, 0, 0) rotate(${reduced ? 0.25 : 0.45}deg)`, offset: 0.64 },
      { transform: `translate3d(${reduced ? -1.8 : -3.6}px, 0, 0) rotate(${reduced ? -0.14 : -0.24}deg)`, offset: 0.78 },
      { transform: `translate3d(${reduced ? 1 : 2}px, 0, 0) rotate(${reduced ? 0.08 : 0.12}deg)`, offset: 0.9 },
      { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
    ],
    { duration: reduced ? 480 : 760, easing: EASE_SNAP, fill: 'none' },
  );
  running.push(shakeAnim);

  if (inner) {
    inner.classList.add(fxStyles.innerMismatchSquash);
    const squash = inner.animate(
      [
        { transform: withYRotation(yDeg, 'scale(1, 1)') },
        { transform: withYRotation(yDeg, 'scale(1.05, 0.96)'), offset: 0.28 },
        { transform: withYRotation(yDeg, 'scale(0.98, 1.03)'), offset: 0.55 },
        { transform: withYRotation(yDeg, 'scale(1, 1)') },
      ],
      { duration: reduced ? 410 : 640, easing: EASE_SNAP, fill: 'none' },
    );
    running.push(squash);
    squash.addEventListener('finish', () => inner.classList.remove(fxStyles.innerMismatchSquash), { once: true });
  }

  const fxHost = createCardFxLayer(card);

  const tint = document.createElement('div');
  tint.className = fxStyles.mismatchTint;
  fxHost.appendChild(tint);
  const tintAnim = tint.animate(
    [
      { opacity: 0 },
      { opacity: reduced ? 0.65 : 1, offset: 0.12 },
      { opacity: reduced ? 0.45 : 0.75, offset: 0.45 },
      { opacity: reduced ? 0.2 : 0.35, offset: 0.72 },
      { opacity: 0 },
    ],
    { duration: reduced ? 620 : 920, easing: EASE_OUT, fill: 'forwards' },
  );
  running.push(tintAnim);
  removeWhenDone(tint, tintAnim);

  const cleanupTimer = window.setTimeout(() => {
    fxHost.remove();
    card.classList.remove(fxStyles.wrapperMismatch);
  }, reduced ? 780 : 1080);

  return {
    cancel: () => {
      if (cancelled.value) return;
      cancelled.value = true;
      window.clearTimeout(cleanupTimer);
      running.forEach((a) => {
        try {
          a.cancel();
        } catch {
          /* noop */
        }
      });
      fxHost.remove();
      card.classList.remove(fxStyles.wrapperMismatch);
      inner?.classList.remove(fxStyles.innerMismatchSquash);
    },
  };
}

export function playMatchPairAnimation(
  first: MemoryCardAnimationTarget,
  second: MemoryCardAnimationTarget,
): AnimationHandle {
  const a = playMatchAnimation(first);
  const b = playMatchAnimation(second);
  return {
    cancel: () => {
      a.cancel();
      b.cancel();
    },
  };
}
