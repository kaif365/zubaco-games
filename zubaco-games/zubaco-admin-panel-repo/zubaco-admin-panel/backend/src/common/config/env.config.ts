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
        url: getEnvVar('DATABASE_URL'),
    },
    server: {
        port: parseInt(getEnvVar('PORT', '3000'), 10),
    },
    security: {
        jwtSecret: getEnvVar('JWT_SECRET'),
    },
    redis: {
        host: getEnvVar('REDIS_HOST', 'localhost'),
        port: parseInt(getEnvVar('REDIS_PORT', '6379'), 10),
        username: process.env['REDIS_USERNAME'] || undefined,
        password: process.env['REDIS_PASSWORD'] || undefined,
        db: parseInt(getEnvVar('REDIS_DB', '0'), 10),
        adminProjectKey: getEnvVar('REDIS_ADMIN_PROJECT_KEY'),
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
        region: getEnvVar('AWS_REGION'),
        accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID'),
        secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY'),
        sqs: {
            cheatFlagQueueUrl: getEnvVar('AWS_SQS_CHEAT_FLAG_QUEUE_URL'),
            gameQueueUrls: {
                ARROWS: getEnvVar('AWS_SQS_ARROWS_QUEUE_URL'),
                SEQUENCE_RECALL: getEnvVar('AWS_SQS_SEQUENCE_RECALL_QUEUE_URL'),
                BLOCK_FILL: getEnvVar('AWS_SQS_BLOCK_FILL_QUEUE_URL'),
                INFINITY_LOOP: getEnvVar('AWS_SQS_INFINITY_LOOP_QUEUE_URL'),
                MEMORY_CARD_MATCHING: getEnvVar('AWS_SQS_MEMORY_CARD_MATCHING_QUEUE_URL'),
                SLIDING_PUZZLE: getEnvVar('AWS_SQS_SLIDING_PUZZLE_QUEUE_URL'),
                SUDOKU: process.env['AWS_SQS_SUDOKU_QUEUE_URL'] || '',
            },
        },
    },
};
