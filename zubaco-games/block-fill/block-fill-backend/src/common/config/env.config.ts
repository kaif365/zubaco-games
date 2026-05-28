import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';

// Walk up from __dirname to find the directory containing package.json.
// Works regardless of whether we are in src/common/config or dist/src/common/config.
function findProjectRoot(start: string): string {
    let dir = start;
    while (true) {
        if (fs.existsSync(path.join(dir, 'package.json'))) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            return start;
        }
        dir = parent;
    }
}

const env = process.env.NODE_ENV || 'development';
const projectRoot = findProjectRoot(__dirname);
dotenv.config({ path: path.resolve(projectRoot, `.env.${env}`) });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

interface Config {
    nodeEnv: string;
    gameType: number;
    gameTypeKey: string;
    database: {
        url: string;
    };
    server: {
        port: number;
    };
    security: {
        jwtSecret: string;
    };
    crypto: {
        enabled: boolean;
        encryptionKey: string;
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
        db: number;
        projectKey: string;
        adminProjectKey: string;
    };
    adminMicroservice: {
        baseUrl: string;
    };
    restate: {
        ingressUrl: string;
        endpointPort: number;
    };
    aws: {
        region: string;
        sns: {
            cheatTopicArn: string;
        };
        sqs: {
            jobQueueUrl: string;
            pollWaitSeconds: number;
            maxMessages: number;
        };
    };
    swagger: {
        title: string;
        description: string;
        version: string;
    };
    throttle: {
        enabled: boolean;
        ttlMs: number;
        gameLimit: number;
        defaultLimit: number;
    };
    language: {
        supported: string[];
        default: string;
    };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

const getBooleanEnvVar = (key: string, defaultValue: boolean): boolean => {
    const rawValue = process.env[key];
    if (rawValue === undefined) {
        return defaultValue;
    }
    return rawValue.toLowerCase() !== 'false';
};

export const config: Config = {
    nodeEnv: env,
    gameType: parseInt(getEnvVar('GAME_TYPE', '4'), 10),
    gameTypeKey: getEnvVar('GAME_TYPE_KEY', 'BLOCK_FILL'),
    database: {
        url: getEnvVar('DATABASE_URL'),
    },
    server: {
        port: parseInt(getEnvVar('PORT', '3000'), 10),
    },
    security: {
        jwtSecret: getEnvVar('JWT_SECRET'),
    },
    crypto: {
        enabled: getBooleanEnvVar('ENCRYPTION_ENABLED', true),
        encryptionKey: process.env['ENCRYPTION_KEY'] || '',
    },
    redis: {
        host: getEnvVar('REDIS_HOST', 'localhost'),
        port: parseInt(getEnvVar('REDIS_PORT', '6379'), 10),
        password: process.env['REDIS_PASSWORD'] || undefined,
        db: parseInt(getEnvVar('REDIS_DB', '0'), 10),
        projectKey: getEnvVar('REDIS_PROJECT_KEY'),
        adminProjectKey: getEnvVar('REDIS_ADMIN_PROJECT_KEY'),
    },
    adminMicroservice: {
        baseUrl: getEnvVar('ADMIN_MICROSERVICE_BASE_URL'),
    },
    restate: {
        ingressUrl: getEnvVar('RESTATE_INGRESS_URL', 'http://localhost:8080'),
        endpointPort: parseInt(getEnvVar('RESTATE_ENDPOINT_PORT', '9080'), 10),
    },
    aws: {
        region: getEnvVar('AWS_REGION', 'ap-south-1'),
        sns: {
            cheatTopicArn: getEnvVar('AWS_SNS_CHEAT_TOPIC_ARN'),
        },
        sqs: {
            jobQueueUrl: getEnvVar('AWS_SQS_JOB_QUEUE_URL', ''),
            pollWaitSeconds: parseInt(getEnvVar('AWS_SQS_POLL_WAIT_SECONDS', '20'), 10),
            maxMessages: parseInt(getEnvVar('AWS_SQS_MAX_MESSAGES', '10'), 10),
        },
    },
    swagger: {
        title: getEnvVar('PROJECT_NAME', 'Block Fill Game Service'),
        description: getEnvVar('PROJECT_DESCRIPTION', 'Block Fill Game Service API'),
        version: getEnvVar('PROJECT_VERSION', '1.0'),
    },
    throttle: {
        enabled: getEnvVar('THROTTLE_ENABLED', 'true') === 'true',
        ttlMs: parseInt(getEnvVar('THROTTLE_TTL_MS', '60000'), 10),
        gameLimit: parseInt(getEnvVar('THROTTLE_GAME_LIMIT', '100'), 10),
        defaultLimit: parseInt(getEnvVar('THROTTLE_DEFAULT_LIMIT', '10'), 10),
    },
    language: {
        supported: getEnvVar('SUPPORTED_LANGUAGES', 'en')
            .split(',')
            .map((l) => l.trim()),
        default: getEnvVar('DEFAULT_LANGUAGE', 'en'),
    },
};
