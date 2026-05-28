DO $$
DECLARE
    default_difficulty_id TEXT := '00000000-0000-0000-0000-000000000001';
    easy_difficulty_id TEXT;
BEGIN
    SELECT "id"
    INTO easy_difficulty_id
    FROM "difficulties"
    WHERE lower("name") = 'easy'
      AND "id" <> default_difficulty_id
    ORDER BY "deleted_at" NULLS FIRST, "created_at" ASC
    LIMIT 1;

    IF easy_difficulty_id IS NULL THEN
        UPDATE "difficulties"
        SET
            "name" = 'Easy',
            "deleted_at" = NULL,
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = default_difficulty_id;
    ELSE
        UPDATE "levels"
        SET "difficulty_id" = easy_difficulty_id
        WHERE "difficulty_id" = default_difficulty_id;

        UPDATE "stage_config_levels"
        SET "difficulty_id" = easy_difficulty_id
        WHERE "difficulty_id" = default_difficulty_id;

        DELETE FROM "difficulties"
        WHERE "id" = default_difficulty_id;
    END IF;
END $$;
