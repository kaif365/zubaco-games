ALTER TABLE "boards"
ADD COLUMN "game_type" TEXT NOT NULL DEFAULT 'ARROWS';

ALTER TABLE "game_session_boards"
ADD COLUMN "game_type" TEXT NOT NULL DEFAULT 'ARROWS';

CREATE TABLE "dot_pairs" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "start_x" INTEGER NOT NULL,
    "start_y" INTEGER NOT NULL,
    "end_x" INTEGER NOT NULL,
    "end_y" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dot_pairs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dot_pairs_board_id_deleted_at_idx" ON "dot_pairs"("board_id", "deleted_at");

ALTER TABLE "dot_pairs" ADD CONSTRAINT "dot_pairs_board_id_fkey"
    FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "game_session_paths" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "pair_id" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "start_x" INTEGER NOT NULL,
    "start_y" INTEGER NOT NULL,
    "end_x" INTEGER NOT NULL,
    "end_y" INTEGER NOT NULL,
    "path" JSONB,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "game_session_paths_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "game_session_paths_session_id_idx" ON "game_session_paths"("session_id");

ALTER TABLE "game_session_paths" ADD CONSTRAINT "game_session_paths_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
