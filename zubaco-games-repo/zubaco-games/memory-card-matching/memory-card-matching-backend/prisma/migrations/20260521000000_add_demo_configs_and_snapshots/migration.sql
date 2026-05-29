CREATE TABLE "stage_demo_config_levels" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "stage_config_id" TEXT NOT NULL,
    "difficulty_id" TEXT NOT NULL,
    "board_count" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stage_demo_config_levels_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "stage_demo_config_levels"
ADD CONSTRAINT "stage_demo_config_levels_stage_config_id_fkey"
FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stage_demo_config_levels"
ADD CONSTRAINT "stage_demo_config_levels_difficulty_id_fkey"
FOREIGN KEY ("difficulty_id") REFERENCES "difficulties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "stage_demo_config_levels_stage_config_id_deleted_at_idx"
ON "stage_demo_config_levels"("stage_config_id", "deleted_at");

CREATE INDEX "stage_demo_config_levels_difficulty_id_deleted_at_idx"
ON "stage_demo_config_levels"("difficulty_id", "deleted_at");

CREATE TABLE "user_stage_demo_levels" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "owner_key" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "difficulty_id" TEXT NOT NULL,
    "difficulty_name" TEXT NOT NULL,
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

    CONSTRAINT "user_stage_demo_levels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_stage_demo_levels_owner_key_stage_id_idx"
ON "user_stage_demo_levels"("owner_key", "stage_id");

CREATE INDEX "user_stage_demo_levels_owner_key_stage_id_difficulty_id_idx"
ON "user_stage_demo_levels"("owner_key", "stage_id", "difficulty_id");

CREATE UNIQUE INDEX "user_stage_demo_levels_owner_key_stage_id_level_index_key"
ON "user_stage_demo_levels"("owner_key", "stage_id", "level_index");

CREATE TABLE "user_stage_demo_cards" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_stage_demo_level_id" TEXT NOT NULL,
    "level_index" INTEGER NOT NULL,
    "card_id" TEXT NOT NULL,
    "pair_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stage_demo_cards_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_stage_demo_cards"
ADD CONSTRAINT "user_stage_demo_cards_user_stage_demo_level_id_fkey"
FOREIGN KEY ("user_stage_demo_level_id") REFERENCES "user_stage_demo_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "user_stage_demo_cards_user_stage_demo_level_id_idx"
ON "user_stage_demo_cards"("user_stage_demo_level_id");
