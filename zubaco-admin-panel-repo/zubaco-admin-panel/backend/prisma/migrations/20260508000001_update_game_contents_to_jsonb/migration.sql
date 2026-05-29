-- Migration: replace flat columns (description, how_to_play, scoring_rules,
-- anti_cheat_rules) with a single JSONB content column.
--
-- Existing rows are seeded with an empty JSON object so the NOT NULL
-- constraint can be applied immediately after the column is added.

-- 1. Add the new column as nullable first
ALTER TABLE "game_contents" ADD COLUMN "content" JSONB;

-- 2. Back-fill existing rows with an empty content object
UPDATE "game_contents" SET "content" = '{}'::jsonb WHERE "content" IS NULL;

-- 3. Enforce NOT NULL now that every row has a value
ALTER TABLE "game_contents" ALTER COLUMN "content" SET NOT NULL;

-- 4. Drop the old flat columns
ALTER TABLE "game_contents"
    DROP COLUMN "description",
    DROP COLUMN "how_to_play",
    DROP COLUMN "scoring_rules",
    DROP COLUMN "anti_cheat_rules";
