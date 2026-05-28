-- AlterTable: add level_delay to game_configurations
ALTER TABLE "game_configurations" ADD COLUMN "level_delay" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: add level_delay to game_session_snapshots
ALTER TABLE "game_session_snapshots" ADD COLUMN "level_delay" INTEGER NOT NULL DEFAULT 0;
