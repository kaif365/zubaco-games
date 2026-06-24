'use client';

import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Plus, Search, Trash2, X, FileJson, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useBoards,
  useDeleteBoards,
  useGameLevels,
  useBoardDetails,
} from '../../hooks/pools/useDefaultPool';
import { SpotTheDifferenceBoardModal } from './spot-the-difference/SpotTheDifferenceBoardModal';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { getGameMetadata } from '@/config/game-registry';
import type { BaseGameBoard } from '@/types/pool';
import type { ColumnDef } from '@/types/common';
import type { SpotTheDifferenceBoard } from '@/types/games/spot-the-difference';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/shared/Pagination';
import { useAutoBackPageOnEmpty } from '@/hooks/useAutoBackPageOnEmpty';
import { slugifyGameName } from '@/utils/slugify';
import { JsonViewModal } from '@/components/shared/JsonViewModal';
import { getGamePoolAdapter } from '@/config/pool-registry';
import { formatDate } from '@/utils/format';
import { normalizeLevelName } from '@/utils/level-order';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SpotTheDifferencePoolViewProps {
  gameId: string;
  gameName: string;
}

export function SpotTheDifferencePoolView({ gameId, gameName }: SpotTheDifferencePoolViewProps) {
  const DEFAULT_PAGE_SIZE = 10;
  const poolLabel = 'Game Boards';
  const poolDescription = 'Manage boards, reference/find images, and difference coordinate regions.';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewingJson, setViewingJson] = useState<unknown | null>(null);

  const { data: levels, isLoading: levelsLoading } = useGameLevels(gameName);

  const { data, isLoading } = useBoards(gameId, gameName, {
    levelId: selectedLevelId === 'all' ? undefined : selectedLevelId,
    search: debouncedSearch,
    limit: pageSize,
    skip: (page - 1) * pageSize,
  });

  const { mutate: deleteBoards, isPending: isDeleting } = useDeleteBoards(gameId, gameName);
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
    async (row: unknown) => {
      const board = row as BaseGameBoard;
      const adapter = getGamePoolAdapter(gameName);

      if (adapter.formatBoardDetails && board.id) {
        try {
          const details = await getDetails(board.id);
          if (details) {
            setViewingJson(adapter.formatBoardDetails(details));
            return;
          }
        } catch (err) {
          console.error('Failed to fetch board details:', err);
        }
      }
      setViewingJson(row);
    },
    [gameName, getDetails],
  );



  // Custom premium columns definition
  const columns = useMemo<ColumnDef<SpotTheDifferenceBoard>[]>(() => {
    return [
      {
        key: 'name',
        header: 'Board Name',
        cell: (row) => (
          <div className="flex items-center gap-2.5">
            <ImageIcon className="h-4 w-4 text-primary/60 shrink-0" />
            <span className="font-semibold text-foreground">{row.name}</span>
          </div>
        ),
      },
      {
        key: 'difficulty',
        header: 'Difficulty',
        cell: (row) => {
          const lvlName = row.level?.name || 'N/A';
          const norm = normalizeLevelName(lvlName);
          const badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline';
          let customStyle = '';

          if (norm === 'easy') {
            customStyle = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-500/15';
          } else if (norm === 'medium') {
            customStyle = 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 hover:bg-amber-500/15';
          } else if (norm === 'hard') {
            customStyle = 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400 hover:bg-rose-500/15';
          } else if (norm === 'demo') {
            customStyle = 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 hover:bg-indigo-500/15';
          }

          return (
            <Badge variant={badgeVariant} className={`capitalize font-medium ${customStyle}`}>
              {lvlName}
            </Badge>
          );
        },
      },
      {
        key: 'sizing',
        header: 'Image Size',
        cell: (row) => (
          <span className="text-sm text-muted-foreground font-medium">
            {row.imageWidth || 0} x {row.imageHeight || 0}
          </span>
        ),
      },
      {
        key: 'differences',
        header: 'Differences',
        cell: (row) => {
          const count = row.differenceCount || 0;
          return (
            <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 border-rose-500/10 dark:text-rose-400 font-bold px-2 py-0.5">
              {count} region{count !== 1 && 's'}
            </Badge>
          );
        },
      },
      {
        key: 'created_at',
        header: 'Added On',
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.createdAt ?? row.created_at ?? null)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: 'w-[80px]',
        cell: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewJson(row)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <FileJson className="h-4 w-4" />
              <span className="sr-only">View JSON</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(row.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        ),
      },
    ];
  }, [handleDeleteClick, handleViewJson, isDeleting]);

  const handleDownloadSampleJson = useCallback(() => {
    const metadata = getGameMetadata(gameName);
    const sample = metadata?.poolSampleJson;
    if (!sample) return;

    const fileName = metadata?.poolSampleJsonFileName ?? `${slugifyGameName(gameName)}-sample.json`;
    const json = JSON.stringify(sample, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [gameName]);

  const hasSampleJson = Boolean(getGameMetadata(gameName)?.poolSampleJson);
  const hasActiveFilters = search.length > 0 || selectedLevelId !== 'all';
  const handleClearFilters = useCallback(() => {
    setSearch('');
    setSelectedLevelId('all');
    setSelectedIds([]);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">{poolLabel}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{poolDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasSampleJson && (
              <Button size="sm" variant="outline" className="gap-2" onClick={handleDownloadSampleJson}>
                <Download className="h-4 w-4" />
                Download Sample JSON
              </Button>
            )}
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                setEditingBoardId(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create Board
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleBulkDeleteClick}
              disabled={isDeleting || selectedIds.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected {selectedIds.length > 0 && `(${selectedIds.length})`}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filtering bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pb-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search board names..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-1.5 top-1.5 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="w-full sm:w-[200px]">
              <Select
                value={selectedLevelId}
                onValueChange={(val) => {
                  setSelectedLevelId(val);
                  setPage(1);
                }}
                disabled={levelsLoading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={levelsLoading ? 'Loading levels...' : 'Difficulty: All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Difficulty: All</SelectItem>
                  {levels?.map((lvl) => (
                    <SelectItem key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9 shrink-0 gap-1 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Central DataTable */}
          <DataTable
            columns={columns}
            data={(data?.data as SpotTheDifferenceBoard[]) ?? []}
            isLoading={isLoading}
            rowKey={(row: SpotTheDifferenceBoard) => row.id}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyMessage="No boards found for this game."
          />

          {/* Table pagination selectors */}
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

      {/* Visual coordinates creator and editor modal */}
      <SpotTheDifferenceBoardModal
        gameId={gameId}
        gameName={gameName}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        levels={levels}
        levelsLoading={levelsLoading}
        editingBoardId={editingBoardId}
      />

      {/* Delete confirmation dialog */}
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

      {/* Standard raw json inspector modal */}
      <JsonViewModal
        isOpen={!!viewingJson}
        onClose={() => setViewingJson(null)}
        data={viewingJson}
        title={`View Board Details: ${(viewingJson as { name?: string })?.name || ""}`}
      />
    </div>
  );
}
