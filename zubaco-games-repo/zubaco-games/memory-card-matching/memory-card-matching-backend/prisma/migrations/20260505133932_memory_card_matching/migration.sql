-- CreateTable
CREATE TABLE "levels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grid_rows" INTEGER NOT NULL,
    "grid_columns" INTEGER NOT NULL,
    "card_content_type" TEXT NOT NULL,
    "preview_duration_seconds" INTEGER NOT NULL,
    "mismatch_display_duration_seconds" INTEGER NOT NULL,
    "content_config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_configs" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "level_count" INTEGER NOT NULL,
    "game_time_limit_seconds" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "levels_deleted_at_idx" ON "levels"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "stage_configs_stage_id_key" ON "stage_configs"("stage_id");

-- CreateIndex
CREATE INDEX "stage_configs_deleted_at_idx" ON "stage_configs"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "files_key_key" ON "files"("key");

-- CreateIndex
CREATE INDEX "files_admin_id_idx" ON "files"("admin_id");

-- CreateIndex
CREATE INDEX "files_deleted_at_idx" ON "files"("deleted_at");
