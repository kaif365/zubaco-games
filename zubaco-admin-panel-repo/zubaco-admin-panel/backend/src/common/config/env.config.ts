import * as path from 'path';

import * as dotenv from 'dotenv';

// Load .env.{NODE_ENV} first (e.g. .env.development, .env.production),
// then fall back to .env for values not overridden.
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface Config {
    database: {
        url: string;
    };
    server: {
        port: number;
    };
    security: {
        jwtSecret: string;
    };
    redis: {
        host: string;
        port: number;
        username: string | undefined;
        password: string | undefined;
        db: number;
        adminProjectKey: string;
    };
    swagger: {
        title: string;
        description: string;
        version: string;
    };
    language: {
        supported: string[];
        default: string;
    };
    aws: {
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
        s3: {
            assetsBucket: string;
            publicBaseUrl: string;
            uploadUrlTtlSeconds: number;
        };
        sqs: {
            cheatFlagQueueUrl: string;
            gameQueueUrls: Record<string, string>;
        };
    };
    
}

const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const config: Config = {
    database: {
        url: getEnvVar('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/zubaco_platform'),
    },
    server: {
        port: parseInt(getEnvVar('PORT', '3001'), 10),
    },
    security: {
        jwtSecret: getEnvVar('JWT_SECRET', 'zubaco-admin-jwt-secret-do-not-use-in-production-12345'),
    },
    redis: {
        host: getEnvVar('REDIS_HOST', 'localhost'),
        port: parseInt(getEnvVar('REDIS_PORT', '6379'), 10),
        username: process.env['REDIS_USERNAME'] || undefined,
        password: process.env['REDIS_PASSWORD'] || undefined,
        db: parseInt(getEnvVar('REDIS_DB', '0'), 10),
        adminProjectKey: getEnvVar('REDIS_ADMIN_PROJECT_KEY', 'zubaco:admin'),
    },
    swagger: {
        title: getEnvVar('PROJECT_NAME', 'ZUBACO Admin Service'),
        description: getEnvVar('PROJECT_DESCRIPTION', 'ZUBACO Admin Service API'),
        version: getEnvVar('PROJECT_VERSION', '1.0'),
    },
    language: {
        supported: getEnvVar('SUPPORTED_LANGUAGES', 'en')
            .split(',')
            .map((l) => l.trim()),
        default: getEnvVar('DEFAULT_LANGUAGE', 'en'),
    },
    aws: {
        region: getEnvVar('AWS_REGION', 'ap-south-1'),
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || '',
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || '',
        s3: {
            assetsBucket: getEnvVar('AWS_S3_ASSETS_BUCKET', 'zubaco-assets'),
            publicBaseUrl: process.env['AWS_S3_PUBLIC_BASE_URL'] || '',
            uploadUrlTtlSeconds: parseInt(process.env['AWS_S3_UPLOAD_URL_TTL'] || '900', 10),
        },
        sqs: {
            cheatFlagQueueUrl: process.env['AWS_SQS_CHEAT_FLAG_QUEUE_URL'] || '',
            gameQueueUrls: {
                ARROWS: process.env['AWS_SQS_ARROWS_QUEUE_URL'] || '',
                SEQUENCE_RECALL: process.env['AWS_SQS_SEQUENCE_RECALL_QUEUE_URL'] || '',
                BLOCK_FILL: process.env['AWS_SQS_BLOCK_FILL_QUEUE_URL'] || '',
                INFINITY_LOOP: process.env['AWS_SQS_INFINITY_LOOP_QUEUE_URL'] || '',
                MEMORY_CARD_MATCHING: process.env['AWS_SQS_MEMORY_CARD_MATCHING_QUEUE_URL'] || '',
                SLIDING_PUZZLE: process.env['AWS_SQS_SLIDING_PUZZLE_QUEUE_URL'] || '',
                SUDOKU: process.env['AWS_SQS_SUDOKU_QUEUE_URL'] || '',
                MAZE_NAVIGATION: process.env['AWS_SQS_MAZE_NAVIGATION_QUEUE_URL'] || '',
                SPOT_THE_DIFFERENCE: process.env['AWS_SQS_SPOT_THE_DIFFERENCE_QUEUE_URL'] || '',
                LOGIC_REFLECTOR: process.env['AWS_SQS_LOGIC_REFLECTOR_QUEUE_URL'] || '',
            },
        },
    },
};
