-- Partial unique index: level names are unique (case-insensitive) among non-deleted rows
CREATE UNIQUE INDEX levels_name_active_unique
    ON levels (lower(name))
    WHERE deleted_at IS NULL;

-- Partial unique index: board names are unique per level (case-insensitive) among non-deleted rows
CREATE UNIQUE INDEX boards_name_level_active_unique
    ON boards (level_id, lower(name))
    WHERE deleted_at IS NULL;
