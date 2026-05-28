ALTER TABLE "game_sessions"
ADD COLUMN "stage_id" TEXT;

UPDATE "game_sessions" AS session
SET "stage_id" = stage_config."stage_id"
FROM "game_session_stage_configs" AS session_stage_config
JOIN "stage_configs" AS stage_config
  ON stage_config."id" = session_stage_config."stage_config_id"
WHERE session_stage_config."session_id" = session."id";

CREATE UNIQUE INDEX "game_sessions_user_id_stage_id_key"
ON "game_sessions"("user_id", "stage_id");

CREATE INDEX "game_sessions_user_id_stage_id_status_deleted_at_idx"
ON "game_sessions"("user_id", "stage_id", "status", "deleted_at");
