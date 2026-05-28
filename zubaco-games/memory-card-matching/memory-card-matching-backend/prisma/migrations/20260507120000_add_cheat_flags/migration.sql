-- CreateTable
CREATE TABLE "cheat_flags" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "game_session_level_id" TEXT NOT NULL,
    "level_index" INTEGER NOT NULL,
    "flag_type" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cheat_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cheat_flags_game_session_id_idx" ON "cheat_flags"("game_session_id");

-- CreateIndex
CREATE INDEX "cheat_flags_game_session_level_id_idx" ON "cheat_flags"("game_session_level_id");

-- CreateIndex
CREATE UNIQUE INDEX "cheat_flags_game_session_id_game_session_level_id_flag_type_key" ON "cheat_flags"("game_session_id", "game_session_level_id", "flag_type");

-- AddForeignKey
ALTER TABLE "cheat_flags" ADD CONSTRAINT "cheat_flags_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheat_flags" ADD CONSTRAINT "cheat_flags_game_session_level_id_fkey" FOREIGN KEY ("game_session_level_id") REFERENCES "game_session_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
