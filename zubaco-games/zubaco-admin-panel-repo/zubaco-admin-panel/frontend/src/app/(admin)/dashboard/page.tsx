import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCards } from "@/features/dashboard/components/StatCards";
import { ActivityList } from "@/features/dashboard/components/ActivityList";
import { ChartPlaceholder } from "@/features/dashboard/components/ChartPlaceholder";

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartPlaceholder title="User Growth" type="line" />
        <ChartPlaceholder title="Games Activity" type="bar" />
      </div>
      <ActivityList />
    </PageContainer>
  );
}
