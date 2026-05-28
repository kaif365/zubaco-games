-- Replace (user_id, client_move_id) unique with (session_id, client_move_id) unique.
-- Drop the old unique index and the now-redundant user_id column.

DROP INDEX IF EXISTS "game_moves_user_id_client_move_id_key";

ALTER TABLE "game_moves" DROP COLUMN IF EXISTS "user_id";

CREATE UNIQUE INDEX "game_moves_session_id_client_move_id_key"
  ON "game_moves"("session_id", "client_move_id");
