import { StageGamesTable } from "@/features/stages/components/StageGamesTable";
import { PageContainer } from "@/components/layout/PageContainer";

export const revalidate = 300;
export const dynamicParams = true;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StageDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <PageContainer>
      <StageGamesTable stageId={id} />
    </PageContainer>
  );
}
