import type { StageContent } from "@micro-screens/src/types/instruction-content";

export const INSTRUCTION_CONTENT_CONFIG: StageContent = {
  gameLabel: "CHALLENGE {stage}",
  statusLabel: "LIVE",
  gameTitle: "Memory Match",
  playNowButton: "Start",
  learnHowToPlay: "View Rules",
  slides: [
    {
      id: "description",
      title: "Game Description",
      description:
        "Memory Match is a card-flipping game that sharpens your concentration and recall. A grid of face-down cards is briefly revealed — study the pairs, then flip them back and match every pair from memory before the timer runs out.",
      items: [
        {
          id: "observe",
          title: "Observe",
          description: "Study all cards while they are face-up.",
          variant: "step",
        },
        {
          id: "memorize",
          title: "Memorize",
          description: "Lock the positions of each pair in your mind.",
          variant: "step",
        },
        {
          id: "match",
          title: "Match",
          description: "Flip two cards at a time to find their pair.",
          variant: "step",
        },
        {
          id: "score",
          title: "Score",
          description: "Clear all pairs before time runs out to win.",
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
          id: "match",
          title: "Matched Pair",
          description: "Earn points for every correct pair you flip.",
          variant: "step",
        },
        {
          id: "speed",
          title: "Speed Bonus",
          description: "Finish faster to claim extra time-based points.",
          variant: "step",
        },
        {
          id: "mismatch",
          title: "Mismatch",
          description: "Cards flip back — no points lost, keep going.",
          variant: "step",
        },
        {
          id: "levels",
          title: "Multiple Levels",
          description: "Each cleared level adds to your total score.",
          variant: "step",
        },
        {
          id: "harder",
          title: "Larger Grids",
          description: "Bigger boards carry greater point rewards.",
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
          title: "Switching apps or minimizing the browser during the game",
          description: "",
          variant: "rule",
        },
        {
          id: "patterns",
          title: "Suspicious click patterns (too fast or automated)",
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
          title: "Do not flip cards before the preview ends.",
          description: "",
          variant: "rule",
        },
      ],
    },
  ],
};
