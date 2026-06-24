import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { FlaggedTable } from "@/features/flagged/components/FlaggedTable";

export const metadata = {
  title: "Flagged Users | ZUBACO Admin",
};

export const dynamic = "force-static";

export default function FlaggedPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Flagged Users"
        description="Review and take action on users flagged for suspicious or inappropriate behavior."
      />
      <FlaggedTable />
    </PageContainer>
  );
}
