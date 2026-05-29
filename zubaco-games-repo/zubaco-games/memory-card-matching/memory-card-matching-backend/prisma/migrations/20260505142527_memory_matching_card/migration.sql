-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "owner_key" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "final_score" INTEGER,
    "time_limit_seconds" INTEGER NOT NULL,
    "time_remaining_seconds" INTEGER NOT NULL,
    "current_level_index" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session_stage_config_snapshots" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "source_stage_config_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "game_time_limit_seconds" INTEGER NOT NULL,
    "level_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_session_stage_config_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session_level" (
    "id" TEXT NOT NULL,
    "stage_config_snapshot_id" TEXT NOT NULL,
    "source_level_id" TEXT NOT NULL,
    "level_index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "grid_rows" INTEGER NOT NULL,
    "grid_columns" INTEGER NOT NULL,
    "card_content_type" TEXT NOT NULL,
    "preview_duration_seconds" INTEGER NOT NULL,
    "mismatch_display_duration_seconds" INTEGER NOT NULL,
    "content_config_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_session_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session_cards" (
    "id" TEXT NOT NULL,
    "game_session_level_id" TEXT NOT NULL,
    "level_index" INTEGER NOT NULL,
    "card_id" TEXT NOT NULL,
    "pair_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_session_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_moves" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "game_session_level_id" TEXT NOT NULL,
    "level_index" INTEGER NOT NULL,
    "move_index" INTEGER NOT NULL,
    "pair_id" TEXT NOT NULL,
    "time_remaining" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_moves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_sessions_owner_key_idx" ON "game_sessions"("owner_key");

-- CreateIndex
CREATE INDEX "game_sessions_stage_id_idx" ON "game_sessions"("stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_session_stage_config_snapshots_game_session_id_key" ON "game_session_stage_config_snapshots"("game_session_id");

-- CreateIndex
CREATE INDEX "game_session_level_stage_config_snapshot_id_idx" ON "game_session_level"("stage_config_snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_session_level_stage_config_snapshot_id_level_index_key" ON "game_session_level"("stage_config_snapshot_id", "level_index");

-- CreateIndex
CREATE INDEX "game_session_cards_game_session_level_id_idx" ON "game_session_cards"("game_session_level_id");

-- CreateIndex
CREATE INDEX "game_moves_game_session_id_idx" ON "game_moves"("game_session_id");

-- CreateIndex
CREATE INDEX "game_moves_game_session_level_id_idx" ON "game_moves"("game_session_level_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_moves_game_session_id_move_index_key" ON "game_moves"("game_session_id", "move_index");

-- AddForeignKey
ALTER TABLE "game_session_stage_config_snapshots" ADD CONSTRAINT "game_session_stage_config_snapshots_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_level" ADD CONSTRAINT "game_session_level_stage_config_snapshot_id_fkey" FOREIGN KEY ("stage_config_snapshot_id") REFERENCES "game_session_stage_config_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_cards" ADD CONSTRAINT "game_session_cards_game_session_level_id_fkey" FOREIGN KEY ("game_session_level_id") REFERENCES "game_session_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_game_session_level_id_fkey" FOREIGN KEY ("game_session_level_id") REFERENCES "game_session_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
