-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "server_seed" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_levels" (
    "id" TEXT NOT NULL,
    "stage_number" INTEGER NOT NULL,
    "level_number" INTEGER NOT NULL,
    "config_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_input" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "tile_id" INTEGER NOT NULL,
    "client_time" TIMESTAMP(3) NOT NULL,
    "server_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_input_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_configurations" (
    "id" TEXT NOT NULL,
    "stage_number" INTEGER NOT NULL,
    "game_type" TEXT NOT NULL,
    "cell_count" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_cheat_flags" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "flag_type" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_cheat_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_sessions_user_id_stage_idx" ON "game_sessions"("user_id", "stage");

-- CreateIndex
CREATE INDEX "game_sessions_status_idx" ON "game_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "game_levels_stage_number_level_number_key" ON "game_levels"("stage_number", "level_number");

-- CreateIndex
CREATE INDEX "game_input_game_session_id_idx" ON "game_input"("game_session_id");

-- CreateIndex
CREATE INDEX "game_configurations_stage_number_is_active_idx" ON "game_configurations"("stage_number", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "game_configurations_stage_number_game_type_key" ON "game_configurations"("stage_number", "game_type");

-- CreateIndex
CREATE INDEX "game_cheat_flags_game_session_id_idx" ON "game_cheat_flags"("game_session_id");

-- AddForeignKey
ALTER TABLE "game_input" ADD CONSTRAINT "game_input_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_cheat_flags" ADD CONSTRAINT "game_cheat_flags_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
