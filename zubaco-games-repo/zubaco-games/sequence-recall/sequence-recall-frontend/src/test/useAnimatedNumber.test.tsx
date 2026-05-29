import { act, render, screen } from '@testing-library/react';

import { useAnimatedNumber } from '@/features/sequence-recall/hooks/useAnimatedNumber';

function AnimatedNumberHarness({ value, durationMs }: { value: number; durationMs: number }) {
  const { animatedValue, isAnimating } = useAnimatedNumber(value, { durationMs });
  return (
    <div>
      <span data-testid="animated-value">{animatedValue}</span>
      <span data-testid="is-animating">{String(isAnimating)}</span>
    </div>
  );
}

describe('useAnimatedNumber', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();

    global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      return window.setTimeout(() => {
        callback(performance.now());
      }, 16);
    };
    global.cancelAnimationFrame = (handle: number): void => {
      clearTimeout(handle);
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('counts up toward the latest score instead of jumping immediately', () => {
    const { rerender } = render(<AnimatedNumberHarness value={20} durationMs={200} />);

    expect(screen.getByTestId('animated-value')).toHaveTextContent('20');

    rerender(<AnimatedNumberHarness value={40} durationMs={200} />);

    act(() => {
      jest.advanceTimersByTime(64);
    });
    const midAnimationValue = Number(screen.getByTestId('animated-value').textContent);

    expect(midAnimationValue).toBeGreaterThan(20);
    expect(midAnimationValue).toBeLessThan(40);
    expect(screen.getByTestId('is-animating')).toHaveTextContent('true');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByTestId('animated-value')).toHaveTextContent('40');
    expect(screen.getByTestId('is-animating')).toHaveTextContent('false');
  });
});
