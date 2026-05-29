"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGamesQuery,
  useUpdateGameByIdMutation,
} from "@/lib/react-query/games";
import { useDebounce } from "@/hooks/useDebounce";
import { PAGINATION_DEFAULTS } from "@/config/pagination";
import { ROUTES } from "@/config/routes";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableToolbar } from "@/components/shared/TableToolbar";
import { Pagination } from "@/components/shared/Pagination";
import { getGameColumns } from "../config/columns";
import { useAutoBackPageOnEmpty } from "@/hooks/useAutoBackPageOnEmpty";
import { useToast } from "@/providers/ToastProvider";
import type { GameStatus } from "@/types/game";

export function GamesTable() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.LIMIT);
  const [updatingStatusGameId, setUpdatingStatusGameId] = useState<
    string | null
  >(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useGamesQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  useAutoBackPageOnEmpty({
    page,
    pageSize,
    itemsLength: data?.data?.length ?? 0,
    total: data?.total ?? 0,
    isLoading,
    isFetching: false,
    onPageChange: setPage,
  });

  const updateGameMutation = useUpdateGameByIdMutation();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleView = (gameId: string) => {
    router.push(ROUTES.GAMES_DETAIL(gameId));
  };

  const handleStatusChange = async (
    gameId: string,
    status: Extract<GameStatus, "active" | "inactive">,
  ) => {
    const game = data?.data.find((item) => item.id === gameId);
    if (!game || game.status === status) return;

    const apiStatus = status === "active" ? "ACTIVE" : "INACTIVE";
    setUpdatingStatusGameId(gameId);

    try {
      await updateGameMutation.mutateAsync({
        id: gameId,
        payload: { status: apiStatus },
      });
      toast({
        title: "Game status updated",
        description: `"${game.name}" is now ${
          status === "active" ? "active" : "disabled"
        }.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Status update failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatusGameId(null);
    }
  };

  const columns = getGameColumns(
    handleView,
    handleStatusChange,
    updatingStatusGameId,
  );
  const games = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Games"
        description="Manage game metadata, stages, rules, and pool mapping."
      />

      <TableToolbar
        search={search}
        onSearchChange={handleSearchChange}
        total={total}
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={games}
            isLoading={isLoading}
            rowKey={(row) => row.id}
            emptyMessage={search ? "No games match your search." : "No games found."}
          />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
