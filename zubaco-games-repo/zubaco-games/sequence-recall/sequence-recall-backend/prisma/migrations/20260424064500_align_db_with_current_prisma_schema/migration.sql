BEGIN;

ALTER TABLE "game_sessions"
    RENAME COLUMN "stage" TO "stage_id";

ALTER TABLE "game_sessions"
    ALTER COLUMN "stage_id" TYPE TEXT USING "stage_id"::text;

DROP INDEX IF EXISTS "game_sessions_user_id_stage_idx";
CREATE INDEX "game_sessions_user_id_stage_id_idx" ON "game_sessions"("user_id", "stage_id");

ALTER TABLE "game_levels"
    RENAME COLUMN "stage_number" TO "stage_id";

ALTER TABLE "game_levels"
    ALTER COLUMN "stage_id" TYPE TEXT USING "stage_id"::text;

DROP INDEX IF EXISTS "game_levels_stage_number_level_number_key";
CREATE UNIQUE INDEX "game_levels_stage_id_level_number_key" ON "game_levels"("stage_id", "level_number");

DROP INDEX IF EXISTS "game_configurations_stage_number_is_active_idx";
DROP INDEX IF EXISTS "game_configurations_stage_number_game_type_key";

ALTER TABLE "game_configurations"
    RENAME COLUMN "stage_number" TO "stage_id";

ALTER TABLE "game_configurations"
    ALTER COLUMN "stage_id" TYPE TEXT USING "stage_id"::text;

ALTER TABLE "game_configurations"
    RENAME COLUMN "initial_sequence_length" TO "min_sequence";

ALTER TABLE "game_configurations"
    RENAME COLUMN "max_rounds" TO "max_sequence";

ALTER TABLE "game_configurations"
    RENAME COLUMN "score_per_round" TO "score_per_click";

ALTER TABLE "game_configurations"
    ADD COLUMN "demo_min_sequence" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "demo_max_sequence" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "flash_delay" INTEGER NOT NULL DEFAULT 500;

UPDATE "game_configurations"
SET
    "max_sequence" = "min_sequence" + "max_sequence" - 1,
    "demo_min_sequence" = CASE WHEN "demo_rounds" > 0 THEN "min_sequence" ELSE 0 END,
    "demo_max_sequence" = CASE WHEN "demo_rounds" > 0 THEN "min_sequence" + "demo_rounds" - 1 ELSE 0 END;

ALTER TABLE "game_configurations"
    DROP COLUMN "game_type",
    DROP COLUMN "is_active",
    DROP COLUMN "demo_rounds";

CREATE UNIQUE INDEX "game_configurations_stage_id_key" ON "game_configurations"("stage_id");

ALTER TABLE "game_session_snapshots"
    RENAME COLUMN "initial_sequence_length" TO "min_sequence";

ALTER TABLE "game_session_snapshots"
    RENAME COLUMN "max_rounds" TO "max_sequence";

ALTER TABLE "game_session_snapshots"
    RENAME COLUMN "score_per_round" TO "score_per_click";

ALTER TABLE "game_session_snapshots"
    ADD COLUMN "demo_min_sequence" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "demo_max_sequence" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "flash_delay" INTEGER NOT NULL DEFAULT 500;

UPDATE "game_session_snapshots"
SET
    "max_sequence" = "min_sequence" + "max_sequence" - 1,
    "demo_min_sequence" = CASE WHEN "demo_rounds" > 0 THEN "min_sequence" ELSE 0 END,
    "demo_max_sequence" = CASE WHEN "demo_rounds" > 0 THEN "min_sequence" + "demo_rounds" - 1 ELSE 0 END;

ALTER TABLE "game_session_snapshots"
    DROP COLUMN "demo_rounds";

COMMIT;
