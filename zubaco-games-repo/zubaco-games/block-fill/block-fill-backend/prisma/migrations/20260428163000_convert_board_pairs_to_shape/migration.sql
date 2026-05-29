UPDATE "boards"
SET "pairs" = jsonb_build_object(
    'name',
    COALESCE("name", 'Untitled Board'),
    'gridRow',
    "grid_y",
    'gridCol',
    "grid_x",
    'nodes',
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'colorCode',
                    CASE (pair ->> 'color')::int
                        WHEN 3381759 THEN 'blue'
                        WHEN 16737894 THEN 'red'
                        WHEN 6747750 THEN 'green'
                        WHEN 16763955 THEN 'amber'
                        WHEN 13395711 THEN 'purple'
                        WHEN 3394764 THEN 'cyan'
                        WHEN 16737996 THEN 'pink'
                        ELSE '#' || lpad(upper(to_hex((pair ->> 'color')::int)), 6, '0')
                    END,
                    'points',
                    jsonb_build_array(
                        jsonb_build_object(
                            'row',
                            ((pair -> 'start') ->> 'y')::int,
                            'col',
                            ((pair -> 'start') ->> 'x')::int
                        ),
                        jsonb_build_object(
                            'row',
                            ((pair -> 'end') ->> 'y')::int,
                            'col',
                            ((pair -> 'end') ->> 'x')::int
                        )
                    )
                )
            )
            FROM jsonb_array_elements("pairs") AS pair
        ),
        '[]'::jsonb
    )
)
WHERE jsonb_typeof("pairs") = 'array';
