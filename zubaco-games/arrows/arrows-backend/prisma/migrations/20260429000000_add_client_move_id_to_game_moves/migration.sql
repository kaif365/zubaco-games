-- Add userId and clientMoveId to game_moves
-- Existing rows get a generated placeholder so the NOT NULL constraint is satisfied.
ALTER TABLE "game_moves"
  ADD COLUMN "user_id"        TEXT NOT NULL DEFAULT '',
  ADD COLUMN "client_move_id" TEXT NOT NULL DEFAULT '';

-- Backfill existing rows: use the session's user_id and the row's own id as a stable placeholder.
UPDATE "game_moves" gm
SET    "user_id"        = gs.user_id,
       "client_move_id" = gm.id
FROM   "game_sessions" gs
WHERE  gs.id = gm.session_id;

-- Remove the temporary defaults (new rows must supply real values).
ALTER TABLE "game_moves"
  ALTER COLUMN "user_id"        DROP DEFAULT,
  ALTER COLUMN "client_move_id" DROP DEFAULT;

-- Unique constraint: a given clientMoveId is unique per user.
CREATE UNIQUE INDEX "game_moves_user_id_client_move_id_key"
  ON "game_moves"("user_id", "client_move_id");

-- Index already exists for sessionId+clickedAt; add one for the idempotency lookup.
CREATE INDEX "game_moves_user_id_client_move_id_idx"
  ON "game_moves"("user_id", "client_move_id");
