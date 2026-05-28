-- DropForeignKey
ALTER TABLE "board_shuffles" DROP CONSTRAINT "board_shuffles_board_id_fkey";

-- AlterTable
ALTER TABLE "board_shuffles" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "board_shuffles" ADD CONSTRAINT "board_shuffles_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
