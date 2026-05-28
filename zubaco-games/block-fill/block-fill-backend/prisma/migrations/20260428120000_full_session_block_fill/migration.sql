ALTER TABLE "boards"
ADD COLUMN "pairs" JSONB NOT NULL DEFAULT '[]';

UPDATE "boards" b
SET "pairs" = COALESCE((
    SELECT jsonb_agg(
        jsonb_build_object(
            'color', dp."color",
            'start', jsonb_build_object('x', dp."start_x", 'y', dp."start_y"),
            'end', jsonb_build_object('x', dp."end_x", 'y', dp."end_y")
        )
        ORDER BY dp."color"
    )
    FROM "dot_pairs" dp
    WHERE dp."board_id" = b."id" AND dp."deleted_at" IS NULL
), '[]'::jsonb);

ALTER TABLE "game_sessions"
ADD COLUMN "current_round_number" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "game_session_stage_configs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "stage_config_id" TEXT NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_session_stage_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "game_session_stage_configs_session_id_key"
ON "game_session_stage_configs"("session_id");

CREATE INDEX "game_session_stage_configs_stage_config_id_idx"
ON "game_session_stage_configs"("stage_config_id");

ALTER TABLE "game_session_stage_configs"
ADD CONSTRAINT "game_session_stage_configs_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "game_session_stage_configs"
ADD CONSTRAINT "game_session_stage_configs_stage_config_id_fkey"
FOREIGN KEY ("stage_config_id") REFERENCES "stage_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "game_session_boards_session_id_key";

ALTER TABLE "game_session_boards"
ADD COLUMN "round_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "score" INTEGER;

CREATE INDEX "game_session_boards_session_id_round_number_idx"
ON "game_session_boards"("session_id", "round_number");

CREATE INDEX "game_session_boards_session_id_completed_deleted_at_idx"
ON "game_session_boards"("session_id", "completed", "deleted_at");

ALTER TABLE "game_session_paths"
ADD COLUMN "session_board_id" TEXT,
ALTER COLUMN "path" SET DEFAULT '[]',
ALTER COLUMN "path" SET NOT NULL;

UPDATE "game_session_paths"
SET "path" = '[]'::jsonb
WHERE "path" IS NULL;

UPDATE "game_session_paths" gsp
SET "session_board_id" = gsb."id"
FROM "game_session_boards" gsb
WHERE gsb."session_id" = gsp."session_id";

ALTER TABLE "game_session_paths"
ALTER COLUMN "session_board_id" SET NOT NULL;

ALTER TABLE "game_session_paths"
ADD CONSTRAINT "game_session_paths_session_board_id_fkey"
FOREIGN KEY ("session_board_id") REFERENCES "game_session_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "game_session_paths_session_board_id_deleted_at_idx"
ON "game_session_paths"("session_board_id", "deleted_at");

CREATE UNIQUE INDEX "game_session_paths_session_board_id_color_key"
ON "game_session_paths"("session_board_id", "color");

ALTER TABLE "game_sessions"
DROP CONSTRAINT IF EXISTS "game_sessions_board_id_fkey";

DROP INDEX IF EXISTS "game_sessions_board_id_idx";

ALTER TABLE "game_sessions"
DROP COLUMN IF EXISTS "board_id";

ALTER TABLE "game_session_paths"
DROP COLUMN IF EXISTS "pair_id",
DROP COLUMN IF EXISTS "start_x",
DROP COLUMN IF EXISTS "start_y",
DROP COLUMN IF EXISTS "end_x",
DROP COLUMN IF EXISTS "end_y";

DROP TABLE IF EXISTS "dot_pairs";
