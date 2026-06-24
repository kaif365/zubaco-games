import { GameDetailPage } from "@/features/games/components/GameDetailPage";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return {
    title: `Game ${gameId} | Zubaco Admin`,
  };
}

export default async function GameDetailStandaloneRoute({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameDetailPage gameId={gameId} stageId="" />;
}
