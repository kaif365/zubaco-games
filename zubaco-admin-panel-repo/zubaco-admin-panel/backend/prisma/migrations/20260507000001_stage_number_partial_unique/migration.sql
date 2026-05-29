-- Replace the global unique constraint on stage_number with a partial one
-- so that soft-deleted stages do not block reuse of the same stage_number.

DROP INDEX IF EXISTS "stages_stage_number_key";

CREATE UNIQUE INDEX "stages_stage_number_active_key"
    ON "stages"("stage_number")
    WHERE "deleted_at" IS NULL;
