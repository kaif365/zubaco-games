'use client';

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { UsersTable } from "@/features/users/components/UsersTable";

export default function UsersPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Users"
        description="View and manage all registered users on the platform."
      />
      <UsersTable />
    </PageContainer>
  );
}
