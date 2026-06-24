-- Migration: sync game_content lifecycle with game_stages
--
-- Rule: a GameContent row should be active (deleted_at IS NULL) if and only if
-- its corresponding GameStage link exists. The application code now enforces
-- this on every add/remove, but existing rows are out of sync.
--
-- 1. Restore rows that are soft-deleted but whose game→stage link is still alive.
UPDATE "game_contents"
SET "deleted_at" = NULL
WHERE "deleted_at" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "game_stages"
    WHERE "game_stages"."game_id"  = "game_contents"."game_id"
      AND "game_stages"."stage_id" = "game_contents"."stage_id"
  );

-- 2. Soft-delete rows that are active but whose game→stage link no longer exists.
UPDATE "game_contents"
SET "deleted_at" = NOW()
WHERE "deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "game_stages"
    WHERE "game_stages"."game_id"  = "game_contents"."game_id"
      AND "game_stages"."stage_id" = "game_contents"."stage_id"
  );
