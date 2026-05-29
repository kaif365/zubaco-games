/*
  Warnings:

  - A unique constraint covering the columns `[user_id,stage_id]` on the table `game_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "game_sessions_user_id_stage_id_idx";

-- AlterTable
ALTER TABLE "game_configurations" ADD COLUMN     "wrong_move_handling" INTEGER NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "game_session_snapshots" ADD COLUMN     "wrong_move_handling" INTEGER NOT NULL DEFAULT 4;

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_user_id_stage_id_key" ON "game_sessions"("user_id", "stage_id");
