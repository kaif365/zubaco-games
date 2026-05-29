import { PageContainer } from "@/components/layout/PageContainer";
import { GamesTable } from "@/features/games/components/GamesTable";

export const metadata = {
  title: "Games | ZUBACO Admin",
};

export const dynamic = "force-static";

export default function GamesPage() {
  return (
    <PageContainer showNavigation={false}>
      <GamesTable />
    </PageContainer>
  );
}
