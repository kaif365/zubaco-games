-- AlterTable
ALTER TABLE "levels" ADD COLUMN     "difficulty_score" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stage_demo_level_configs" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stage_level_configs" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;
