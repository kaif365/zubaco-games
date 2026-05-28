CREATE TABLE "stage_demo_level_configs" (
    "id" TEXT NOT NULL,
    "stage_config_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "board_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stage_demo_level_configs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stage_demo_level_configs_level_id_idx" ON "stage_demo_level_configs"("level_id");

ALTER TABLE "stage_demo_level_configs"
ADD CONSTRAINT "stage_demo_level_configs_stage_config_id_fkey"
FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stage_demo_level_configs"
ADD CONSTRAINT "stage_demo_level_configs_level_id_fkey"
FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
