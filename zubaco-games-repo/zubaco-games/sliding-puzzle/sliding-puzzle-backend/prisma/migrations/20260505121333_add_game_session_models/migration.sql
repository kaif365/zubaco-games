-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "expiry_at" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "score" INTEGER,
    "time_bonus" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session_stage_configs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_session_stage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session_stage_level_configs" (
    "id" TEXT NOT NULL,
    "session_stage_config_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "level_name" TEXT NOT NULL,
    "board_count" INTEGER NOT NULL,
    "display_time" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_session_stage_level_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session_boards" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "board_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "grid_x" INTEGER NOT NULL,
    "grid_y" INTEGER NOT NULL,
    "full_image_url" TEXT NOT NULL,
    "initial_pieces" JSONB NOT NULL,
    "score" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "game_session_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_moves" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "session_board_id" TEXT NOT NULL,
    "client_move_id" TEXT NOT NULL,
    "from_slot" INTEGER NOT NULL,
    "to_slot" INTEGER NOT NULL,
    "piece_index" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_moves_pkey" PRIMARY KEY ("id")
);

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
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cheat_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stage_demo_boards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "grid_x" INTEGER NOT NULL,
    "grid_y" INTEGER NOT NULL,
    "full_image_url" TEXT NOT NULL,
    "initial_pieces" JSONB NOT NULL,
    "display_time" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stage_demo_boards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_sessions_user_id_idx" ON "game_sessions"("user_id");

-- CreateIndex
CREATE INDEX "game_sessions_status_idx" ON "game_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_user_id_stage_id_key" ON "game_sessions"("user_id", "stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_session_stage_configs_session_id_key" ON "game_session_stage_configs"("session_id");

-- CreateIndex
CREATE INDEX "game_session_stage_level_configs_session_stage_config_id_idx" ON "game_session_stage_level_configs"("session_stage_config_id");

-- CreateIndex
CREATE INDEX "game_session_boards_session_id_idx" ON "game_session_boards"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_session_boards_session_id_round_number_key" ON "game_session_boards"("session_id", "round_number");

-- CreateIndex
CREATE INDEX "game_moves_session_id_clicked_at_idx" ON "game_moves"("session_id", "clicked_at");

-- CreateIndex
CREATE UNIQUE INDEX "game_moves_session_id_client_move_id_key" ON "game_moves"("session_id", "client_move_id");

-- CreateIndex
CREATE INDEX "cheat_flags_user_id_idx" ON "cheat_flags"("user_id");

-- CreateIndex
CREATE INDEX "cheat_flags_session_id_idx" ON "cheat_flags"("session_id");

-- CreateIndex
CREATE INDEX "cheat_flags_session_board_id_idx" ON "cheat_flags"("session_board_id");

-- CreateIndex
CREATE INDEX "user_stage_demo_boards_user_id_stage_id_idx" ON "user_stage_demo_boards"("user_id", "stage_id");

-- AddForeignKey
ALTER TABLE "game_session_stage_configs" ADD CONSTRAINT "game_session_stage_configs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_stage_level_configs" ADD CONSTRAINT "game_session_stage_level_configs_session_stage_config_id_fkey" FOREIGN KEY ("session_stage_config_id") REFERENCES "game_session_stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_boards" ADD CONSTRAINT "game_session_boards_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_boards" ADD CONSTRAINT "game_session_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_session_board_id_fkey" FOREIGN KEY ("session_board_id") REFERENCES "game_session_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheat_flags" ADD CONSTRAINT "cheat_flags_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheat_flags" ADD CONSTRAINT "cheat_flags_session_board_id_fkey" FOREIGN KEY ("session_board_id") REFERENCES "game_session_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stage_demo_boards" ADD CONSTRAINT "user_stage_demo_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
