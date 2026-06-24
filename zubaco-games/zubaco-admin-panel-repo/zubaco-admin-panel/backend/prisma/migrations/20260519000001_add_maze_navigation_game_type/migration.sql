-- Migration: add MAZE_NAVIGATION to the game_type enum.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
-- These statements are intentionally placed here without a BEGIN/COMMIT wrapper.
-- If prisma migrate deploy wraps this in a transaction and fails, apply the
-- ALTER TYPE statement manually via psql before re-running migrate:deploy.

ALTER TYPE "game_type" ADD VALUE IF NOT EXISTS 'MAZE_NAVIGATION';
