-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "time_limit" INTEGER NOT NULL DEFAULT 120;

-- CreateTable
CREATE TABLE "game_session_boards" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "grid_x" INTEGER NOT NULL,
    "grid_y" INTEGER NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_session_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session_arrows" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "arrow_id" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "head_direction" INTEGER NOT NULL,
    "waypoints" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_session_arrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_moves" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "session_arrow_id" TEXT,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_moves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_session_boards_session_id_key" ON "game_session_boards"("session_id");

-- CreateIndex
CREATE INDEX "game_session_arrows_session_id_idx" ON "game_session_arrows"("session_id");

-- CreateIndex
CREATE INDEX "game_moves_session_id_clicked_at_idx" ON "game_moves"("session_id", "clicked_at");

-- AddForeignKey
ALTER TABLE "game_session_boards" ADD CONSTRAINT "game_session_boards_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_boards" ADD CONSTRAINT "game_session_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_arrows" ADD CONSTRAINT "game_session_arrows_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_session_arrow_id_fkey" FOREIGN KEY ("session_arrow_id") REFERENCES "game_session_arrows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
