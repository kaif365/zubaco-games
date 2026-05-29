import { act, render } from '@testing-library/react';

import { useSequencePlayback } from '@/features/sequence-recall/hooks/useSequencePlayback';
import type { TileId } from '@/types/game';

const TEST_SEQUENCE: TileId[] = [1, 2];

function Harness({ onComplete }: { onComplete: () => void }) {
  useSequencePlayback({
    sequence: TEST_SEQUENCE,
    playbackMs: 1,
    gapMs: 1,
    enabled: true,
    onComplete,
  });
  return <div>playback</div>;
}

describe('useSequencePlayback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires completion callback', async () => {
    const onComplete = jest.fn();
    render(<Harness onComplete={onComplete} />);

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(onComplete).toHaveBeenCalled();
  });
});
