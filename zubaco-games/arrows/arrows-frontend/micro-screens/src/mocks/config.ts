import type { StageContent } from "@micro-screens/src/types/instruction-content";

export const INSTRUCTION_CONTENT_CONFIG: StageContent = {
  gameLabel: "CHALLENGE {stage}",
  statusLabel: "LIVE",
  gameTitle: "Arrow Game",
  playNowButton: "Start",
  learnHowToPlay: "View Rules",
  slides: [
    {
      id: "description",
      title: "How The Game Works",
      description:
        "Clear each board by launching arrows in the right order. Blocked arrows reverse, so plan the path before you tap.",
      items: [
        {
          id: "scan",
          title: "Scan",
          description: "Look for arrows with a clear path to leave the board.",
          variant: "step",
        },
        {
          id: "launch",
          title: "Launch",
          description: "Tap arrows when nothing blocks their direction.",
          variant: "step",
        },
        {
          id: "unblock",
          title: "Unblock",
          description: "Clear outside arrows first to open space for trapped arrows.",
          variant: "step",
        },
        {
          id: "score",
          title: "Progress",
          description: "Clear all arrows to advance through the live rounds.",
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
          id: "clear-arrow",
          title: "Clear Arrow",
          description: "Each arrow removed from the board contributes to your score.",
          variant: "step",
        },
        {
          id: "round-complete",
          title: "Round Complete",
          description: "Finish a board to move into the next round.",
          variant: "step",
        },
        {
          id: "wrong-move",
          title: "Wrong Move",
          description: "A blocked arrow reverses and costs momentum.",
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
          description:
            "Final score includes cleared arrows, completed rounds, and time bonus.",
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
          title: "Input patterns consistent with automation tools",
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
          id: "outside-controls",
          title: "Tampering with game state or network requests",
          description: "",
          variant: "rule",
        },
      ],
    },
  ],
};
