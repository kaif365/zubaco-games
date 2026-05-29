import type { StageContent } from "@micro-screens/src/types/instruction-content";

export const INSTRUCTION_CONTENT_CONFIG: StageContent = {
  gameLabel: "CHALLENGE {stage}",
  statusLabel: "LIVE",
  gameTitle: "Sliding Puzzle",
  slides: [
    {
      id: "description",
      title: "How to Play",
      description:
        "Sliding Puzzle is a classic logic game where you must rearrange tiles to reconstruct a hidden image. Solve the puzzle by moving tiles into the empty slot.",
      items: [
        {
          id: "observe",
          title: "Observe",
          description: "Study the complete image before it shuffles.",
          variant: "step",
        },
        {
          id: "memorize",
          title: "Memorize",
          description: "Remember the original arrangement of the tiles.",
          variant: "step",
        },
        {
          id: "solve",
          title: "Solve",
          description: "Slide tiles into the empty space to rebuild the picture.",
          variant: "step",
        },
        {
          id: "timer",
          title: "Beat the Clock",
          description: "Complete all rounds before the total time runs out!",
          variant: "step",
        },
      ],
    },
    {
      id: "scoring",
      title: "Scoring Rules",
      description: "Learn how to maximize your score and climb the leaderboard.",
      items: [
        {
          id: "round-points",
          title: "Round Completion",
          description: "Earn base points for every puzzle solved.",
          variant: "step",
        },
        {
          id: "time-bonus",
          title: "Time Bonus",
          description: "The faster you solve, the higher your time bonus.",
          variant: "step",
        },
        {
          id: "moves",
          title: "Move Efficiency",
          description: "Solving in fewer moves can impact your final ranking.",
          variant: "step",
        },
        {
          id: "total-score",
          title: "Total Score",
          description: "Your score is the sum of round points and time bonuses.",
          variant: "step",
        },
      ],
    },
    {
      id: "anti-cheat",
      title: "Fair Play Rules",
      description:
        "These rules protect every competitor. Violations result in score removal:",
      items: [
        {
          id: "bot",
          title: "Automated input or scripted actions",
          description: "",
          variant: "rule",
        },
        {
          id: "accounts",
          title: "Single account only",
          description: "",
          variant: "rule",
        },
        {
          id: "connection",
          title: "Maintain a steady connection",
          description: "",
          variant: "rule",
        },
      ],
    },
  ],
};
