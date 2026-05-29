-- AlterTable
ALTER TABLE "game_cheat_flags" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "game_configurations" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "game_input" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "game_levels" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "game_sessions" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "game_cheat_flags_deleted_at_idx" ON "game_cheat_flags"("deleted_at");

-- CreateIndex
CREATE INDEX "game_configurations_deleted_at_idx" ON "game_configurations"("deleted_at");

-- CreateIndex
CREATE INDEX "game_input_deleted_at_idx" ON "game_input"("deleted_at");

-- CreateIndex
CREATE INDEX "game_levels_deleted_at_idx" ON "game_levels"("deleted_at");

-- CreateIndex
CREATE INDEX "game_sessions_deleted_at_idx" ON "game_sessions"("deleted_at");
