import { QueryStateHandler } from '@components/shared/QueryStateHandler';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';

import { useLeaderboard } from '../hooks/useLeaderboard';
import type { LeaderboardEntry } from '../types/leaderboard.types';

interface LeaderboardTableProps {
  gameId: string;
}

/**
 * Leaderboard row.
 *
 * @param {{ entry: LeaderboardEntry; }} props - Component props.
 * @param {LeaderboardEntry} props.entry - The entry.
 *
 * @returns {JSX.Element} The rendered element.
 */
function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-muted/50">
      <span className="text-muted-foreground w-8 text-center text-sm font-bold">#{entry.rank}</span>
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt={entry.playerName}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
          {entry.playerName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="flex-1 text-sm font-medium">{entry.playerName}</span>
      <span className="text-sm font-bold">{entry.score.toLocaleString()}</span>
    </div>
  );
}

/**
 * Leaderboard table.
 *
 * @param {LeaderboardTableProps} props - Component props.
 * @param {string} props.gameId - The game id.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function LeaderboardTable({ gameId }: LeaderboardTableProps) {
  const { data, isLoading, isError, error } = useLeaderboard({ gameId });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryStateHandler
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!data?.entries.length}
          emptyFallback={
            <p className="text-muted-foreground py-8 text-center text-sm">
              No scores yet. Be the first!
            </p>
          }
        >
          <div className="divide-y">
            {data?.entries.map((entry) => (
              <LeaderboardRow key={entry.playerId} entry={entry} />
            ))}
          </div>
        </QueryStateHandler>
      </CardContent>
    </Card>
  );
}
