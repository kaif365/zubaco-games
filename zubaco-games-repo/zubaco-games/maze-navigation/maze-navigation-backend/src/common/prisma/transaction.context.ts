import { AsyncLocalStorage } from "async_hooks";

import type { Prisma } from "@prisma";

/**
 * AsyncLocalStorage context for Prisma transaction clients.
 */
export const transactionContext = new AsyncLocalStorage<
  Prisma.TransactionClient | undefined
>();
