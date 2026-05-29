import { render, screen } from '@testing-library/react';

import { AudioProvider } from '@/audio/AudioProvider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { defaultGameConfig } from '@/config/gameConfig';
import { SequenceBoard } from '@/features/sequence-recall/components/SequenceBoard';

describe('ui primitives', () => {
  it('renders badge and progress', () => {
    render(
      <>
        <Badge>Label</Badge>
        <Progress value={50} />
      </>,
    );
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('renders sequence board tiles', () => {
    render(
      <AudioProvider>
        <SequenceBoard
          boxCount={defaultGameConfig.boxCount}
          activeTile={1}
          disabled={false}
          mode="playback"
          audioType="piano"
          remainingTaps={3}
          sequenceLength={4}
          clickedSequence={[]}
          onInput={() => undefined}
        />
      </AudioProvider>,
    );
    expect(screen.getByRole('button', { name: 'Tile 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tile 4' })).toBeInTheDocument();
  });
});
