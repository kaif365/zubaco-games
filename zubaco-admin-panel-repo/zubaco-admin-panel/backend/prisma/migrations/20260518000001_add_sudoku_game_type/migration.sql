-- Migration: add SUDOKU to game_type enum.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
-- These statements are intentionally placed here without a BEGIN/COMMIT wrapper.

ALTER TYPE "game_type" ADD VALUE IF NOT EXISTS 'SUDOKU';
