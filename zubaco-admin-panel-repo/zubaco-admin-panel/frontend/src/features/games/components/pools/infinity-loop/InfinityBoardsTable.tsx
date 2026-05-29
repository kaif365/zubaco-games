"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import { FileJson, Plus, Search, Trash2, X } from "lucide-react";
import type { ColumnDef } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { JsonViewModal } from "@/components/shared/JsonViewModal";
import { getGamePoolAdapter } from "@/config/pool-registry";
import {
  useDeleteInfinityBoards,
  useInfinityBoards,
  useInfinityBoardDetails,
} from "@/features/games/hooks/pools/useInfinityBoards";
import type { InfinityBoardDto } from "@/services/infinity-loop-boards";
import { formatDate } from "@/utils/format";
import { Pagination } from "@/components/shared/Pagination";
import { useAutoBackPageOnEmpty } from "@/hooks/useAutoBackPageOnEmpty";
import type { GameLevel } from "@/types/pool";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InfinityBoardsTableProps {
  gameId: string;
  gameName: string;
  onAddBoard: () => void;
  levels: GameLevel[];
  levelsLoading?: boolean;
}

export function InfinityBoardsTable({
  gameId,
  gameName,
  onAddBoard,
  levels,
  levelsLoading = false,
}: InfinityBoardsTableProps) {
  const DEFAULT_PAGE_SIZE = 10;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewingJson, setViewingJson] = useState<unknown | null>(null);

  const { data, isLoading, isFetching } = useInfinityBoards(gameId, gameName, {
    levelId: selectedLevelId === "all" ? undefined : selectedLevelId,
    search: debouncedSearch,
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  const { mutate: deleteBoards, isPending: isDeleting } =
    useDeleteInfinityBoards(gameId, gameName);
  const { mutateAsync: getDetails } = useInfinityBoardDetails(gameName);

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const hasActiveFilters = search.length > 0 || selectedLevelId !== "all";
  const handleClearFilters = () => {
    setSearch("");
    setSelectedLevelId("all");
    setSelectedIds([]);
    setPage(1);
  };

  useAutoBackPageOnEmpty({
    page,
    pageSize,
    itemsLength: data?.data?.length ?? 0,
    total: totalCount,
    isLoading,
    isFetching,
    onPageChange: setPage,
  });

  const columns = useMemo<ColumnDef<InfinityBoardDto>[]>(
    () => [
      {
        key: "name",
        header: "Board Name",
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        key: "grid",
        header: "Grid Size",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.gridX} x {row.gridY}
          </span>
        ),
      },
      {
        key: "level",
        header: "Level",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.level?.name ?? "—"}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Added On",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "w-[120px]",
        cell: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={async () => {
                const adapter = getGamePoolAdapter(gameName);
                if (adapter.formatBoardDetails) {
                  try {
                    const details = await getDetails(row.id);
                    if (details) {
                      setViewingJson(adapter.formatBoardDetails(details));
                      return;
                    }
                  } catch (err) {
                    console.error("Failed to fetch board details:", err);
                  }
                }
                setViewingJson(row);
              }}
            >
              <FileJson className="h-4 w-4" />
              <span className="sr-only">View JSON</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setIdsToDelete([row.id]);
                setIsDeleteModalOpen(true);
              }}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        ),
      },
    ],
    [isDeleting, gameName, getDetails],
  );

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setIdsToDelete(selectedIds);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (idsToDelete.length === 0) return;
    const pageWas = page;
    const itemsOnPageWas = data?.data?.length ?? 0;
    const deletedCount = idsToDelete.length;
    deleteBoards(idsToDelete, {
      onSuccess: () => {
        if (pageWas > 1 && itemsOnPageWas > 0 && deletedCount >= itemsOnPageWas) {
          setPage(pageWas - 1);
        }
      },
      onSettled: () => {
        setIsDeleteModalOpen(false);
        setIdsToDelete([]);
        setSelectedIds([]);
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Game Boards</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the board configurations for this game.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-2" onClick={onAddBoard}>
            <Plus className="h-4 w-4" />
            Add Board
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleBulkDeleteClick}
            disabled={isDeleting || selectedIds.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected{" "}
            {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search boards..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIds([]);
                setPage(1);
              }}
            />
          </div>

          {levelsLoading || levels.length ? (
            <Select
              value={selectedLevelId}
              onValueChange={(val) => {
                setSelectedLevelId(val);
                setSelectedIds([]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-34">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {!levelsLoading
                  ? levels.map((lvl) => (
                      <SelectItem key={lvl.id} value={lvl.id}>
                        {lvl.name}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          ) : null}

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border border-border bg-muted/25 px-3 text-xs hover:bg-muted/40 hover:text-foreground"
              onClick={handleClearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading || isFetching}
          rowKey={(row) => row.id}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage="No boards found for this level."
        />

        {totalCount > DEFAULT_PAGE_SIZE ? (
          <div className="mt-4">
            <Pagination
              page={effectivePage}
              pageSize={pageSize}
              total={totalCount}
              totalPages={totalPages}
              onPageChange={(nextPage) => {
                setSelectedIds([]);
                setPage(Math.min(Math.max(1, nextPage), totalPages));
              }}
              onPageSizeChange={(size) => {
                setSelectedIds([]);
                setPage(1);
                setPageSize(size);
              }}
            />
          </div>
        ) : null}
      </CardContent>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setIdsToDelete([]);
        }}
        onConfirm={confirmDelete}
        title="Delete Boards"
        description="Are you sure you want to delete the selected board(s)? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />

      <JsonViewModal
        isOpen={!!viewingJson}
        onClose={() => setViewingJson(null)}
        data={viewingJson}
        title={`View Board: ${(viewingJson as { name?: string })?.name || ""}`}
      />
    </Card>
  );
}
