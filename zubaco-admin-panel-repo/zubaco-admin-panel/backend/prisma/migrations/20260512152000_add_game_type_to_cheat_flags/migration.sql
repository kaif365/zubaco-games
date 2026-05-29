ALTER TABLE "cheat_flags"
ADD COLUMN "game_type" INTEGER;

UPDATE "cheat_flags" cf
SET "game_type" = CASE g."game_type"
    WHEN 'ARROWS' THEN 1
    WHEN 'SEQUENCE_RECALL' THEN 2
    WHEN 'INFINITY_LOOP' THEN 3
    WHEN 'BLOCK_FILL' THEN 4
    WHEN 'SLIDING_PUZZLE' THEN 5
    WHEN 'MEMORY_CARD_MATCHING' THEN 6
    ELSE NULL
END
FROM "games" g
WHERE g."id" = cf."game_id";

ALTER TABLE "cheat_flags"
ALTER COLUMN "game_type" SET NOT NULL;

CREATE INDEX "cheat_flags_game_type_idx" ON "cheat_flags"("game_type");
