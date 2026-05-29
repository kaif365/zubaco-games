import type { StageContent } from "@micro-screens/src/types/instruction-content";

export const INSTRUCTION_CONTENT_CONFIG: StageContent = {
  gameLabel: "CHALLENGE {stage}",
  statusLabel: "LIVE",
  gameTitle: "Sequence Recall",
  slides: [
    {
      id: "description",
      title: "How The Game Works",
      description:
        "Watch the tile sequence carefully, then repeat the same order by tapping the tiles. Sequence length increases as you progress.",
      items: [
        {
          id: "observe",
          title: "Watch",
          description: "Focus on the exact order of highlighted tiles.",
          variant: "step",
        },
        {
          id: "memorize",
          title: "Memorize",
          description: "Remember both position and order, not just tiles.",
          variant: "step",
        },
        {
          id: "repeat",
          title: "Repeat",
          description: "Tap the tiles in the same sequence shown.",
          variant: "step",
        },
        {
          id: "score",
          title: "Progress",
          description: "Correct rounds move you to longer sequences.",
          variant: "step",
        },
      ],
    },
    {
      id: "scoring",
      title: "Scoring Rules",
      description: "Know how points and results are calculated.",
      items: [
        {
          id: "correct-tap",
          title: "Correct Tap",
          description: "Each correct tap adds score.",
          variant: "step",
        },
        {
          id: "round-complete",
          title: "Round Complete",
          description: "Complete a full sequence to advance.",
          variant: "step",
        },
        {
          id: "wrong-move",
          title: "Wrong Move",
          description: "Wrong input follows stage rules (retry, previous, next, or end).",
          variant: "step",
        },
        {
          id: "time-limit",
          title: "Time Limit",
          description: "Finish as many rounds as possible before timer ends.",
          variant: "step",
        },
        {
          id: "final-score",
          title: "Final Score",
          description: "Final score includes completed rounds and bonus rules.",
          variant: "step",
        },
      ],
    },
    {
      id: "anti-cheat",
      title: "Integrity Policy",
      description:
        "Fair play is non-negotiable. Violations lead to immediate removal:",
      items: [
        {
          id: "switch",
          title: "Leaving the game window or switching tabs mid-session",
          description: "",
          variant: "rule",
        },
        {
          id: "patterns",
          title: "Suspicious tapping patterns (too fast or automated)",
          description: "",
          variant: "rule",
        },
        {
          id: "tools",
          title: "Third-party software or browser extensions",
          description: "",
          variant: "rule",
        },
        {
          id: "accounts",
          title: "Playing from duplicate or shared accounts",
          description: "",
          variant: "rule",
        },
        {
          id: "early",
          title: "Do not tap tiles before playback is complete.",
          description: "",
          variant: "rule",
        },
      ],
    },
  ],
};
