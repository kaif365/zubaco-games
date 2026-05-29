/*
  Warnings:

  - You are about to drop the column `details` on the `game_cheat_flags` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `game_cheat_flags` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `flag_type` on the `game_cheat_flags` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "game_cheat_flags" DROP COLUMN "details",
ADD COLUMN     "input_id" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL,
DROP COLUMN "flag_type",
ADD COLUMN     "flag_type" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "game_configurations" ADD COLUMN     "bonus_time_ratio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "initial_sequence_length" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "max_rounds" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "score_per_round" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "time_limit" INTEGER NOT NULL DEFAULT 180;

-- AlterTable
ALTER TABLE "game_input" ADD COLUMN     "is_correct" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "game_sessions" ADD COLUMN     "bonus_time_ratio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "cell_count" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "completed_rounds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "end_time" TIMESTAMP(3),
ADD COLUMN     "initial_sequence_length" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "max_rounds" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "score_per_round" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "time_limit" INTEGER NOT NULL DEFAULT 180;

-- CreateIndex
CREATE INDEX "game_cheat_flags_input_id_idx" ON "game_cheat_flags"("input_id");

-- AddForeignKey
ALTER TABLE "game_cheat_flags" ADD CONSTRAINT "game_cheat_flags_input_id_fkey" FOREIGN KEY ("input_id") REFERENCES "game_input"("id") ON DELETE SET NULL ON UPDATE CASCADE;
