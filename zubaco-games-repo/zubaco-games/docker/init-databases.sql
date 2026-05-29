-- Initialize individual databases for each game microservice
-- This script runs on first PostgreSQL container startup

CREATE DATABASE flash_spot;
CREATE DATABASE colour_sorting;
CREATE DATABASE object_placement;
CREATE DATABASE rapid_sort;
CREATE DATABASE true_false_blitz;
CREATE DATABASE word_unscramble;
CREATE DATABASE number_grid;
CREATE DATABASE live_route;
CREATE DATABASE memory_groups;
CREATE DATABASE reflex_endurance;
CREATE DATABASE pattern_survival;
CREATE DATABASE speed_type;
CREATE DATABASE sequence_recall;
CREATE DATABASE memory_card_matching;
CREATE DATABASE sliding_puzzle;
CREATE DATABASE block_fill;
CREATE DATABASE maze_navigation;
CREATE DATABASE infinity_loop;
CREATE DATABASE arrows;
CREATE DATABASE logic_reflector;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE flash_spot TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE colour_sorting TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE object_placement TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE rapid_sort TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE true_false_blitz TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE word_unscramble TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE number_grid TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE live_route TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE memory_groups TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE reflex_endurance TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE pattern_survival TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE speed_type TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE sequence_recall TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE memory_card_matching TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE sliding_puzzle TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE block_fill TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE maze_navigation TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE infinity_loop TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE arrows TO zubaco;
GRANT ALL PRIVILEGES ON DATABASE logic_reflector TO zubaco;
