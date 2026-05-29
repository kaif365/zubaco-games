-- Add last_move_at to game_sessions
ALTER TABLE "game_sessions" ADD COLUMN "last_move_at" TIMESTAMP(3);

-- Add is_active to game_session_boards
ALTER TABLE "game_session_boards" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT false;
