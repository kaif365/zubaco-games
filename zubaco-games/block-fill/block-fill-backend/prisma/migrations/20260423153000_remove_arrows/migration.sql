DROP TABLE IF EXISTS "game_moves";
DROP TABLE IF EXISTS "game_session_arrows";
DROP TABLE IF EXISTS "arrows";

ALTER TABLE "boards"
ALTER COLUMN "game_type" SET DEFAULT 'BLOCK_FILL';

ALTER TABLE "game_session_boards"
ALTER COLUMN "game_type" SET DEFAULT 'BLOCK_FILL';
