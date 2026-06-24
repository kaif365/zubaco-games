import { PageContainer } from "@/components/layout/PageContainer";
import { CreateTournamentPage } from "@/features/tournaments/components/CreateTournamentPage";

export const metadata = {
  title: "Create Tournament | ZUBACO Admin",
  description: "Create a tournament and map stages.",
};

export default function NewTournamentPage() {
  return (
    <PageContainer>
      <CreateTournamentPage />
    </PageContainer>
  );
}
