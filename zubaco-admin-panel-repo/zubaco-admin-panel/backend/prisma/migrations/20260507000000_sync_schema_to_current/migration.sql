-- =====================================================================
-- Sync schema to current state
-- Covers all changes since the last migration (20260423120000_add_tournaments).
-- Does NOT create game_level_configs (removed from domain model).
-- =====================================================================

-- -----------------------------------------------------------------
-- 1. Create enum types
-- -----------------------------------------------------------------
CREATE TYPE "status" AS ENUM ('ACTIVE', 'INACTIVE', 'DEACTIVATE');
CREATE TYPE "game_type" AS ENUM ('ARROWS', 'SEQUENCE_RECALL', 'BLOCK_FILL', 'INFINITY_LOOP');
CREATE TYPE "language" AS ENUM ('EN', 'HI');

-- -----------------------------------------------------------------
-- 2. Extend games table
--    game_type is NOT NULL + UNIQUE; this assumes no existing rows.
--    If rows exist, set their game_type values before running this.
-- -----------------------------------------------------------------
ALTER TABLE "games"
    ADD COLUMN "game_type"               "game_type",
    ADD COLUMN "status"                  "status"           NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN "time_limit"              INTEGER,
    ADD COLUMN "enable_demo"             BOOLEAN,
    ADD COLUMN "cell_count"              INTEGER,
    ADD COLUMN "min_sequence"            INTEGER,
    ADD COLUMN "max_sequence"            INTEGER,
    ADD COLUMN "demo_min_sequence"       INTEGER,
    ADD COLUMN "demo_max_sequence"       INTEGER,
    ADD COLUMN "flash_delay"             INTEGER,
    ADD COLUMN "bonus_time_ratio"        DOUBLE PRECISION,
    ADD COLUMN "score_per_click"         INTEGER,
    ADD COLUMN "wrong_move_handling"     INTEGER,
    ADD COLUMN "total_actual_rounds"     INTEGER,
    ADD COLUMN "total_demo_rounds"       INTEGER,
    ADD COLUMN "active_level_id"         TEXT,
    ADD COLUMN "il_title"                TEXT,
    ADD COLUMN "il_description"          TEXT,
    ADD COLUMN "il_background_sound_url" TEXT,
    ADD COLUMN "il_tap_sound_url"        TEXT,
    ADD COLUMN "has_pool"                BOOLEAN            NOT NULL DEFAULT false,
    ADD COLUMN "about_visible"           BOOLEAN            NOT NULL DEFAULT false,
    ADD COLUMN "scoring_rules_visible"   BOOLEAN            NOT NULL DEFAULT false,
    ADD COLUMN "anti_cheat_rules_visible" BOOLEAN           NOT NULL DEFAULT false,
    ADD COLUMN "meta_data_visible"       BOOLEAN            NOT NULL DEFAULT false;

-- Enforce NOT NULL + UNIQUE on game_type now that the column exists.
-- Rows with NULL game_type (pre-existing data) must be updated beforehand.
ALTER TABLE "games" ALTER COLUMN "game_type" SET NOT NULL;

CREATE UNIQUE INDEX "games_game_type_key" ON "games"("game_type");
CREATE INDEX "games_game_type_idx" ON "games"("game_type");

-- -----------------------------------------------------------------
-- 3. Create game_contents table
-- -----------------------------------------------------------------
CREATE TABLE "game_contents" (
    "id"               TEXT         NOT NULL,
    "game_id"          TEXT         NOT NULL,
    "language"         "language"   NOT NULL,
    "description"      TEXT,
    "how_to_play"      TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "scoring_rules"    TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "anti_cheat_rules" TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,
    "deleted_at"       TIMESTAMP(3),

    CONSTRAINT "game_contents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "game_contents_game_id_language_key" ON "game_contents"("game_id", "language");
CREATE INDEX "game_contents_game_id_idx" ON "game_contents"("game_id");

ALTER TABLE "game_contents"
    ADD CONSTRAINT "game_contents_game_id_fkey"
    FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------
-- 4. Extend tournaments table
-- -----------------------------------------------------------------
ALTER TABLE "tournaments"
    ADD COLUMN "start_date" TIMESTAMP(3),
    ADD COLUMN "end_date"   TIMESTAMP(3),
    ADD COLUMN "status"     "status" NOT NULL DEFAULT 'ACTIVE';

-- -----------------------------------------------------------------
-- 5. Create cheat_flags table
-- -----------------------------------------------------------------
CREATE TABLE "cheat_flags" (
    "id"              TEXT         NOT NULL,
    "reference_id"    TEXT         NOT NULL,
    "user_id"         TEXT         NOT NULL,
    "flag_type"       INTEGER      NOT NULL,
    "game_id"         TEXT         NOT NULL,
    "game_created_at" TIMESTAMP(3) NOT NULL,
    "received_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cheat_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cheat_flags_reference_id_key" ON "cheat_flags"("reference_id");
CREATE INDEX "cheat_flags_user_id_idx"   ON "cheat_flags"("user_id");
CREATE INDEX "cheat_flags_flag_type_idx" ON "cheat_flags"("flag_type");
CREATE INDEX "cheat_flags_game_id_idx"   ON "cheat_flags"("game_id");

ALTER TABLE "cheat_flags"
    ADD CONSTRAINT "cheat_flags_game_id_fkey"
    FOREIGN KEY ("game_id") REFERENCES "games"("id") ON UPDATE CASCADE;
