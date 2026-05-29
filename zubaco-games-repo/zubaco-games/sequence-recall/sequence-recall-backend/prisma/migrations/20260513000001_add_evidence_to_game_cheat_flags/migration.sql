-- Add evidence JSONB column to game_cheat_flags if it does not already exist.
-- Using IF NOT EXISTS so this is safe to run even if the column was partially
-- applied via a previous migration on this environment.
ALTER TABLE "game_cheat_flags" ADD COLUMN IF NOT EXISTS "evidence" JSONB;
