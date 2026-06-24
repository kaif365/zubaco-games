import { GameDetailPage } from "@/features/games/components/GameDetailPage";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { gameId } = await params;
  return {
    // Keep metadata fast and deterministic to avoid blocking SSR on API round-trips.
    title: `Game ${gameId} | Zubaco Admin`,
  };
}

export default async function GameDetailRoute({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;
  return <GameDetailPage gameId={gameId} stageId={id} />;
}
