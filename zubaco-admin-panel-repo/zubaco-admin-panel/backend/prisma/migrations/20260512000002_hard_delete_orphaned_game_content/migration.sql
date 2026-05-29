-- Migration: hard-delete GameContent rows that have no corresponding GameStage link.
--
-- The application now hard-deletes content on every attach/detach. This migration
-- brings existing data in line with that rule by removing rows that were left
-- behind by operations that predated the fix.
DELETE FROM "game_contents"
WHERE NOT EXISTS (
    SELECT 1 FROM "game_stages"
    WHERE "game_stages"."game_id"  = "game_contents"."game_id"
      AND "game_stages"."stage_id" = "game_contents"."stage_id"
);
