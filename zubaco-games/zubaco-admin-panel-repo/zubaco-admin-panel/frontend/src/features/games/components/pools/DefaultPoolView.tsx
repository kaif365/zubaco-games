"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useBoards,
  useDeleteBoards,
  useGameLevels,
  useBoardDetails,
} from "../../hooks/pools/useDefaultPool";
import { CreatePoolModal } from "../CreatePoolModal";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { getDefaultBoardsColumns } from "../../config/pool-columns/default-boards";
import { getGameMetadata } from "@/config/game-registry";
import type { BaseGameBoard, GenericGameBoard } from "@/types/pool";
import type { ColumnDef } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { Pagination } from "@/components/shared/Pagination";
import { useAutoBackPageOnEmpty } from "@/hooks/useAutoBackPageOnEmpty";
import { slugifyGameName } from "@/utils/slugify";
import { JsonViewModal } from "@/components/shared/JsonViewModal";
import { getGamePoolAdapter } from "@/config/pool-registry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DefaultPoolViewProps {
  gameId: string;
  gameName: string;
}

export function DefaultPoolView({ gameId, gameName }: DefaultPoolViewProps) {
  const DEFAULT_PAGE_SIZE = 10;
  const poolLabel = "Game Boards";
  const poolDescription =
    "Manage the board configurations and grids for this game.";
  const createPoolLabel = "Create Board";
  const searchPlaceholder = "Search boards...";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewingJson, setViewingJson] = useState<unknown | null>(null);
  const [viewingJsonTitle, setViewingJsonTitle] = useState("View JSON");

  // Fetch levels on pool tab mount (create modal uses these, no extra fetch).
  const { data: levels, isLoading: levelsLoading } = useGameLevels(gameName);

  const { data, isLoading } = useBoards(gameId, gameName, {
    levelId: selectedLevelId === "all" ? undefined : selectedLevelId,
    search: debouncedSearch,
    limit: pageSize,
    skip: (page - 1) * pageSize,
  });
  const { mutate: deleteBoards, isPending: isDeleting } = useDeleteBoards(
    gameId,
    gameName,
  );
  const { mutateAsync: getDetails } = useBoardDetails(gameName);

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const effectivePage = Math.min(page, totalPages);

  useAutoBackPageOnEmpty({
    page,
    pageSize,
    itemsLength: data?.data?.length ?? 0,
    total: totalCount,
    isLoading,
    isFetching: false,
    onPageChange: setPage,
  });

  const handleDeleteClick = useCallback((id: string) => {
    setBoardToDelete(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setBoardToDelete(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    const pageWas = page;
    const itemsOnPageWas = data?.data?.length ?? 0;
    if (boardToDelete) {
      deleteBoards([boardToDelete], {
        onSuccess: () => {
          if (pageWas > 1 && itemsOnPageWas === 1) setPage(pageWas - 1);
        },
        onSettled: () => {
          setIsDeleteModalOpen(false);
          setBoardToDelete(null);
        },
      });
      return;
    }

    if (selectedIds.length > 0) {
      const deletedCount = selectedIds.length;
      deleteBoards(selectedIds, {
        onSuccess: () => {
          if (pageWas > 1 && itemsOnPageWas > 0 && deletedCount >= itemsOnPageWas) {
            setPage(pageWas - 1);
          }
        },
        onSettled: () => {
          setIsDeleteModalOpen(false);
          setSelectedIds([]);
        },
      });
    }
  };

  const handleViewJson = useCallback(
    async (data: unknown) => {
      const board = data as BaseGameBoard;
      const adapter = getGamePoolAdapter(gameName);
      
      if (adapter.formatBoardDetails && board.id) {
        try {
          const details = await getDetails(board.id);
          if (details) {
            setViewingJsonTitle(`View Board: ${board.name || ""}`);
            setViewingJson(adapter.formatBoardDetails(details));
            return;
          }
        } catch (err) {
          console.error("Failed to fetch board details:", err);
        }
      }
      setViewingJsonTitle(`View Board: ${board.name || ""}`);
      setViewingJson(data);
    },
    [gameName, getDetails],
  );

  const columns = useMemo(() => {
    const configured = getGameMetadata(gameName)?.poolColumns;
    if (typeof configured === "function") {
      return (
        configured as (
          onDelete: (id: string) => void,
          isDeleting: boolean,
          onViewJson: (data: unknown) => void,
        ) => ColumnDef<unknown>[]
      )(handleDeleteClick, isDeleting, handleViewJson);
    }
    return getDefaultBoardsColumns(
      handleDeleteClick,
      isDeleting,
      handleViewJson,
    );
  }, [gameName, handleDeleteClick, isDeleting, handleViewJson]);

  const handleDownloadSampleJson = useCallback(() => {
    const metadata = getGameMetadata(gameName);
    const sample = metadata?.poolSampleJson;
    if (!sample) return;

    const fileName =
      metadata?.poolSampleJsonFileName ??
      `${slugifyGameName(gameName)}-sample.json`;
    const json = JSON.stringify(sample, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [gameName]);

  const hasSampleJson = Boolean(getGameMetadata(gameName)?.poolSampleJson);
  const hasActiveFilters = search.length > 0 || selectedLevelId !== "all";
  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSelectedLevelId("all");
    setSelectedIds([]);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">{poolLabel}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {poolDescription}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasSampleJson ? (
              <Button
                size="sm"
                className="gap-2"
                onClick={handleDownloadSampleJson}
              >
                <Download className="h-4 w-4" />
                Download Sample JSON
              </Button>
            ) : null}
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {createPoolLabel}
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
                placeholder={searchPlaceholder}
                className="pl-9 h-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIds([]);
                  setPage(1);
                }}
              />
            </div>

            {levelsLoading || levels?.length ? (
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
                    ? levels?.map((lvl) => (
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
            isLoading={isLoading}
            rowKey={(row: GenericGameBoard) => row.id}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyMessage="No boards found for this game."
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
      </Card>

      <CreatePoolModal
        gameId={gameId}
        gameName={gameName}
        levels={levels}
        levelsLoading={levelsLoading}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setBoardToDelete(null);
          setSelectedIds([]);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Item"
        description={
          boardToDelete
            ? "Are you sure you want to delete this item? This action cannot be undone."
            : `Are you sure you want to delete ${selectedIds.length} board(s)? This action cannot be undone.`
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />

      <JsonViewModal
        isOpen={!!viewingJson}
        onClose={() => setViewingJson(null)}
        data={viewingJson}
        title={viewingJsonTitle}
      />
    </div>
  );
}
