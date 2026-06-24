"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableToolbar } from "@/components/shared/TableToolbar";
import { useTournaments, useDeleteTournament } from "../hooks/useTournaments";
import { getTournamentColumns } from "../config/tournamentColumns";
import { useDebounce } from "@/hooks/useDebounce";
import { ROUTES } from "@/config/routes";
import { Pagination } from "@/components/shared/Pagination";
import { PAGINATION_DEFAULTS } from "@/config/pagination";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useToast } from "@/providers/ToastProvider";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
// import { CreateTournamentModal } from "./CreateTournamentModal";
import { useAutoBackPageOnEmpty } from "@/hooks/useAutoBackPageOnEmpty";
import { TournamentUpsertDrawer } from "./TournamentUpsertDrawer";

export function TournamentsTable() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.LIMIT);
  const [tournamentToDelete, setTournamentToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [tournamentsToDeleteBulk, setTournamentsToDeleteBulk] = useState<
    string[]
  >([]);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching } = useTournaments({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const { mutate: deleteTournament, isPending: isDeleting } =
    useDeleteTournament();

  const handleView = (id: string) => {
    router.push(ROUTES.TOURNAMENTS_DETAIL(id));
  };
  const handleEdit = (id: string) => {
    router.push(`${ROUTES.TOURNAMENTS_DETAIL(id)}?editor=details`);
  };

  const handleDelete = (id: string) => {
    const tournament = data?.data.items.find((t) => t.id === id);
    if (tournament) {
      setTournamentToDelete({ id, name: tournament.name });
    }
  };

  const confirmDelete = () => {
    if (!tournamentToDelete) return;
    const pageWas = page;
    const itemsOnPageWas = tournaments.length;

    deleteTournament(
      { tournamentIds: [tournamentToDelete.id] },
      {
        onSuccess: () => {
          toast({
            title: "Tournament deleted",
            description: `"${tournamentToDelete.name}" has been successfully removed.`,
            variant: "success",
          });
          setTournamentToDelete(null);
          setSelectedIds((prev) =>
            prev.filter((id) => id !== tournamentToDelete.id),
          );
          if (pageWas > 1 && itemsOnPageWas === 1) setPage(pageWas - 1);
        },
        onError: (err) => {
          toast({
            title: "Deletion failed",
            description:
              err instanceof Error ? err.message : "Please try again later.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setTournamentsToDeleteBulk(selectedIds);
  };

  const confirmBulkDelete = async () => {
    if (tournamentsToDeleteBulk.length === 0) return;
    const pageWas = page;
    const itemsOnPageWas = tournaments.length;

    deleteTournament(
      { tournamentIds: tournamentsToDeleteBulk },
      {
        onSuccess: () => {
          toast({
            title: "Tournaments deleted",
            description: `Successfully removed ${tournamentsToDeleteBulk.length} tournaments.`,
            variant: "success",
          });
          setSelectedIds([]);
          setTournamentsToDeleteBulk([]);
          if (
            pageWas > 1 &&
            itemsOnPageWas > 0 &&
            tournamentsToDeleteBulk.length >= itemsOnPageWas
          ) {
            setPage(pageWas - 1);
          }
        },
        onError: (err) => {
          toast({
            title: "Bulk deletion failed",
            description:
              err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const columns = getTournamentColumns(handleView, handleEdit, handleDelete);

  const tournaments = data?.data.items ?? [];
  const total = data?.data.pagination.total ?? 0;
  const totalPages = data?.data.pagination.total_pages ?? 1;

  useAutoBackPageOnEmpty({
    page,
    pageSize,
    itemsLength: tournaments.length,
    total,
    isLoading,
    isFetching,
    onPageChange: setPage,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tournaments"
        description="Manage game tournaments, stages, and participants."
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
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="h-8 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create Tournament
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
            data={tournaments}
            isLoading={isLoading || isFetching}
            rowKey={(row) => row.id}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyMessage={
              search
                ? "No tournaments match your search."
                : "No tournaments found."
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

      <ConfirmationModal
        isOpen={!!tournamentToDelete}
        onClose={() => setTournamentToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Tournament"
        description={`Are you sure you want to delete "${tournamentToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={tournamentsToDeleteBulk.length > 0}
        onClose={() => setTournamentsToDeleteBulk([])}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Tournaments"
        description={`Are you sure you want to delete ${tournamentsToDeleteBulk.length} tournaments? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="destructive"
        isLoading={isDeleting}
      />

      <TournamentUpsertDrawer
        mode="create"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(id) => router.push(ROUTES.TOURNAMENTS_DETAIL(id))}
      />
    </div>
  );
}
