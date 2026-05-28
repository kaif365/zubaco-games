-- DropIndex
DROP INDEX "game_session_paths_session_id_idx";

-- AlterTable
ALTER TABLE "game_session_boards" ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "round_number" DROP DEFAULT;

-- AlterTable
ALTER TABLE "game_session_stage_configs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "cheat_flags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "session_board_id" TEXT NOT NULL,
    "flag_type" INTEGER NOT NULL,
    "evidence" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cheat_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cheat_flags_user_id_idx" ON "cheat_flags"("user_id");

-- CreateIndex
CREATE INDEX "cheat_flags_session_id_idx" ON "cheat_flags"("session_id");

-- CreateIndex
CREATE INDEX "cheat_flags_session_board_id_idx" ON "cheat_flags"("session_board_id");

-- CreateIndex
CREATE INDEX "game_session_paths_session_id_deleted_at_idx" ON "game_session_paths"("session_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "cheat_flags" ADD CONSTRAINT "cheat_flags_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheat_flags" ADD CONSTRAINT "cheat_flags_session_board_id_fkey" FOREIGN KEY ("session_board_id") REFERENCES "game_session_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
