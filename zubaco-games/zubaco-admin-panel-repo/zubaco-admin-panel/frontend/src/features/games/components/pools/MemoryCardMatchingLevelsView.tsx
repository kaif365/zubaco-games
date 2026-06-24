"use client";

import { useMemo, useState } from "react";
import { FileJson, Image as ImageIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { JsonViewModal } from "@/components/shared/JsonViewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { useAutoBackPageOnEmpty } from "@/hooks/useAutoBackPageOnEmpty";
import { useDebounce } from "@/hooks/useDebounce";
import { useDifficulties } from "@/features/games/hooks/pools/useDefaultPool";
import {
  useDeleteMemoryCardMatchingLevels,
  useMemoryCardMatchingLevels,
} from "@/features/games/hooks/pools/useMemoryCardMatchingLevels";
import type { ColumnDef } from "@/types/common";
import {
  type MemoryCardMatchingLevel,
  type MemoryCardContentType,
  isImageContentConfig,
  isSymbolContentConfig,
} from "@/types/games/memory-card-matching";
import { formatDate } from "@/utils/format";
import { MemoryCardMatchingLevelModal } from "./memory-card-matching/MemoryCardMatchingLevelModal";

interface MemoryCardMatchingLevelsViewProps {
  gameId: string;
  gameName: string;
}

const GRID_FILTER_OPTIONS = [
  { label: "All Grids", value: "all" },
  { label: "2 x 2", value: "2x2", gridRows: 2, gridColumns: 2 },
  { label: "2 x 4", value: "2x4", gridRows: 2, gridColumns: 4 },
  { label: "4 x 4", value: "4x4", gridRows: 4, gridColumns: 4 },
  { label: "4 x 6", value: "4x6", gridRows: 4, gridColumns: 6 },
  { label: "6 x 6", value: "6x6", gridRows: 6, gridColumns: 6 },
] as const;

function getGridFilter(value: string) {
  return GRID_FILTER_OPTIONS.find((option) => option.value === value);
}

export function MemoryCardMatchingLevelsView({
  gameId,
  gameName,
}: MemoryCardMatchingLevelsViewProps) {
  const DEFAULT_PAGE_SIZE = 10;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [gridFilter, setGridFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLevel, setEditingLevel] =
    useState<MemoryCardMatchingLevel | null>(null);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewingJson, setViewingJson] = useState<unknown | null>(null);

  const { data: difficultyData, isLoading: difficultiesLoading } = useDifficulties(gameName);
  const difficulties = difficultyData?.data ?? [];

  const selectedGrid = getGridFilter(gridFilter);
  const { data, isLoading, isFetching } = useMemoryCardMatchingLevels(
    gameId,
    gameName,
    {
      search: debouncedSearch,
      gridRows:
        selectedGrid && "gridRows" in selectedGrid
          ? selectedGrid.gridRows
          : undefined,
      gridColumns:
        selectedGrid && "gridColumns" in selectedGrid
          ? selectedGrid.gridColumns
          : undefined,
      difficultyId: difficultyFilter === "all" ? undefined : difficultyFilter,
      cardContentType: contentTypeFilter === "all" ? undefined : (contentTypeFilter as MemoryCardContentType),
      skip: (page - 1) * pageSize,
      limit: pageSize,
    },
  );

  const { mutate: deleteLevels, isPending: isDeleting } =
    useDeleteMemoryCardMatchingLevels(gameId, gameName);

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const hasActiveFilters = search.length > 0 || gridFilter !== "all";

  useAutoBackPageOnEmpty({
    page,
    pageSize,
    itemsLength: data?.data?.length ?? 0,
    total: totalCount,
    isLoading,
    isFetching,
    onPageChange: setPage,
  });

  const clearFilters = () => {
    setSearch("");
    setGridFilter("all");
    setDifficultyFilter("all");
    setContentTypeFilter("all");
    setSelectedIds([]);
    setPage(1);
  };

  const columns = useMemo<ColumnDef<MemoryCardMatchingLevel>[]>(
    () => [
      {
        key: "name",
        header: "Level Name",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary/70" />
            <span className="font-medium">{row.name}</span>
          </div>
        ),
      },
      {
        key: "difficulty",
        header: "Difficulty",
        cell: (row) => (
          <Badge variant="outline" className="capitalize">
            {row.difficulty?.name || "—"}
          </Badge>
        ),
      },
      {
        key: "grid",
        header: "Grid",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.gridRows} x {row.gridColumns}
          </span>
        ),
      },
      {
        key: "content",
        header: "Content",
        cell: (row) => {
          const cc = row.contentConfig;
          if (isSymbolContentConfig(cc)) {
            return (
              <Badge variant="outline">
                {(cc.items ?? []).length} symbols
              </Badge>
            );
          }
          if (isImageContentConfig(cc)) {
            return (
              <Badge variant="outline">
                {cc.assetKeys?.length ?? 0} assets
              </Badge>
            );
          }
          return <Badge variant="outline">—</Badge>;
        },
      },
      {
        key: "type",
        header: "Type",
        cell: (row) => (
          <Badge variant="secondary" className="capitalize">
            {row.cardContentType}
          </Badge>
        ),
      },
      {
        key: "timing",
        header: "Timing",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.previewDurationSeconds}s preview /{" "}
            {row.mismatchDisplayDurationSeconds}s mismatch
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Added On",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "w-[130px]",
        cell: (row) => (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setViewingJson(row)}
              aria-label={`View JSON for ${row.name}`}
            >
              <FileJson className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setEditingLevel(row);
                setIsCreateOpen(false);
              }}
              disabled={isDeleting}
              aria-label={`Edit ${row.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setIdsToDelete([row.id]);
                setIsDeleteOpen(true);
              }}
              disabled={isDeleting}
              aria-label={`Delete ${row.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [isDeleting],
  );

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIdsToDelete(selectedIds);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (idsToDelete.length === 0) return;
    const pageWas = page;
    const itemsOnPageWas = data?.data?.length ?? 0;
    const deletedCount = idsToDelete.length;

    deleteLevels(idsToDelete, {
      onSuccess: () => {
        if (pageWas > 1 && itemsOnPageWas > 0 && deletedCount >= itemsOnPageWas) {
          setPage(pageWas - 1);
        }
      },
      onSettled: () => {
        setIsDeleteOpen(false);
        setIdsToDelete([]);
        setSelectedIds([]);
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">Levels</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage Memory Card Matching grids and image pair assets.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                setEditingLevel(null);
                setIsCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Level
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleBulkDelete}
              disabled={isDeleting || selectedIds.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected{" "}
              {selectedIds.length > 0 && `(${selectedIds.length})`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search levels..."
                className="h-9 pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setSelectedIds([]);
                  setPage(1);
                }}
              />
            </div>

            <Select
              value={gridFilter}
              onValueChange={(value) => {
                setGridFilter(value);
                setSelectedIds([]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Grid" />
              </SelectTrigger>
              <SelectContent>
                {GRID_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={difficultyFilter}
              onValueChange={(value) => {
                setDifficultyFilter(value);
                setSelectedIds([]);
                setPage(1);
              }}
              disabled={difficultiesLoading}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {difficulties.map((difficulty) => (
                  <SelectItem key={difficulty.id} value={difficulty.id}>
                    {difficulty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={contentTypeFilter}
              onValueChange={(value) => {
                setContentTypeFilter(value);
                setSelectedIds([]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="symbol">Symbol</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border border-border bg-muted/25 px-3 text-xs hover:bg-muted/40 hover:text-foreground"
                onClick={clearFilters}
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
            emptyMessage="No Memory Card Matching levels found."
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

      <MemoryCardMatchingLevelModal
        gameId={gameId}
        gameName={gameName}
        open={isCreateOpen || editingLevel !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setIsCreateOpen(false);
            setEditingLevel(null);
          }
        }}
        editingLevel={editingLevel}
      />

      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setIdsToDelete([]);
        }}
        onConfirm={confirmDelete}
        title="Delete Levels"
        description="Are you sure you want to delete the selected level(s)? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />

      <JsonViewModal
        isOpen={!!viewingJson}
        onClose={() => setViewingJson(null)}
        data={viewingJson}
        title={`View Level: ${(viewingJson as { name?: string })?.name || ""}`}
      />
    </div>
  );
}
