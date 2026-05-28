-- AlterTable
ALTER TABLE "game_configurations" ADD COLUMN     "demo_rounds" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "game_input" ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "game_session_snapshots" ADD COLUMN     "demo_rounds" INTEGER NOT NULL DEFAULT 0;
