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
    "name" TEXT NOT NULL,
    "grid_x" INTEGER NOT NULL,
    "grid_y" INTEGER NOT NULL,
    "full_image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_configs" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "enable_demo" BOOLEAN NOT NULL DEFAULT false,
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
    "display_time" INTEGER NOT NULL,
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
    "display_time" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stage_demo_level_configs_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "boards_level_id_deleted_at_idx" ON "boards"("level_id", "deleted_at");

-- CreateIndex
CREATE INDEX "stage_configs_deleted_at_idx" ON "stage_configs"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "stage_configs_stage_id_key" ON "stage_configs"("stage_id");

-- CreateIndex
CREATE INDEX "stage_level_configs_level_id_idx" ON "stage_level_configs"("level_id");

-- CreateIndex
CREATE INDEX "stage_demo_level_configs_level_id_idx" ON "stage_demo_level_configs"("level_id");

-- CreateIndex
CREATE UNIQUE INDEX "files_key_key" ON "files"("key");

-- CreateIndex
CREATE INDEX "files_admin_id_idx" ON "files"("admin_id");

-- CreateIndex
CREATE INDEX "files_deleted_at_idx" ON "files"("deleted_at");

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_level_configs" ADD CONSTRAINT "stage_level_configs_stage_config_id_fkey" FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_level_configs" ADD CONSTRAINT "stage_level_configs_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_demo_level_configs" ADD CONSTRAINT "stage_demo_level_configs_stage_config_id_fkey" FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_demo_level_configs" ADD CONSTRAINT "stage_demo_level_configs_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
