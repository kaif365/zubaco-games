import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const noopHowl = () => ({
  play: vi.fn(() => 1),
  stop: vi.fn(),
  unload: vi.fn(),
  mute: vi.fn(),
  volume: vi.fn(),
  playing: vi.fn(() => false),
  once: vi.fn((_ev: string, fn?: () => void) => {
    fn?.();
  }),
});

vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(noopHowl),
  Howler: {
    ctx: { state: 'running' as AudioContextState, resume: vi.fn(() => Promise.resolve()) },
    stop: vi.fn(),
  },
}));
