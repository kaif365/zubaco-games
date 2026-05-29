import type { StageContent } from './types/instruction-content';

export const INSTRUCTION_CONTENT_CONFIG: StageContent = {
  gameLabel: 'CHALLENGE {stage}',
  statusLabel: 'LIVE',
  gameTitle: 'CHALLENGE {stage}',
  slides: [
    {
      id: 'how-to-play',
      title: 'How to Play',
      description:
        'Logic Reflector is a laser puzzle. Place mirrors and optical blocks on the grid to redirect the beam so it strikes every glowing target.',
      items: [
        {
          id: 'select',
          title: 'Select a Block',
          description: 'Pick a mirror, splitter, or blocker from the toolbar.',
          variant: 'step',
        },
        {
          id: 'place',
          title: 'Place on the Grid',
          description: 'Tap an empty cell to place your block, or drag it directly.',
          variant: 'step',
        },
        {
          id: 'reflect',
          title: 'Reflect the Beam',
          description: 'Adjust your blocks until the laser hits every target.',
          variant: 'step',
        },
        {
          id: 'clear',
          title: 'Clear the Level',
          description: 'Light up all targets to complete the level and advance!',
          variant: 'step',
        },
      ],
    },
    {
      id: 'scoring',
      title: 'Scoring Rules',
      description: 'Maximize your score by solving levels quickly and efficiently.',
      items: [
        {
          id: 'base',
          title: 'Level Completion',
          description: 'Earn base points for every puzzle you solve.',
          variant: 'step',
        },
        {
          id: 'time',
          title: 'Time Bonus',
          description: 'The faster you solve, the higher your time bonus.',
          variant: 'step',
        },
        {
          id: 'moves',
          title: 'Fewer Blocks',
          description: 'Using fewer blocks can boost your final ranking.',
          variant: 'step',
        },
        {
          id: 'total',
          title: 'Total Score',
          description: 'Your score accumulates across all levels in the session.',
          variant: 'step',
        },
      ],
    },
    {
      id: 'fair-play',
      title: 'Integrity Policy',
      description:
        'To keep competition fair for everyone, please follow these guidelines:',
      items: [
        {
          id: 'bot',
          title: 'No automated tools or scripts',
          description: 'Use of bots will result in disqualification.',
          variant: 'rule',
        },
        {
          id: 'accounts',
          title: 'Single account only',
          description: 'Multiple accounts are not permitted.',
          variant: 'rule',
        },
        {
          id: 'connection',
          title: 'Stable internet connection',
          description: 'Ensure your connection is stable to avoid sync issues.',
          variant: 'rule',
        },
      ],
    },
  ],
};
