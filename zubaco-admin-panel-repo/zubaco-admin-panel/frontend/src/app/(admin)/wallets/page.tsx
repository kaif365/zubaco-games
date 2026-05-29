'use client';

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  fetchTransactions,
  type Transaction,
} from "@/lib/api/endpoints/wallets";

export default function WalletManagementPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetchTransactions({ page, limit });
        if (res) {
          setTransactions(res.transactions);
          setTotal(res.total);
        }
      } catch (err) {
        console.error("Failed to load transactions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  const totalDeposits = transactions
    .filter((t) => t.type === "deposit" && t.status === "completed")
    .reduce((s, t) => s + t.amount, 0);

  const pendingWithdrawals = transactions.filter(
    (t) => t.type === "withdrawal" && t.status === "pending"
  );

  return (
    <PageContainer>
      <PageHeader
        title="Wallet & Payments"
        description="Manage user wallets, pending withdrawals, and payment disputes."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">Total Deposits</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : `₹${totalDeposits.toLocaleString()}`}
          </p>
        </div>
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">Pending Withdrawals</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : pendingWithdrawals.length}
          </p>
        </div>
        <div className="rounded-xl bg-card p-6 border">
          <h3 className="text-sm font-medium text-muted-foreground">Total Transactions</h3>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "..." : total.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-card border p-6">
        <h2 className="text-lg font-semibold mb-4">Transactions</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3">User</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b">
                  <td className="py-3">{tx.userName ?? tx.userId}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      tx.type === "deposit"
                        ? "bg-green-500/10 text-green-500"
                        : tx.type === "withdrawal"
                        ? "bg-red-500/10 text-red-500"
                        : tx.type === "prize"
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-gray-500/10 text-gray-400"
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 font-medium tabular-nums">₹{tx.amount.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      tx.status === "completed"
                        ? "bg-green-500/10 text-green-500"
                        : tx.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3">{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm rounded border disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
