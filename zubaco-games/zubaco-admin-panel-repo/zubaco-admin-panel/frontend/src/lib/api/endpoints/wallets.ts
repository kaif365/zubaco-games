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
  return get<TransactionsResponse>("/admin/wallets/transactions", {
    query: { page: params.page, limit: params.limit },
  });
}
