BEGIN;

ALTER TABLE "game_configurations"
    ADD COLUMN "enable_demo" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "game_session_snapshots"
    ADD COLUMN "enable_demo" BOOLEAN NOT NULL DEFAULT true;

COMMIT;
