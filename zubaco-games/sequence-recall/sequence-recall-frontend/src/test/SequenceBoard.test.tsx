import { render, screen } from '@testing-library/react';

import { SequenceBoard } from '@/features/sequence-recall/components/SequenceBoard';

jest.mock('@/audio', () => ({
  useAudio: () => ({
    play: jest.fn(),
    unlockAudio: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('SequenceBoard', () => {
  it('uses a fixed 2x2 grid for four tiles', () => {
    render(
      <SequenceBoard
        boxCount={4}
        activeTile={null}
        disabled={false}
        mode="input"
        audioType="piano"
        remainingTaps={1}
        sequenceLength={4}
        clickedSequence={[]}
        onInput={jest.fn()}
      />,
    );

    expect(screen.getByTestId('sequence-board-grid')).toHaveClass('grid-cols-2');
    expect(screen.getByTestId('sequence-board-grid')).not.toHaveClass('sm:grid-cols-4');
  });

  it('does not render playback instruction text directly', () => {
    render(
      <SequenceBoard
        boxCount={4}
        activeTile={1}
        disabled={true}
        mode="playback"
        isDemoMode={true}
        audioType="piano"
        remainingTaps={4}
        sequenceLength={4}
        clickedSequence={[]}
        onInput={jest.fn()}
      />,
    );

    expect(screen.queryByText('WATCH THE SEQUENCE CAREFULLY.')).not.toBeInTheDocument();
  });

  it('does not render input instruction text directly', () => {
    render(
      <SequenceBoard
        boxCount={4}
        activeTile={null}
        disabled={false}
        mode="input"
        isDemoMode={true}
        audioType="piano"
        remainingTaps={4}
        sequenceLength={4}
        clickedSequence={[]}
        onInput={jest.fn()}
      />,
    );

    expect(screen.queryByText('TAP TO REPEAT THE SEQUENCE')).not.toBeInTheDocument();
  });
});
