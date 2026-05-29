import { MazeSection } from "@/section/maze/maze-section";
import { MazePlayMode } from "@/utils/maze/maze-play-mode";
import { getConfiguredUiStageId } from "@/utils/stage/stage-utils";

export default function GamePage() {
  const stageId = getConfiguredUiStageId();

  return <MazeSection mode={MazePlayMode.Game} stageId={stageId} />;
}
