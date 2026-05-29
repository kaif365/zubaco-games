import type { StageContent } from "@/types/instruction-content";

export const INSTRUCTION_CONTENT_CONFIG: StageContent = {
  gameLabel: "GAME {stage}",
  statusLabel: "ACTIVE",
  gameTitle: "Maze Navigation",
  slides: [
    {
      id: "description",
      title: "Game Description",
      description:
        "Infinity Loop is a spatial puzzle where every path must connect into closed circuits. Tap pieces to rotate them until all line segments meet with no loose ends. In live play you advance through multiple boards within a stage while the timer runs.",
      items: [
        {
          id: "observe",
          title: "Observe",
          description: "Study the grid for breaks and corners.",
          variant: "step",
        },
        {
          id: "rotate",
          title: "Rotate",
          description: "Tap a tile to rotate it and change how paths connect.",
          variant: "step",
        },
        {
          id: "complete",
          title: "Close the loop",
          description:
            "Keep adjusting until every line forms a continuous closed loop.",
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
          description: "Wrong rotations cost moves.",
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
