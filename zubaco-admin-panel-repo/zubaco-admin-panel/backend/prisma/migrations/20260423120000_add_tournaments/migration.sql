CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tournament_stages" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tournament_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournaments_name_key" ON "tournaments"("name");
CREATE INDEX "tournament_stages_tournament_id_idx" ON "tournament_stages"("tournament_id");
CREATE INDEX "tournament_stages_stage_id_idx" ON "tournament_stages"("stage_id");
CREATE UNIQUE INDEX "tournament_stages_tournament_id_stage_id_key" ON "tournament_stages"("tournament_id", "stage_id");

ALTER TABLE "tournament_stages"
ADD CONSTRAINT "tournament_stages_tournament_id_fkey"
FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournament_stages"
ADD CONSTRAINT "tournament_stages_stage_id_fkey"
FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
