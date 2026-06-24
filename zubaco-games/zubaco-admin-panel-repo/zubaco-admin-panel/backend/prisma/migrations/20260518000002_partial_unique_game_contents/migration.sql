-- Replace the full unique constraint with a partial one that ignores soft-deleted rows.
-- This allows reusing (game_id, stage_id, language) combos after soft-deletion.

DROP INDEX IF EXISTS "game_contents_game_id_stage_id_language_key";

CREATE UNIQUE INDEX "game_contents_game_id_stage_id_language_key"
ON "game_contents"("game_id", "stage_id", "language")
WHERE "deleted_at" IS NULL;
