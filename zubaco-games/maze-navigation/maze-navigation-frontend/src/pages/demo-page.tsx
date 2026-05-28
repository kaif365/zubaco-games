import { paths } from '@/app/router/routes';
import { LiveGameRouteSkeletonWithHud } from '@/components/molecules/live-game-route-skeleton';
import { MazeSection } from '@/section/maze/maze-section';
import { useDemoStore } from '@/store/demo';
import { MazePlayMode } from '@/utils/maze/maze-play-mode';
import { getConfiguredUiStageId } from '@/utils/stage/stage-utils';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
export default function DemoPage() {
  const navigate = useNavigate();
  const stageId = getConfiguredUiStageId();
  const loadDemo = useDemoStore((s) => s.loadDemo);
  const isLoadingDemo = useDemoStore((s) => s.isLoadingDemo);
  const demoSession = useDemoStore((s) => s.demoSession);
  const shouldRedirectHomeAfterNoDemoLevels = useDemoStore(
    (s) => s.shouldRedirectHomeAfterNoDemoLevels,
  );

  const clearNoDemoLevelsRedirect = useDemoStore((s) => s.clearNoDemoLevelsRedirect);

  useEffect(() => {
    void loadDemo();
  }, [loadDemo]);

  useEffect(() => {
    if (shouldRedirectHomeAfterNoDemoLevels) {
      navigate(paths.home, { replace: true });
      clearNoDemoLevelsRedirect();
    }
  }, [clearNoDemoLevelsRedirect, navigate, shouldRedirectHomeAfterNoDemoLevels]);

  if (isLoadingDemo || !demoSession?.enableDemo || demoSession.levels.length === 0) {
    return <LiveGameRouteSkeletonWithHud playMode={MazePlayMode.Demo} />;
  }
  return <MazeSection mode={MazePlayMode.Demo} stageId={stageId} />;
}
