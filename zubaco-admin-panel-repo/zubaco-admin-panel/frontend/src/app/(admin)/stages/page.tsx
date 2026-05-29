import { StagesTable } from "@/features/stages/components/StagesTable";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata = {
  title: "Stages | ZUBACO Admin",
  description: "Manage game stages",
};

export const dynamic = "force-static";

export default function StagesPage() {
  return (
    <PageContainer>
      <StagesTable />
    </PageContainer>
  );
}
