CREATE TABLE "user_stage_demo_boards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "source_board_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "level_name" TEXT,
    "name" TEXT,
    "grid_x" INTEGER NOT NULL,
    "grid_y" INTEGER NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "pairs_snapshot" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stage_demo_boards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_stage_demo_boards_user_id_stage_id_idx"
    ON "user_stage_demo_boards"("user_id", "stage_id");

CREATE INDEX "user_stage_demo_boards_level_id_idx"
    ON "user_stage_demo_boards"("level_id");

CREATE INDEX "user_stage_demo_boards_source_board_id_idx"
    ON "user_stage_demo_boards"("source_board_id");

CREATE UNIQUE INDEX "user_stage_demo_boards_user_id_stage_id_round_number_key"
    ON "user_stage_demo_boards"("user_id", "stage_id", "round_number");

ALTER TABLE "user_stage_demo_boards"
    ADD CONSTRAINT "user_stage_demo_boards_level_id_fkey"
    FOREIGN KEY ("level_id") REFERENCES "levels"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_stage_demo_boards"
    ADD CONSTRAINT "user_stage_demo_boards_source_board_id_fkey"
    FOREIGN KEY ("source_board_id") REFERENCES "boards"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
