ALTER TABLE "game_sessions"
ADD COLUMN IF NOT EXISTS "requested_demo_round" INTEGER,
ADD COLUMN IF NOT EXISTS "requested_actual_round" INTEGER,
ADD COLUMN IF NOT EXISTS "requested_level_id" TEXT;
