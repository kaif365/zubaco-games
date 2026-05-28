CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "difficulties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "difficulties_pkey" PRIMARY KEY ("id")
);

INSERT INTO "difficulties" ("id", "name", "created_at", "updated_at")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "levels"
ADD COLUMN "difficulty_id" TEXT;

UPDATE "levels"
SET "difficulty_id" = '00000000-0000-0000-0000-000000000001'
WHERE "difficulty_id" IS NULL;

ALTER TABLE "levels"
ALTER COLUMN "difficulty_id" SET NOT NULL;

ALTER TABLE "levels"
ADD CONSTRAINT "levels_difficulty_id_fkey"
FOREIGN KEY ("difficulty_id") REFERENCES "difficulties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "difficulties_deleted_at_idx" ON "difficulties"("deleted_at");
CREATE INDEX "levels_difficulty_id_deleted_at_idx" ON "levels"("difficulty_id", "deleted_at");

CREATE TABLE "stage_config_levels" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "stage_config_id" TEXT NOT NULL,
    "difficulty_id" TEXT NOT NULL,
    "board_count" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stage_config_levels_pkey" PRIMARY KEY ("id")
);

INSERT INTO "stage_config_levels" (
    "stage_config_id",
    "difficulty_id",
    "board_count",
    "order",
    "created_at",
    "updated_at",
    "deleted_at"
)
SELECT
    "id",
    '00000000-0000-0000-0000-000000000001',
    "level_count",
    0,
    "created_at",
    "updated_at",
    "deleted_at"
FROM "stage_configs";

ALTER TABLE "stage_config_levels"
ADD CONSTRAINT "stage_config_levels_stage_config_id_fkey"
FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stage_config_levels"
ADD CONSTRAINT "stage_config_levels_difficulty_id_fkey"
FOREIGN KEY ("difficulty_id") REFERENCES "difficulties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "stage_config_levels_stage_config_id_deleted_at_idx"
ON "stage_config_levels"("stage_config_id", "deleted_at");

CREATE INDEX "stage_config_levels_difficulty_id_deleted_at_idx"
ON "stage_config_levels"("difficulty_id", "deleted_at");

ALTER TABLE "stage_configs"
DROP COLUMN "level_count";
