-- Migration: add stage_id to game_contents + remove unused visible flags from games.
--
-- This makes game content stage-specific. Existing content rows (all with empty
-- content `{}` from the previous JSONB migration) are deleted because they have
-- no valid stage reference to backfill. Repopulate via the admin panel after deploy.

-- -----------------------------------------------------------------------
-- 1. Remove the three visible-flag columns that moved into the content JSONB
-- -----------------------------------------------------------------------
ALTER TABLE "games"
    DROP COLUMN IF EXISTS "about_visible",
    DROP COLUMN IF EXISTS "scoring_rules_visible",
    DROP COLUMN IF EXISTS "anti_cheat_rules_visible";

-- -----------------------------------------------------------------------
-- 2. Add stage_id as nullable first (safe for live ALTER TABLE)
-- -----------------------------------------------------------------------
ALTER TABLE "game_contents" ADD COLUMN "stage_id" TEXT;

-- -----------------------------------------------------------------------
-- 3. Delete existing rows — they have no valid stage reference
--    (all rows carry empty content `{}` from the previous migration)
-- -----------------------------------------------------------------------
DELETE FROM "game_contents" WHERE "stage_id" IS NULL;

-- -----------------------------------------------------------------------
-- 4. Enforce NOT NULL now that no NULL rows remain
-- -----------------------------------------------------------------------
ALTER TABLE "game_contents" ALTER COLUMN "stage_id" SET NOT NULL;

-- -----------------------------------------------------------------------
-- 5. Swap the unique constraint: (game_id, language) → (game_id, stage_id, language)
-- -----------------------------------------------------------------------
DROP INDEX IF EXISTS "game_contents_game_id_language_key";

CREATE UNIQUE INDEX "game_contents_game_id_stage_id_language_key"
    ON "game_contents"("game_id", "stage_id", "language");

-- -----------------------------------------------------------------------
-- 6. Add index on stage_id for FK lookups
-- -----------------------------------------------------------------------
CREATE INDEX "game_contents_stage_id_idx" ON "game_contents"("stage_id");

-- -----------------------------------------------------------------------
-- 7. Add foreign key: game_contents.stage_id → stages.id (cascade delete)
-- -----------------------------------------------------------------------
ALTER TABLE "game_contents"
    ADD CONSTRAINT "game_contents_stage_id_fkey"
    FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
