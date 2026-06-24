"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { TableToolbar } from "@/components/shared/TableToolbar";
import { Pagination } from "@/components/shared/Pagination";
import { useUsers } from "../hooks/useUsers";
import { getUserColumns, USER_STATUS_FILTER_OPTIONS } from "../config/columns";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useToast } from "@/providers/ToastProvider";
import { useAutoBackPageOnEmpty } from "@/hooks/useAutoBackPageOnEmpty";
import { banUser, unbanUser } from "@/lib/api/endpoints/users";

export function UsersTable() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [usersToDeleteBulk, setUsersToDeleteBulk] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);
  const { page, pageSize, goToPage, changePageSize, reset } = usePagination();

  const { data, isLoading } = useUsers({
    page,
    pageSize,
    search: debouncedSearch,
    status: statusFilter,
  });

  const handleDelete = (id: string) => {
    const user = data?.data.find((u) => u.id === id);
    if (user) {
      setUserToDelete({ id, name: user.name });
    }
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    // Placeholder for actual delete call
    toast({
      title: "User deleted",
      description: `"${userToDelete.name}" has been removed.`,
      variant: "success",
    });
    setUserToDelete(null);
    setSelectedIds((prev) => prev.filter((id) => id !== userToDelete.id));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setUsersToDeleteBulk(selectedIds);
  };

  const confirmBulkDelete = () => {
    if (usersToDeleteBulk.length === 0) return;
    toast({
      title: "Users deleted",
      description: `Successfully removed ${usersToDeleteBulk.length} users.`,
      variant: "success",
    });
    setSelectedIds([]);
    setUsersToDeleteBulk([]);
  };

  const handleBan = async (id: string) => {
    try {
      await banUser(id);
      toast({ title: "User banned", description: "User has been suspended.", variant: "success" });
    } catch {
      toast({ title: "Error", description: "Failed to ban user.", variant: "destructive" });
    }
  };

  const handleUnban = async (id: string) => {
    try {
      await unbanUser(id);
      toast({ title: "User unbanned", description: "User has been reactivated.", variant: "success" });
    } catch {
      toast({ title: "Error", description: "Failed to unban user.", variant: "destructive" });
    }
  };

  const columns = getUserColumns(handleDelete, handleBan, handleUnban);

  useAutoBackPageOnEmpty({
    page,
    pageSize,
    itemsLength: data?.data?.length ?? 0,
    total: data?.total ?? 0,
    isLoading,
    isFetching: false,
    onPageChange: goToPage,
  });

  const handleSearchChange = (v: string) => {
    setSearch(v);
    reset();
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4">
      <TableToolbar
        search={search}
        onSearchChange={handleSearchChange}
        total={data?.total}
        filters={[
          {
            key: "status",
            placeholder: "All Statuses",
            options: USER_STATUS_FILTER_OPTIONS,
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              reset();
              setSelectedIds([]);
            },
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              disabled={selectedIds.length === 0}
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            rowKey={(row) => row.id}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyMessage="No users found. Try adjusting your filters."
          />
        </CardContent>
      </Card>

      {data && data.totalPages > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          totalPages={data.totalPages}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      )}

      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete User"
        description={`Are you sure you want to delete "${userToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
      />

      <ConfirmationModal
        isOpen={usersToDeleteBulk.length > 0}
        onClose={() => setUsersToDeleteBulk([])}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Users"
        description={`Are you sure you want to delete ${usersToDeleteBulk.length} users? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="destructive"
      />
    </div>
  );
}
