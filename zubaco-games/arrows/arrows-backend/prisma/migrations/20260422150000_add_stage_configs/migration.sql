-- StageConfig table
CREATE TABLE "stage_configs" (
    "id"          TEXT NOT NULL,
    "stage_id"    TEXT NOT NULL,
    "time_limit"  INTEGER NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    "deleted_at"  TIMESTAMP(3),
    CONSTRAINT "stage_configs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stage_configs_deleted_at_idx" ON "stage_configs"("deleted_at");

-- Partial unique: one active config per stageId
CREATE UNIQUE INDEX "stage_configs_stage_id_active_unique" ON "stage_configs" ("stage_id") WHERE "deleted_at" IS NULL;

-- StageLevelConfig table
CREATE TABLE "stage_level_configs" (
    "id"               TEXT NOT NULL,
    "stage_config_id"  TEXT NOT NULL,
    "level_id"         TEXT NOT NULL,
    "board_count"      INTEGER NOT NULL,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,
    "deleted_at"       TIMESTAMP(3),
    CONSTRAINT "stage_level_configs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stage_level_configs_level_id_idx" ON "stage_level_configs"("level_id");

CREATE UNIQUE INDEX "stage_level_configs_stage_config_id_level_id_key" ON "stage_level_configs"("stage_config_id", "level_id") WHERE "deleted_at" IS NULL;

ALTER TABLE "stage_level_configs" ADD CONSTRAINT "stage_level_configs_stage_config_id_fkey"
    FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stage_level_configs" ADD CONSTRAINT "stage_level_configs_level_id_fkey"
    FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
