-- Drop legacy camelCase tables left over from the initial schema before @@map() renames.
-- "Admin", "Game", and "Stage" were superseded by "admins", "games", and "stages".

DROP TABLE IF EXISTS "Stage";
DROP TABLE IF EXISTS "Game";
DROP TABLE IF EXISTS "Admin";
