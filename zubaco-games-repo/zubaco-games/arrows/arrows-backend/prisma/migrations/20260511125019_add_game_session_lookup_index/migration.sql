-- CreateIndex
CREATE INDEX "game_sessions_user_id_stage_id_status_deleted_at_idx" ON "game_sessions"("user_id", "stage_id", "status", "deleted_at");
