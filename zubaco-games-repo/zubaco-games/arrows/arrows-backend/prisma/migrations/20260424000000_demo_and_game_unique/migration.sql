-- Add enableDemo to stage_configs
ALTER TABLE "stage_configs" ADD COLUMN "enable_demo" BOOLEAN NOT NULL DEFAULT false;

-- Unique index on stage_configs(stage_id) — was missing from schema
CREATE UNIQUE INDEX IF NOT EXISTS "stage_configs_stage_id_key" ON "stage_configs"("stage_id") WHERE "deleted_at" IS NULL;

-- Unique constraint on game_sessions(user_id, stage_id) — no replays
CREATE UNIQUE INDEX "game_sessions_user_id_stage_id_key" ON "game_sessions"("user_id", "stage_id");

-- stage_demo_level_configs
CREATE TABLE "stage_demo_level_configs" (
    "id"              TEXT NOT NULL,
    "stage_config_id" TEXT NOT NULL,
    "level_id"        TEXT NOT NULL,
    "board_count"     INTEGER NOT NULL,
    "order"           INTEGER NOT NULL,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    "deleted_at"      TIMESTAMP(3),

    CONSTRAINT "stage_demo_level_configs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stage_demo_level_configs_level_id_idx" ON "stage_demo_level_configs"("level_id");

ALTER TABLE "stage_demo_level_configs"
    ADD CONSTRAINT "stage_demo_level_configs_stage_config_id_fkey"
    FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stage_demo_level_configs"
    ADD CONSTRAINT "stage_demo_level_configs_level_id_fkey"
    FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- user_stage_demo_boards
CREATE TABLE "user_stage_demo_boards" (
    "id"          TEXT NOT NULL,
    "user_id"     TEXT NOT NULL,
    "stage_id"    TEXT NOT NULL,
    "level_id"    TEXT NOT NULL,
    "board_id"    TEXT NOT NULL,
    "grid_x"      INTEGER NOT NULL,
    "grid_y"      INTEGER NOT NULL,
    "sort_order"  INTEGER NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stage_demo_boards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_stage_demo_boards_user_id_stage_id_idx" ON "user_stage_demo_boards"("user_id", "stage_id");
CREATE INDEX "user_stage_demo_boards_user_id_stage_id_level_id_idx" ON "user_stage_demo_boards"("user_id", "stage_id", "level_id");

ALTER TABLE "user_stage_demo_boards"
    ADD CONSTRAINT "user_stage_demo_boards_board_id_fkey"
    FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- user_stage_demo_arrows
CREATE TABLE "user_stage_demo_arrows" (
    "id"            TEXT NOT NULL,
    "demo_board_id" TEXT NOT NULL,
    "arrow_id"      TEXT NOT NULL,
    "color"         INTEGER NOT NULL,
    "head_direction" INTEGER NOT NULL,
    "waypoints"     JSONB NOT NULL,
    "sort_order"    INTEGER NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stage_demo_arrows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_stage_demo_arrows_demo_board_id_idx" ON "user_stage_demo_arrows"("demo_board_id");

ALTER TABLE "user_stage_demo_arrows"
    ADD CONSTRAINT "user_stage_demo_arrows_demo_board_id_fkey"
    FOREIGN KEY ("demo_board_id") REFERENCES "user_stage_demo_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
