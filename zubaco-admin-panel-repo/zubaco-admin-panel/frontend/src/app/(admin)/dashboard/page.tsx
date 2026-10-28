import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCards } from "@/features/dashboard/components/StatCards";
import { ActivityList } from "@/features/dashboard/components/ActivityList";
import { DashboardCharts } from "@/features/dashboard/components/DashboardCharts";

export const metadata = {
  title: "Dashboard | ZUBACO Admin",
};

export const dynamic = "force-static";

export default function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Overview of your platform's key metrics and recent activity."
      />
      <StatCards />
      <DashboardCharts />
      <ActivityList />
    </PageContainer>
  );
}
