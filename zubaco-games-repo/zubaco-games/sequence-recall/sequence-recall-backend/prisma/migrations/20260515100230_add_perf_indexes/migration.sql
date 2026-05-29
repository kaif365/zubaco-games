-- CreateIndex
CREATE INDEX "game_cheat_flags_user_id_created_at_idx" ON "game_cheat_flags"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "game_input_game_session_id_is_correct_idx" ON "game_input"("game_session_id", "is_correct");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_status_idx" ON "game_sessions"("user_id", "status");
