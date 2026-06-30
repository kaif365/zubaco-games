-- ROLLOUT-004 / WALLET-002: storage-level idempotency for the authoritative wallet ledger.
-- Adds a nullable, UNIQUE ledger_key written ONLY by WalletLedgerService (post/debitEntryFee).
-- Legacy rows keep ledger_key = NULL; Postgres UNIQUE indexes permit multiple NULLs, so this
-- applies cleanly against existing data and does not collide with re-used reference_id values.

ALTER TABLE "transactions" ADD COLUMN "ledger_key" TEXT;

CREATE UNIQUE INDEX "transactions_ledger_key_key" ON "transactions"("ledger_key");
