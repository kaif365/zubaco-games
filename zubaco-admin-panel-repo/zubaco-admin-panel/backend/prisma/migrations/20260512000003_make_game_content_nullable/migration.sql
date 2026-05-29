-- Make content column nullable in game_contents to support games with no content yet
ALTER TABLE "game_contents" ALTER COLUMN "content" DROP NOT NULL;
