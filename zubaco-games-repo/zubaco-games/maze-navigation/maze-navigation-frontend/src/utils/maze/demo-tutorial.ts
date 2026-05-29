export type DemoTutorialStep =
  | "idle"
  | "ball"
  | "controls"
  | "path"
  | "portal"
  | "done";

const DEMO_TUTORIAL_STEP_ORDER: readonly DemoTutorialStep[] = [
  "ball",
  "controls",
  "path",
  "portal",
  "done",
] as const;

export function isDemoTutorialInputBlocked(step: DemoTutorialStep): boolean {
  return step !== "idle" && step !== "done";
}

export function isDemoTutorialActive(step: DemoTutorialStep): boolean {
  return step !== "idle" && step !== "done";
}

export function getNextDemoTutorialStep(
  step: DemoTutorialStep,
): DemoTutorialStep {
  const index = DEMO_TUTORIAL_STEP_ORDER.indexOf(step);
  if (index < 0 || index >= DEMO_TUTORIAL_STEP_ORDER.length - 1) {
    return "done";
  }
  return DEMO_TUTORIAL_STEP_ORDER[index + 1]!;
}
