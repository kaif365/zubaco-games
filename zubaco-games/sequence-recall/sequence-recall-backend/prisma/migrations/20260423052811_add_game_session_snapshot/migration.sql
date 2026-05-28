/*
  Warnings:

  - You are about to drop the column `bonus_time_ratio` on the `game_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `cell_count` on the `game_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `initial_sequence_length` on the `game_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `max_rounds` on the `game_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `score_per_round` on the `game_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `time_limit` on the `game_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "game_sessions" DROP COLUMN "bonus_time_ratio",
DROP COLUMN "cell_count",
DROP COLUMN "initial_sequence_length",
DROP COLUMN "max_rounds",
DROP COLUMN "score_per_round",
DROP COLUMN "time_limit";

-- CreateTable
CREATE TABLE "game_session_snapshots" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "max_rounds" INTEGER NOT NULL,
    "cell_count" INTEGER NOT NULL,
    "score_per_round" INTEGER NOT NULL,
    "initial_sequence_length" INTEGER NOT NULL,
    "bonus_time_ratio" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_session_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_session_snapshots_game_session_id_key" ON "game_session_snapshots"("game_session_id");

-- AddForeignKey
ALTER TABLE "game_session_snapshots" ADD CONSTRAINT "game_session_snapshots_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
