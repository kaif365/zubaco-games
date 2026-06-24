import { TournamentDetail } from "@/features/tournaments/components/TournamentDetail";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata = {
  title: "Tournament Details | Zubaco Admin",
  description: "View tournament stages and configurations.",
};
export const revalidate = 300;
export const dynamicParams = true;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <PageContainer>
      <TournamentDetail id={id} />
    </PageContainer>
  );
}
