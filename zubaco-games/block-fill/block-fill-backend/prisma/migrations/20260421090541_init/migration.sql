-- CreateTable
CREATE TABLE "levels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
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
CREATE TABLE "arrows" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "head_direction" INTEGER NOT NULL,
    "waypoints" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "arrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_config" (
    "id" TEXT NOT NULL,
    "active_level_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "game_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "score" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "levels_deleted_at_idx" ON "levels"("deleted_at");

-- CreateIndex
CREATE INDEX "boards_level_id_deleted_at_idx" ON "boards"("level_id", "deleted_at");

-- CreateIndex
CREATE INDEX "arrows_board_id_deleted_at_idx" ON "arrows"("board_id", "deleted_at");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_idx" ON "game_sessions"("user_id");

-- CreateIndex
CREATE INDEX "game_sessions_status_idx" ON "game_sessions"("status");

-- CreateIndex
CREATE INDEX "game_sessions_board_id_idx" ON "game_sessions"("board_id");

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrows" ADD CONSTRAINT "arrows_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
