CREATE TABLE "board_shuffles" (
    "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "board_id"   TEXT        NOT NULL,
    "pieces"     INTEGER[]   NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "board_shuffles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "board_shuffles_board_id_deleted_at_idx" ON "board_shuffles"("board_id", "deleted_at");

ALTER TABLE "board_shuffles"
    ADD CONSTRAINT "board_shuffles_board_id_fkey"
    FOREIGN KEY ("board_id") REFERENCES "boards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
