-- CreateTable
CREATE TABLE "levels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "name" TEXT,
    "grid_x" INTEGER NOT NULL,
    "grid_y" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_cells" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "cell_type" INTEGER NOT NULL,
    "direction" TEXT,
    "orientation" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "board_cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_blocks" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "block_type" INTEGER NOT NULL,
    "orientation" INTEGER NOT NULL DEFAULT 0,
    "is_fixed" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "board_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_available_blocks" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "block_type" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "board_available_blocks_pkey" PRIMARY KEY ("id")
);

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
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "game_session_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session_blocks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "session_board_id" TEXT NOT NULL,
    "block_id" TEXT,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "block_type" INTEGER NOT NULL,
    "is_fixed" BOOLEAN NOT NULL DEFAULT false,
    "placed_at" TIMESTAMP(3) NOT NULL,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "game_session_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_configs" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "enable_demo" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_level_configs" (
    "id" TEXT NOT NULL,
    "stage_config_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "board_count" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stage_level_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_demo_level_configs" (
    "id" TEXT NOT NULL,
    "stage_config_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "board_count" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stage_demo_level_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_moves" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "session_block_id" TEXT,
    "client_move_id" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "block_type" INTEGER,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stage_demo_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stage_demo_cells" (
    "id" TEXT NOT NULL,
    "demo_board_id" TEXT NOT NULL,
    "cell_id" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "cell_type" INTEGER NOT NULL,
    "direction" TEXT,
    "orientation" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stage_demo_cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stage_demo_blocks" (
    "id" TEXT NOT NULL,
    "demo_board_id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "block_type" INTEGER NOT NULL,
    "orientation" INTEGER NOT NULL DEFAULT 0,
    "is_fixed" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stage_demo_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "levels_deleted_at_idx" ON "levels"("deleted_at");

-- CreateIndex
CREATE INDEX "boards_level_id_deleted_at_idx" ON "boards"("level_id", "deleted_at");

-- CreateIndex
CREATE INDEX "board_cells_board_id_deleted_at_idx" ON "board_cells"("board_id", "deleted_at");

-- CreateIndex
CREATE INDEX "board_blocks_board_id_deleted_at_idx" ON "board_blocks"("board_id", "deleted_at");

-- CreateIndex
CREATE INDEX "board_available_blocks_board_id_idx" ON "board_available_blocks"("board_id");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_idx" ON "game_sessions"("user_id");

-- CreateIndex
CREATE INDEX "game_sessions_status_idx" ON "game_sessions"("status");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_stage_id_status_deleted_at_idx" ON "game_sessions"("user_id", "stage_id", "status", "deleted_at");

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
CREATE INDEX "game_session_blocks_session_id_idx" ON "game_session_blocks"("session_id");

-- CreateIndex
CREATE INDEX "game_session_blocks_session_board_id_idx" ON "game_session_blocks"("session_board_id");

-- CreateIndex
CREATE INDEX "stage_configs_deleted_at_idx" ON "stage_configs"("deleted_at");

-- CreateIndex
CREATE INDEX "stage_configs_stage_id_idx" ON "stage_configs"("stage_id");

-- CreateIndex
CREATE INDEX "stage_level_configs_level_id_idx" ON "stage_level_configs"("level_id");

-- CreateIndex
CREATE INDEX "stage_demo_level_configs_level_id_idx" ON "stage_demo_level_configs"("level_id");

-- CreateIndex
CREATE INDEX "game_moves_session_id_placed_at_idx" ON "game_moves"("session_id", "placed_at");

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

-- CreateIndex
CREATE INDEX "user_stage_demo_boards_user_id_stage_id_level_id_idx" ON "user_stage_demo_boards"("user_id", "stage_id", "level_id");

-- CreateIndex
CREATE INDEX "user_stage_demo_cells_demo_board_id_idx" ON "user_stage_demo_cells"("demo_board_id");

-- CreateIndex
CREATE INDEX "user_stage_demo_blocks_demo_board_id_idx" ON "user_stage_demo_blocks"("demo_board_id");

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_cells" ADD CONSTRAINT "board_cells_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_blocks" ADD CONSTRAINT "board_blocks_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_available_blocks" ADD CONSTRAINT "board_available_blocks_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_stage_configs" ADD CONSTRAINT "game_session_stage_configs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_stage_level_configs" ADD CONSTRAINT "game_session_stage_level_configs_session_stage_config_id_fkey" FOREIGN KEY ("session_stage_config_id") REFERENCES "game_session_stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_boards" ADD CONSTRAINT "game_session_boards_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_boards" ADD CONSTRAINT "game_session_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_blocks" ADD CONSTRAINT "game_session_blocks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_blocks" ADD CONSTRAINT "game_session_blocks_session_board_id_fkey" FOREIGN KEY ("session_board_id") REFERENCES "game_session_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_level_configs" ADD CONSTRAINT "stage_level_configs_stage_config_id_fkey" FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_level_configs" ADD CONSTRAINT "stage_level_configs_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_demo_level_configs" ADD CONSTRAINT "stage_demo_level_configs_stage_config_id_fkey" FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_demo_level_configs" ADD CONSTRAINT "stage_demo_level_configs_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_session_block_id_fkey" FOREIGN KEY ("session_block_id") REFERENCES "game_session_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheat_flags" ADD CONSTRAINT "cheat_flags_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheat_flags" ADD CONSTRAINT "cheat_flags_session_board_id_fkey" FOREIGN KEY ("session_board_id") REFERENCES "game_session_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stage_demo_boards" ADD CONSTRAINT "user_stage_demo_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stage_demo_cells" ADD CONSTRAINT "user_stage_demo_cells_demo_board_id_fkey" FOREIGN KEY ("demo_board_id") REFERENCES "user_stage_demo_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stage_demo_blocks" ADD CONSTRAINT "user_stage_demo_blocks_demo_board_id_fkey" FOREIGN KEY ("demo_board_id") REFERENCES "user_stage_demo_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
