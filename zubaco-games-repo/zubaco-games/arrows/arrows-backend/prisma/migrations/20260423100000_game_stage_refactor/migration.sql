-- ── stage_level_configs: add order ────────────────────────────────────────────
ALTER TABLE "stage_level_configs" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- ── boards: drop time_limit ────────────────────────────────────────────────────
ALTER TABLE "boards" DROP COLUMN "time_limit";

-- ── game_sessions: drop board_id, add stage_id + expiry_at ───────────────────────
ALTER TABLE "game_sessions" DROP CONSTRAINT IF EXISTS "game_sessions_board_id_fkey";
DROP INDEX IF EXISTS "game_sessions_board_id_idx";
ALTER TABLE "game_sessions" DROP COLUMN "board_id";
ALTER TABLE "game_sessions" ADD COLUMN "stage_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "game_sessions" ADD COLUMN "expiry_at" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- ── game_session_boards: drop @unique + timeLimit, add roundNumber + timestamps ─
DROP INDEX IF EXISTS "game_session_boards_session_id_key";
ALTER TABLE "game_session_boards" DROP COLUMN "time_limit";
ALTER TABLE "game_session_boards" ADD COLUMN "round_number" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "game_session_boards" ADD COLUMN "started_at" TIMESTAMP(3) NOT NULL DEFAULT NOW();
ALTER TABLE "game_session_boards" ADD COLUMN "ended_at" TIMESTAMP(3);
CREATE INDEX "game_session_boards_session_id_idx" ON "game_session_boards"("session_id");

-- ── game_session_arrows: add session_board_id ─────────────────────────────────
-- Temporarily nullable; set to a sentinel then make NOT NULL
ALTER TABLE "game_session_arrows" ADD COLUMN "session_board_id" TEXT;
-- Back-fill: link existing arrows to their session's board snapshot
UPDATE "game_session_arrows" sa
SET "session_board_id" = gsb.id
FROM "game_session_boards" gsb
WHERE gsb.session_id = sa.session_id;
ALTER TABLE "game_session_arrows" ALTER COLUMN "session_board_id" SET NOT NULL;
CREATE INDEX "game_session_arrows_session_board_id_idx" ON "game_session_arrows"("session_board_id");

-- ── new: game_session_stage_configs ───────────────────────────────────────────
CREATE TABLE "game_session_stage_configs" (
    "id"          TEXT NOT NULL,
    "session_id"  TEXT NOT NULL,
    "stage_id"    TEXT NOT NULL,
    "time_limit"  INTEGER NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_session_stage_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_session_stage_configs_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "game_session_stage_configs_session_id_key" ON "game_session_stage_configs"("session_id");

-- ── new: game_session_stage_level_configs ─────────────────────────────────────
CREATE TABLE "game_session_stage_level_configs" (
    "id"                       TEXT NOT NULL,
    "session_stage_config_id"  TEXT NOT NULL,
    "level_id"                 TEXT NOT NULL,
    "level_name"               TEXT NOT NULL,
    "board_count"              INTEGER NOT NULL,
    "order"                    INTEGER NOT NULL,
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_session_stage_level_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_session_stage_level_configs_session_stage_config_id_fkey"
        FOREIGN KEY ("session_stage_config_id") REFERENCES "game_session_stage_configs"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "game_session_stage_level_configs_session_stage_config_id_idx"
    ON "game_session_stage_level_configs"("session_stage_config_id");
