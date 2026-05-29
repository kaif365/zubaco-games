-- Set defaults and backfill existing rows before making columns NOT NULL.

ALTER TABLE "games" ALTER COLUMN "time_limit" SET DEFAULT 180;
ALTER TABLE "games" ALTER COLUMN "enable_demo" SET DEFAULT true;

UPDATE "games" SET "time_limit" = 180 WHERE "time_limit" IS NULL;
UPDATE "games" SET "enable_demo" = true WHERE "enable_demo" IS NULL;

ALTER TABLE "games" ALTER COLUMN "time_limit" SET NOT NULL;
ALTER TABLE "games" ALTER COLUMN "enable_demo" SET NOT NULL;
