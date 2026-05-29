-- Arrow: add updated_at
ALTER TABLE "arrows" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- GameConfig: add created_at and deleted_at
ALTER TABLE "game_config" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "game_config" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- GameSessionBoard: add updated_at and deleted_at
ALTER TABLE "game_session_boards" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "game_session_boards" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- GameSessionArrow: add updated_at and deleted_at
ALTER TABLE "game_session_arrows" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "game_session_arrows" ADD COLUMN "deleted_at" TIMESTAMP(3);
