-- Migration: add game_config JSONB column and new game type enum values.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
-- These statements are intentionally placed here without a BEGIN/COMMIT wrapper.
-- If prisma migrate deploy wraps this in a transaction and fails, apply the
-- ALTER TYPE statements manually via psql before re-running migrate:deploy.

ALTER TYPE "game_type" ADD VALUE IF NOT EXISTS 'MEMORY_CARD_MATCHING';
ALTER TYPE "game_type" ADD VALUE IF NOT EXISTS 'SLIDING_PUZZLE';

-- game_config JSONB: stores game-specific config for new game types.
-- MCM fields: game_time_limit_seconds, preview_duration_seconds, mismatch_display_duration_seconds
-- SP fields:  display_time
ALTER TABLE "games" ADD COLUMN "game_config" JSONB;
