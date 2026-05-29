-- Move preview_duration_seconds and mismatch_display_duration_seconds from game_config JSONB
-- to dedicated nullable columns so they can be queried and typed directly.
-- Nullable so non-MCM games are unaffected.

ALTER TABLE "games" ADD COLUMN "preview_duration_seconds" INTEGER;
ALTER TABLE "games" ADD COLUMN "mismatch_display_duration_seconds" INTEGER;

-- Backfill existing MCM rows from game_config JSONB if data is already there.
UPDATE "games"
SET
    "preview_duration_seconds" = ("game_config"->>'preview_duration_seconds')::INTEGER,
    "mismatch_display_duration_seconds" = ("game_config"->>'mismatch_display_duration_seconds')::INTEGER
WHERE "game_type" = 'MEMORY_CARD_MATCHING'
  AND "game_config" IS NOT NULL;

-- Strip the moved keys out of game_config to avoid duplication.
UPDATE "games"
SET "game_config" = "game_config" - 'preview_duration_seconds' - 'mismatch_display_duration_seconds'
WHERE "game_type" = 'MEMORY_CARD_MATCHING'
  AND "game_config" IS NOT NULL;
