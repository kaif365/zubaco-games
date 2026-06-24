-- Rename admin table and columns to snake_case.
ALTER TABLE "Admin" RENAME TO "admins";
ALTER TABLE "admins" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "admins" ADD COLUMN "updated_at" TIMESTAMP(3);
UPDATE "admins" SET "updated_at" = "created_at";
ALTER TABLE "admins" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "admins" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "admins" RENAME CONSTRAINT "Admin_pkey" TO "admins_pkey";
ALTER INDEX "Admin_email_key" RENAME TO "admins_email_key";

-- Rename game table and columns to snake_case.
ALTER TABLE "Game" RENAME TO "games";
ALTER TABLE "games" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "games" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "games" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "games" RENAME CONSTRAINT "Game_pkey" TO "games_pkey";
ALTER INDEX "Game_name_key" RENAME TO "games_name_key";

-- Move old per-game Stage rows into shared stages plus a game_stages relation table.
ALTER TABLE "Stage" RENAME TO "_old_stages";

CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "stage_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

INSERT INTO "stages" ("id", "stage_count", "created_at", "updated_at")
SELECT DISTINCT ON ("stageCount")
    "id",
    "stageCount",
    "createdAt",
    "updatedAt"
FROM "_old_stages"
ORDER BY "stageCount", "createdAt", "id";

CREATE TABLE "game_stages" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "game_stages_pkey" PRIMARY KEY ("id")
);

INSERT INTO "game_stages" ("id", "game_id", "stage_id", "created_at", "updated_at")
SELECT
    old_stage."id",
    old_stage."gameId",
    stage."id",
    old_stage."createdAt",
    old_stage."updatedAt"
FROM "_old_stages" old_stage
INNER JOIN "stages" stage ON stage."stage_count" = old_stage."stageCount";

DROP TABLE "_old_stages";

CREATE UNIQUE INDEX "stages_stage_count_key" ON "stages"("stage_count");
CREATE INDEX "game_stages_game_id_idx" ON "game_stages"("game_id");
CREATE INDEX "game_stages_stage_id_idx" ON "game_stages"("stage_id");
CREATE UNIQUE INDEX "game_stages_game_id_stage_id_key" ON "game_stages"("game_id", "stage_id");

ALTER TABLE "game_stages" ADD CONSTRAINT "game_stages_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_stages" ADD CONSTRAINT "game_stages_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
