import { TournamentsTable } from "@/features/tournaments/components/TournamentsTable";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata = {
  title: "Tournaments | ZUBACO Admin",
  description: "Manage game tournaments and stages.",
};

export const dynamic = "force-static";

export default function TournamentsPage() {
  return (
    <PageContainer>
      <TournamentsTable />
    </PageContainer>
  );
}
