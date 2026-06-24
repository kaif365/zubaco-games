-- Migration: add game_content JSONB column to games table.
--
-- Stores game-level content (not stage-specific) keyed by language.
-- Structure: { "EN": { pages, play_now_button, learn_how_to_play }, "HI": { ... } }
-- Nullable — existing games have no game-level content yet.

ALTER TABLE "games" ADD COLUMN "game_content" JSONB;
