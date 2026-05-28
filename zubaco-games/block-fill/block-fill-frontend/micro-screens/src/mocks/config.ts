import type { StageContent } from '@micro-screens/src/types/instruction-content';

export const INSTRUCTION_CONTENT_CONFIG: StageContent = {
  gameLabel: 'CHALLENGE {stage}',
  statusLabel: 'LIVE',
  gameTitle: 'Block Fill',
  slides: [
    {
      id: 'description',
      title: 'How The Game Works',
      description:
        'Connect matching colored dots with a continuous path and fill every cell on the grid. Complete as many puzzles as you can before time runs out.',
      items: [
        {
          id: 'connect',
          title: 'Connect',
          description: 'Draw a path between two dots of the same colour.',
          variant: 'step',
        },
        {
          id: 'fill',
          title: 'Fill',
          description: 'Every cell on the grid must be covered to solve the puzzle.',
          variant: 'step',
        },
        {
          id: 'no-cross',
          title: 'No Crossing',
          description: 'Paths cannot cross or overlap each other.',
          variant: 'step',
        },
        {
          id: 'advance',
          title: 'Advance',
          description: 'Solve the puzzle to move to the next one.',
          variant: 'step',
        },
      ],
    },
    {
      id: 'scoring',
      title: 'Scoring Rules',
      description: 'Know how points and results are calculated.',
      items: [
        {
          id: 'puzzle-complete',
          title: 'Puzzle Complete',
          description: 'Solving a puzzle earns points based on grid size and speed.',
          variant: 'step',
        },
        {
          id: 'full-fill',
          title: 'Full Fill Bonus',
          description: 'Filling all cells without any empty space gives a bonus.',
          variant: 'step',
        },
        {
          id: 'time-limit',
          title: 'Time Limit',
          description: 'Solve as many puzzles as possible before the timer ends.',
          variant: 'step',
        },
        {
          id: 'final-score',
          title: 'Final Score',
          description: 'Final score is the total from all completed puzzles.',
          variant: 'step',
        },
      ],
    },
    {
      id: 'anti-cheat',
      title: 'Integrity Policy',
      description:
        'Fair play is non-negotiable. Violations lead to immediate removal:',
      items: [
        {
          id: 'switch',
          title: 'Leaving the game window or switching tabs mid-session',
          description: '',
          variant: 'rule',
        },
        {
          id: 'patterns',
          title: 'Suspicious interaction patterns (too fast or automated)',
          description: '',
          variant: 'rule',
        },
        {
          id: 'tools',
          title: 'Third-party software or browser extensions',
          description: '',
          variant: 'rule',
        },
        {
          id: 'accounts',
          title: 'Playing from duplicate or shared accounts',
          description: '',
          variant: 'rule',
        },
      ],
    },
  ],
};
