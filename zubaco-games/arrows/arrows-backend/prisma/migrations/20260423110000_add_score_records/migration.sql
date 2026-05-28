-- AlterTable
ALTER TABLE "arrows" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "game_session_arrows" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "game_session_boards" ADD COLUMN     "score" INTEGER,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "round_number" DROP DEFAULT;

-- AlterTable
ALTER TABLE "game_sessions" ADD COLUMN     "time_bonus" INTEGER,
ALTER COLUMN "stage_id" DROP DEFAULT,
ALTER COLUMN "expiry_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stage_level_configs" ALTER COLUMN "order" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "game_session_arrows" ADD CONSTRAINT "game_session_arrows_session_board_id_fkey" FOREIGN KEY ("session_board_id") REFERENCES "game_session_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
