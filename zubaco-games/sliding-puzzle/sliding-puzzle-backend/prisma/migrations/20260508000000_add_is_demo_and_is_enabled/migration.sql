-- Add isDemo to levels
ALTER TABLE "levels" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- Add isEnabled to stage_configs
ALTER TABLE "stage_configs" ADD COLUMN "is_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Drop the old unique constraint on stage_id
ALTER TABLE "stage_configs" DROP CONSTRAINT IF EXISTS "stage_configs_stage_id_key";

-- Drop old index if present
DROP INDEX IF EXISTS "stage_configs_stage_id_idx";

-- Partial unique index: at most one active (non-deleted) config per stageId
CREATE UNIQUE INDEX IF NOT EXISTS "stage_configs_stage_id_active_unique"
    ON "stage_configs" ("stage_id")
    WHERE "deleted_at" IS NULL;

-- Regular index for stageId lookups including soft-deleted rows
CREATE INDEX IF NOT EXISTS "stage_configs_stage_id_idx" ON "stage_configs" ("stage_id");
