/*
  Warnings:

  - Added the required column `max_time_bonus` to the `game_session_stage_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_score` to the `game_session_stage_level_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_time_bonus` to the `stage_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_score` to the `stage_level_configs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "game_session_stage_configs" ADD COLUMN "max_time_bonus" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "game_session_stage_configs" ALTER COLUMN "max_time_bonus" DROP DEFAULT;

-- AlterTable
ALTER TABLE "game_session_stage_level_configs" ADD COLUMN "max_score" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "game_session_stage_level_configs" ALTER COLUMN "max_score" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stage_configs" ADD COLUMN "max_time_bonus" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "stage_configs" ALTER COLUMN "max_time_bonus" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stage_level_configs" ADD COLUMN "max_score" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "stage_level_configs" ALTER COLUMN "max_score" DROP DEFAULT;
