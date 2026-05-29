-- Prevent duplicate boards for the same round in a session
-- Partial index: only enforces uniqueness among non-deleted rows
CREATE UNIQUE INDEX "game_session_boards_session_round_unique"
ON "game_session_boards" ("session_id", "round_number")
WHERE "deleted_at" IS NULL;
