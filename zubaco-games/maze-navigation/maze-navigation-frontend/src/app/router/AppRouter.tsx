import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { LiveGameRouteSkeletonWithHud } from "@/components/molecules/live-game-route-skeleton";
import { GameInstructionsSkeleton } from "@/section/instructions/instructions-skeleton";
import { MazePlayMode } from "@/utils/maze/maze-play-mode";
import { getConfiguredUiStageId } from "@/utils/stage/stage-utils";
import { paths } from "@app/router/routes";

const HomePage = lazy(() => import("@/pages/home-page"));
const DemoPage = lazy(() => import("@/pages/demo-page"));
const GamePage = lazy(() => import("@/pages/game-page"));
const ResultPage = lazy(() => import("@/pages/result-page"));
const NotFoundPage = lazy(() => import("@/pages/not-found-page"));

const uiStageId = getConfiguredUiStageId();

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={paths.home}
          element={
            <Suspense fallback={<GameInstructionsSkeleton stage={uiStageId} />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path={paths.demo}
          element={
            <Suspense
              fallback={
                <LiveGameRouteSkeletonWithHud playMode={MazePlayMode.Demo} />
              }
            >
              <DemoPage />
            </Suspense>
          }
        />
        <Route
          path={paths.game}
          element={
            <Suspense
              fallback={
                <LiveGameRouteSkeletonWithHud playMode={MazePlayMode.Game} />
              }
            >
              <GamePage />
            </Suspense>
          }
        />
        <Route
          path={paths.results}
          element={
            <Suspense fallback={null}>
              <ResultPage />
            </Suspense>
          }
        />
        <Route
          path="/404"
          element={
            <Suspense fallback={<GameInstructionsSkeleton stage={uiStageId} />}>
              <NotFoundPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to={paths.home} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
