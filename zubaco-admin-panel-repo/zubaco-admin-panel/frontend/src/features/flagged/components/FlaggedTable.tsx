"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { TableToolbar } from "@/components/shared/TableToolbar";
import { Pagination } from "@/components/shared/Pagination";
import { FlaggedDetailModal } from "./FlaggedDetailModal";
import { useFlaggedUsers, useUpdateFlagStatus } from "../hooks/useFlaggedUsers";
import {
  getFlaggedColumns,
  FLAG_STATUS_FILTER_OPTIONS,
} from "../config/columns";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { FlaggedUser } from "@/types/flagged";
import { useAutoBackPageOnEmpty } from "@/hooks/useAutoBackPageOnEmpty";

export function FlaggedTable() {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFlag, setSelectedFlag] = useState<FlaggedUser | null>(null);
  const [flagsToDeleteBulk, setFlagsToDeleteBulk] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { page, pageSize, goToPage, changePageSize, reset } = usePagination();

  const { data, isLoading } = useFlaggedUsers({
    page,
    pageSize,
    search: debouncedSearch,
    status: statusFilter,
  });

  const { mutate: updateStatus, variables } = useUpdateFlagStatus();

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setFlagsToDeleteBulk(selectedIds);
  };

  const confirmBulkDelete = () => {
    if (flagsToDeleteBulk.length === 0) return;
    // Placeholder for actual delete call
    setSelectedIds([]);
    setFlagsToDeleteBulk([]);
  };

  const handleAction = (
    row: FlaggedUser,
    action: "review" | "safe" | "suspend",
  ) => {
    if (action === "safe") updateStatus({ id: row.id, status: "safe" });
    if (action === "suspend") updateStatus({ id: row.id, status: "suspended" });
    if (action === "review") {
      setSelectedFlag(row);
      setModalOpen(true);
    }
  };

  const handleViewDetail = (row: FlaggedUser) => {
    setSelectedFlag(row);
    setModalOpen(true);
  };

  const columns = getFlaggedColumns({
    onAction: handleAction,
    onViewDetail: handleViewDetail,
    isPending: (id) => variables?.id === id,
  });

  useAutoBackPageOnEmpty({
    page,
    pageSize,
    itemsLength: data?.data?.length ?? 0,
    total: data?.total ?? 0,
    isLoading,
    isFetching: false,
    onPageChange: goToPage,
  });

  return (
    <>
      <div className="space-y-4">
        <TableToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            reset();
            setSelectedIds([]);
          }}
          total={data?.total}
          filters={[
            {
              key: "status",
              placeholder: "All Statuses",
              options: FLAG_STATUS_FILTER_OPTIONS,
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
              emptyMessage="No flagged users found."
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
      </div>

      <FlaggedDetailModal
        flag={selectedFlag}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={flagsToDeleteBulk.length > 0}
        onClose={() => setFlagsToDeleteBulk([])}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Flags"
        description={`Are you sure you want to delete ${flagsToDeleteBulk.length} flag records? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="destructive"
      />
    </>
  );
}
