import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';

// Walk up from __dirname to find the directory containing package.json.
// Works regardless of whether we are in src/common/config or dist/src/common/config.
/**
 * Find project root.
 *
 * @param {string} start - The start.
 *
 * @returns {string} The result of findProjectRoot.
 */
function findProjectRoot(start: string): string {
    let dir = start;
    while (true) {
        if (fs.existsSync(path.join(dir, 'package.json'))) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            return start;
        } // filesystem root — bail
        dir = parent;
    }
}

const env = process.env.NODE_ENV || 'development';
const projectRoot = findProjectRoot(__dirname);
dotenv.config({ path: path.resolve(projectRoot, `.env.${env}`) });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

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
    crypto: {
        enabled: boolean;
        encryptionKey: string;
    };
    redis: {
        host: string;
        port: number;
        username: string | undefined;
        password: string | undefined;
        db: number;
        sequenceRecallProjectKey: string;
        adminProjectKey: string;
        usersProjectKey: string;
    };
    restate: {
        ingressUrl: string;
        endpointEnabled: boolean;
        endpointPort: number;
    };
    adminMicroservice: {
        baseUrl: string;
    };
    usersMicroservice: {
        baseUrl: string;
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
    throttle: {
        enabled: boolean;
        ttlMs: number;
        gameLimit: number;
        defaultLimit: number;
    };
    aws: {
        region: string;
        sns: {
            cheatTopicArn: string;
        };
    };
}

/**
 * Gets env var.
 *
 * @param {string} key - The key.
 * @param {string | undefined} defaultValue - The default value.
 *
 * @returns {string} The result of getEnvVar.
 */
const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

/**
 * Gets boolean env var.
 *
 * @param {string} key - The key.
 * @param {boolean} defaultValue - The default value.
 *
 * @returns {boolean} The result of getBooleanEnvVar.
 */
const getBooleanEnvVar = (key: string, defaultValue: boolean): boolean => {
    const rawValue = process.env[key];
    if (rawValue === undefined) {
        return defaultValue;
    }
    return rawValue.toLowerCase() !== 'false';
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
    crypto: {
        enabled: getBooleanEnvVar('ENCRYPTION_ENABLED', true),
        encryptionKey: process.env['ENCRYPTION_KEY'] || '',
    },
    redis: {
        host: getEnvVar('REDIS_HOST', 'localhost'),
        port: parseInt(getEnvVar('REDIS_PORT', '6379'), 10),
        username: process.env['REDIS_USERNAME'] || undefined,
        password: process.env['REDIS_PASSWORD'] || undefined,
        db: parseInt(getEnvVar('REDIS_DB', '0'), 10),
        sequenceRecallProjectKey: getEnvVar('REDIS_SEQUENCE_RECALL_PROJECT_KEY'),
        adminProjectKey: getEnvVar('REDIS_ADMIN_PROJECT_KEY'),
        usersProjectKey: getEnvVar('REDIS_USERS_PROJECT_KEY'),
    },
    restate: {
        ingressUrl: getEnvVar('RESTATE_INGRESS_URL', 'http://localhost:8080'),
        endpointEnabled: getBooleanEnvVar('RESTATE_ENDPOINT_ENABLED', true),
        endpointPort: parseInt(getEnvVar('RESTATE_ENDPOINT_PORT', '9080'), 10),
    },
    adminMicroservice: {
        baseUrl: getEnvVar('ADMIN_MICROSERVICE_BASE_URL'),
    },
    usersMicroservice: {
        baseUrl: getEnvVar('USERS_MICROSERVICE_BASE_URL'),
    },
    swagger: {
        title: getEnvVar('PROJECT_NAME', 'Sequence Recall Game Service'),
        description: getEnvVar('PROJECT_DESCRIPTION', 'Sequence Recall Game Service API'),
        version: getEnvVar('PROJECT_VERSION', '1.0'),
    },
    language: {
        supported: getEnvVar('SUPPORTED_LANGUAGES', 'en')
            .split(',')
            .map((l) => l.trim()),
        default: getEnvVar('DEFAULT_LANGUAGE', 'en'),
    },
    throttle: {
        enabled: getBooleanEnvVar('THROTTLE_ENABLED', true),
        ttlMs: parseInt(getEnvVar('THROTTLE_TTL_MS', '60000'), 10),
        gameLimit: parseInt(getEnvVar('THROTTLE_GAME_LIMIT', '100'), 10),
        defaultLimit: parseInt(getEnvVar('THROTTLE_DEFAULT_LIMIT', '10'), 10),
    },
    aws: {
        region: getEnvVar('AWS_REGION'),
        sns: {
            cheatTopicArn: getEnvVar('AWS_SNS_CHEAT_TOPIC_ARN'),
        },
    },
};
