-- Rename stage_count to stage_number and add a required stage_name.
ALTER TABLE "stages" RENAME COLUMN "stage_count" TO "stage_number";
ALTER TABLE "stages" ADD COLUMN "stage_name" TEXT;
UPDATE "stages" SET "stage_name" = 'Stage ' || "stage_number";
ALTER TABLE "stages" ALTER COLUMN "stage_name" SET NOT NULL;
ALTER INDEX "stages_stage_count_key" RENAME TO "stages_stage_number_key";
