import { get } from "@/lib/api/http";

export interface Transaction {
  id: string;
  userId: string;
  userName?: string;
  type: "deposit" | "withdrawal" | "prize" | "entry_fee" | "refund";
  amount: number;
  status: "completed" | "pending" | "failed";
  createdAt: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
}

export async function fetchTransactions(params: {
  page?: number;
  limit?: number;
}): Promise<TransactionsResponse | null> {
  const res = await get<any>("/admin/users/transactions", {
    query: { page: params.page, limit: params.limit },
  });
  if (!res) return null;
  const payload = res?.data ?? res;
  const rawList = Array.isArray(payload?.transactions)
    ? payload.transactions
    : Array.isArray(payload)
      ? payload
      : [];

  return {
    transactions: rawList.map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      userName:
        t.user?.display_name ||
        t.user?.username ||
        t.user?.email ||
        (t.user_id ? t.user_id.slice(0, 8) : "—"),
      type: (t.type ?? "deposit").toLowerCase() as Transaction["type"],
      amount: Number(t.amount || 0),
      status: (t.status ?? "completed").toLowerCase() as Transaction["status"],
      createdAt: t.created_at || new Date().toISOString(),
    })),
    total: payload?.total ?? rawList.length,
    page: payload?.page ?? params.page ?? 1,
  };
}
