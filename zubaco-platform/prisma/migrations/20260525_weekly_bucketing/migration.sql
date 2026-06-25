-- Weekly Bucketing
-- Groups season registrations into weekly buckets ("Cohorts"). Pre-bucketing
-- stages eliminate within each weekly bucket; post-bucketing stages merge all
-- surviving buckets into one unified pool.

-- Season-level bucketing configuration
ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "registration_weeks" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "bucketing_stage" INTEGER NOT NULL DEFAULT 3;

-- Track the week each user registered in
ALTER TABLE "season_entries" ADD COLUMN IF NOT EXISTS "registration_week" INTEGER;

-- Map each bucket to a registration week (one bucket per week per season)
ALTER TABLE "cohorts" ADD COLUMN IF NOT EXISTS "registration_week" INTEGER;

-- Enforce a single bucket per (season, week)
CREATE UNIQUE INDEX IF NOT EXISTS "cohorts_season_id_registration_week_key"
    ON "cohorts" ("season_id", "registration_week");
