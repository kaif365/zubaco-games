ALTER TABLE "stage_configs"
ADD COLUMN "enable_numbers" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "game_session_stage_configs"
ADD COLUMN "enable_numbers" BOOLEAN NOT NULL DEFAULT true;
