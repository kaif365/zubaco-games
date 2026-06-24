'use client';

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  fetchSeasons,
  deleteSeason,
  openSeason,
  closeSeason,
  type Season,
} from "@/lib/api/endpoints/seasons";

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSeasons() {
    setLoading(true);
    try {
      const data = await fetchSeasons();
      if (data) setSeasons(data);
    } catch (err) {
      console.error("Failed to load seasons:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSeasons();
  }, []);

  const activeCount = seasons.filter((s) => s.status === "open").length;
  const totalPlayers = seasons.reduce((sum, s) => sum + (s.totalPlayers ?? 0), 0);
  const totalPrizePool = seasons.reduce((sum, s) => sum + (s.prizePool ?? 0), 0);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this season?")) return;
    try {
      await deleteSeason(id);
      setSeasons((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete season:", err);
    }
  }

  async function handleOpen(id: string) {
    try {
      const updated = await openSeason(id);
      if (updated) {
        setSeasons((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } catch (err) {
      console.error("Failed to open season:", err);
    }
  }

  async function handleClose(id: string) {
    try {
      const updated = await closeSeason(id);
      if (updated) {
        setSeasons((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } catch (err) {
      console.error("Failed to close season:", err);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Season Management"
        description="Create and manage tournament seasons, stages, and cohorts."
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">Active Seasons</h3>
          <p className="mt-2 text-3xl font-bold">{loading ? "..." : activeCount}</p>
        </div>
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">Total Players</h3>
          <p className="mt-2 text-3xl font-bold">{loading ? "..." : totalPlayers.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">Prize Pool (Total)</h3>
          <p className="mt-2 text-3xl font-bold">{loading ? "..." : `₹${totalPrizePool.toLocaleString()}`}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-card border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Seasons</h2>
          <a href="/seasons/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Create Season
          </a>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading seasons...</p>
        ) : seasons.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No seasons created yet. Create your first season to start the tournament.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3">Name</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Start Date</th>
                <th className="pb-3">End Date</th>
                <th className="pb-3">Players</th>
                <th className="pb-3">Prize Pool</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <tr key={season.id} className="border-b">
                  <td className="py-3 font-medium">{season.name}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      season.status === "open"
                        ? "bg-green-500/10 text-green-500"
                        : season.status === "draft"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-gray-500/10 text-gray-400"
                    }`}>
                      {season.status}
                    </span>
                  </td>
                  <td className="py-3">{new Date(season.startDate).toLocaleDateString()}</td>
                  <td className="py-3">{new Date(season.endDate).toLocaleDateString()}</td>
                  <td className="py-3">{season.totalPlayers ?? 0}</td>
                  <td className="py-3">₹{(season.prizePool ?? 0).toLocaleString()}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {season.status === "draft" && (
                        <button
                          onClick={() => handleOpen(season.id)}
                          className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                        >
                          Open
                        </button>
                      )}
                      {season.status === "open" && (
                        <button
                          onClick={() => handleClose(season.id)}
                          className="text-xs px-2 py-1 rounded bg-orange-600 text-white hover:bg-orange-700"
                        >
                          Close
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(season.id)}
                        className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageContainer>
  );
}
