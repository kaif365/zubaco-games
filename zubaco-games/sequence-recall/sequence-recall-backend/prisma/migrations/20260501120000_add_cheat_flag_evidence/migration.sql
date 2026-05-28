-- AlterTable: add evidence JSONB column to game_cheat_flags
ALTER TABLE "game_cheat_flags" ADD COLUMN "evidence" JSONB;
