ALTER TABLE "game_sessions"
ADD COLUMN IF NOT EXISTS "game_started_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "game_ended_at" TIMESTAMP(3);

ALTER TABLE "game_session_stage_configs"
ADD COLUMN IF NOT EXISTS "enable_demo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "total_demo_rounds" INTEGER NOT NULL DEFAULT 0;
