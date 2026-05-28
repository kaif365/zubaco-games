import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextEncoder, TextDecoder });

class MockGainNode {
  gain = {
    value: 1,
    linearRampToValueAtTime: jest.fn(),
  };
  connect = jest.fn();
}

class MockAudioBufferSourceNode {
  buffer: { duration: number } | null = { duration: 1 };
  loop = false;
  playbackRate = { value: 1 };
  onended: (() => void) | null = null;
  connect = jest.fn();
  start = jest.fn();
  stop = jest.fn(() => {
    this.onended?.();
  });
}

class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};

  createGain() {
    return new MockGainNode() as unknown as GainNode;
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode() as unknown as AudioBufferSourceNode;
  }

  decodeAudioData = jest.fn(() => Promise.resolve({ duration: 1 } as AudioBuffer));

  resume = jest.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
}

Object.assign(globalThis, {
  AudioContext: MockAudioContext,
});

class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.assign(globalThis, {
  ResizeObserver: MockResizeObserver,
});

jest.mock('embla-carousel-react', () => {
  const useEmblaCarousel = () => {
    const viewportRef = { current: null } as { current: HTMLDivElement | null };
    const emblaApi = null;
    return [viewportRef, emblaApi] as const;
  };

  return {
    __esModule: true,
    default: useEmblaCarousel,
  };
});
