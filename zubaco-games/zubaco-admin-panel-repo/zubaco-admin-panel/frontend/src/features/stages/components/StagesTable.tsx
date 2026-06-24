"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableToolbar } from "@/components/shared/TableToolbar";
import { useStages, useDeleteStage } from "../hooks/useStages";
import { getStageColumns } from "../config/stageColumns";
import { useDebounce } from "@/hooks/useDebounce";
import { ROUTES } from "@/config/routes";
import { Pagination } from "@/components/shared/Pagination";
import { PAGINATION_DEFAULTS } from "@/config/pagination";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { CreateStageModal } from "./CreateStageModal";
import { useToast } from "@/providers/ToastProvider";
import { useAutoBackPageOnEmpty } from "@/hooks/useAutoBackPageOnEmpty";

export function StagesTable() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.LIMIT);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [removalTarget, setRemovalTarget] = useState<{
    ids: string[];
    description: string;
  } | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching } = useStages({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const { mutateAsync: deleteStage, isPending: isDeleting } = useDeleteStage();

  const handleView = useCallback(
    (id: string) => {
      router.push(ROUTES.STAGES_DETAIL(id));
    },
    [router],
  );

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`${ROUTES.STAGES_DETAIL(id)}?editor=edit`);
    },
    [router],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const stage = data?.data.find((s) => s.id === id);
      if (stage) {
        setRemovalTarget({
          ids: [id],
          description: `Are you sure you want to delete stage "${stage.stage_name}"? This action cannot be undone.`,
        });
      }
    },
    [data?.data],
  );

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setRemovalTarget({
      ids: selectedIds,
      description: `Are you sure you want to delete ${selectedIds.length} stages? This action cannot be undone.`,
    });
  };

  const confirmRemoval = async () => {
    if (!removalTarget) return;

    const deletedCount = removalTarget.ids.length;
    const pageWas = page;
    const itemsOnPageWas = (data?.data ?? []).length;

    try {
      for (const id of removalTarget.ids) {
        await deleteStage(id);
      }

      toast({
        title:
          removalTarget.ids.length > 1 ? "Stages deleted" : "Stage deleted",
        description:
          removalTarget.ids.length > 1
            ? `Successfully removed ${removalTarget.ids.length} stages.`
            : "The stage has been successfully removed.",
        variant: "success",
      });

      setSelectedIds((prev) =>
        prev.filter((id) => !removalTarget.ids.includes(id)),
      );
      setRemovalTarget(null);

      // If we just emptied the current page, jump back immediately (avoids waiting on pagination totals).
      if (pageWas > 1 && itemsOnPageWas > 0 && deletedCount >= itemsOnPageWas) {
        setPage(pageWas - 1);
      }
    } catch (err) {
      toast({
        title: "Deletion failed",
        description:
          err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const columns = useMemo(
    () => getStageColumns(handleView, handleEdit, handleDelete),
    [handleView, handleEdit, handleDelete],
  );

  const stages = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  useAutoBackPageOnEmpty({
    page,
    pageSize,
    itemsLength: stages.length,
    total,
    isLoading,
    isFetching,
    onPageChange: setPage,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stages"
        description="View and manage the sequence of game stages."
      />

      <TableToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
          setSelectedIds([]);
        }}
        total={total}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="h-8 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create Stage
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="h-8"
              disabled={selectedIds.length === 0 || isDeleting}
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
            data={stages}
            isLoading={isLoading || isFetching}
            rowKey={(row) => row.id}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyMessage={
              search ? "No stages match your search." : "No stages found."
            }
          />
        </CardContent>
      </Card>

      {data && totalPages > 1 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      )}

      <CreateStageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={!!removalTarget}
        onClose={() => setRemovalTarget(null)}
        onConfirm={confirmRemoval}
        title={
          removalTarget?.ids.length === 1
            ? "Delete Stage"
            : "Delete Multiple Stages"
        }
        description={removalTarget?.description || ""}
        confirmLabel={removalTarget?.ids.length === 1 ? "Delete" : "Delete All"}
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
