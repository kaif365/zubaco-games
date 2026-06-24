"use client";

import { getGameMetadata } from "@/config/game-registry";
import { DefaultPoolView } from "./pools/DefaultPoolView";

interface GamePoolTabProps {
  gameId: string;
  gameName: string;
}

export function GamePoolTab({ gameId, gameName }: GamePoolTabProps) {
  const metadata = getGameMetadata(gameName);
  const PoolComponent = metadata?.poolComponent;

  if (PoolComponent) {
    return <PoolComponent gameId={gameId} gameName={gameName} />;
  }

  return <DefaultPoolView gameId={gameId} gameName={gameName} />;
}
