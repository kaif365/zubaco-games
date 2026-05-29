import type { StageInstructionContent } from "@/types/instruction-content";

export const instructionStageContent: StageInstructionContent = {
  gameLabel: "GAME {stage}",
  statusLabel: "ACTIVE",
  gameTitle: "Maze Navigation",
  slides: [
    {
      id: "description",
      title: "Game Description",
      description:
        "Guide a flickering flame through a cold maze. Reach the goal before time runs out. Use arrow keys, WASD, or swipe to move.",
      items: [
        {
          id: "observe",
          title: "Observe",
          description: "Study the maze layout and plan your path.",
          variant: "step",
        },
        {
          id: "move",
          title: "Move",
          description: "Navigate junctions and pick the correct direction.",
          variant: "step",
        },
        {
          id: "goal",
          title: "Reach the goal",
          description: "Find the exit before your flame goes out.",
          variant: "step",
        },
        {
          id: "progress",
          title: "Progress",
          description:
            "Clear boards to advance; score and board count show your progress.",
          variant: "step",
        },
      ],
    },
    {
      id: "scoring",
      title: "Scoring Rules",
      description: "Understand how your performance is evaluated.",
      items: [
        {
          id: "boards",
          title: "Boards cleared",
          description: "Each solved board counts toward your stage progress.",
          variant: "step",
        },
        {
          id: "score",
          title: "Score",
          description: "Points reflect how efficiently you solve boards.",
          variant: "step",
        },
        {
          id: "time",
          title: "Time",
          description: "Finish boards faster before the clock hits zero.",
          variant: "step",
        },
        {
          id: "mistakes",
          title: "Mistakes",
          description: "Wrong moves cost time and score.",
          variant: "step",
        },
        {
          id: "stage",
          title: "Stage outcome",
          description: "Final result combines boards, score, and time.",
          variant: "step",
        },
      ],
    },
    {
      id: "anti-cheat",
      title: "Anti-Cheat Rules",
      description:
        "We take fairness seriously. The following actions will result in automatic disqualification:",
      items: [
        {
          id: "switch",
          title: "Switching apps or minimizing the browser during the test",
          description: "",
          variant: "rule",
        },
        {
          id: "patterns",
          title: "Suspicious response patterns (too fast or too slow)",
          description: "",
          variant: "rule",
        },
        {
          id: "tools",
          title: "Using external tools or assistance",
          description: "",
          variant: "rule",
        },
        {
          id: "accounts",
          title: "Multiple attempts with different accounts",
          description: "",
          variant: "rule",
        },
        {
          id: "automation",
          title: "Using scripts, bots, or anything that plays the game for you",
          description: "",
          variant: "rule",
        },
      ],
    },
  ],
};
