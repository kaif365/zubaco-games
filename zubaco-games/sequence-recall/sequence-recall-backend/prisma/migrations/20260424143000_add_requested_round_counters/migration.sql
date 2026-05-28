ALTER TABLE "game_sessions"
ADD COLUMN "demo_round_requested" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "actual_round_requested" INTEGER NOT NULL DEFAULT 0;
