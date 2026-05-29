import * as fs from "fs";
import * as path from "path";

import * as dotenv from "dotenv";

// Walk up from __dirname to find the directory containing package.json.
// Works regardless of whether we are in src/common/config or dist/src/common/config.
/**
 * Handle find project root.
 *
 * @param {string} start - start value.
 *
 * @returns {string} The string result.
 */
function findProjectRoot(start: string): string {
  let dir = start;
  while (true) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return start;
    } // filesystem root — bail
    dir = parent;
  }
}

const env = process.env.NODE_ENV || "development";
const projectRoot = findProjectRoot(__dirname);
dotenv.config({ path: path.resolve(projectRoot, `.env.${env}`) });
dotenv.config({ path: path.resolve(projectRoot, ".env") });

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
  redis: {
    host: string;
    port: number;
    username: string | undefined;
    password: string | undefined;
    db: number;
    reflectorProjectKey: string;
    adminProjectKey: string;
    usersProjectKey: string;
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
  crypto: {
    enabled: boolean;
    encryptionKey: string;
  };
  logging: {
    colorEnabled: boolean;
  };
  otel: {
    enabled: boolean;
    serviceName: string;
    exporterEndpoint: string | undefined;
  };
}

/**
 * Get env var.
 *
 * @param {string} key - key value.
 * @param {string} defaultValue - Fallback value used when the environment variable is missing.
 *
 * @returns {string} The string result.
 */
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config: Config = {
  nodeEnv: env,
  gameType: parseInt(getEnvVar("GAME_TYPE", "2"), 10),
  gameTypeKey: getEnvVar("GAME_TYPE_KEY", "LOGIC_REFLECTOR"),
  database: {
    url: getEnvVar("DATABASE_URL"),
  },
  server: {
    port: parseInt(getEnvVar("PORT", "3001"), 10),
  },
  security: {
    jwtSecret: getEnvVar("JWT_SECRET"),
  },
  redis: {
    host: getEnvVar("REDIS_HOST", "localhost"),
    port: parseInt(getEnvVar("REDIS_PORT", "6379"), 10),
    username: process.env["REDIS_USERNAME"] || undefined,
    password: process.env["REDIS_PASSWORD"] || undefined,
    db: parseInt(getEnvVar("REDIS_DB", "0"), 10),
    reflectorProjectKey: getEnvVar("REDIS_REFLECTOR_PROJECT_KEY"),
    adminProjectKey: getEnvVar("REDIS_ADMIN_PROJECT_KEY"),
    usersProjectKey: getEnvVar("REDIS_USERS_PROJECT_KEY"),
  },
  restate: {
    ingressUrl: getEnvVar("RESTATE_INGRESS_URL", "http://localhost:8080"),
    endpointPort: parseInt(getEnvVar("RESTATE_ENDPOINT_PORT", "9081"), 10),
  },
  aws: {
    region: getEnvVar("AWS_REGION"),
    sns: {
      cheatTopicArn: getEnvVar("AWS_SNS_CHEAT_TOPIC_ARN"),
    },
    sqs: {
      jobQueueUrl: getEnvVar("AWS_SQS_JOB_QUEUE_URL"),
      pollWaitSeconds: parseInt(
        getEnvVar("AWS_SQS_POLL_WAIT_SECONDS", "20"),
        10,
      ),
      maxMessages: parseInt(getEnvVar("AWS_SQS_MAX_MESSAGES", "10"), 10),
    },
  },
  adminMicroservice: {
    baseUrl: getEnvVar("ADMIN_MICROSERVICE_BASE_URL"),
  },
  usersMicroservice: {
    baseUrl: getEnvVar("USERS_MICROSERVICE_BASE_URL"),
  },
  swagger: {
    title: getEnvVar("PROJECT_NAME", "Logic Reflector Game Service"),
    description: getEnvVar(
      "PROJECT_DESCRIPTION",
      "Logic Reflector Game Service API",
    ),
    version: getEnvVar("PROJECT_VERSION", "1.0"),
  },
  language: {
    supported: getEnvVar("SUPPORTED_LANGUAGES", "en")
      .split(",")
      .map((l) => l.trim()),
    default: getEnvVar("DEFAULT_LANGUAGE", "en"),
  },
  throttle: {
    enabled: getEnvVar("THROTTLE_ENABLED", "true") !== "false",
    ttlMs: parseInt(getEnvVar("THROTTLE_TTL_MS", "60000"), 10),
    gameLimit: parseInt(getEnvVar("THROTTLE_GAME_LIMIT", "100"), 10),
    defaultLimit: parseInt(getEnvVar("THROTTLE_DEFAULT_LIMIT", "10"), 10),
  },
  crypto: {
    enabled: getEnvVar("ENCRYPTION_ENABLED", "true") !== "false",
    encryptionKey: getEnvVar("ENCRYPTION_KEY"),
  },
  logging: {
    colorEnabled: getEnvVar("LOGGING_COLOR_ENABLED", "false") === "true",
  },
  otel: {
    enabled: getEnvVar("OTEL_ENABLED", "true") === "true",
    serviceName: getEnvVar("OTEL_SERVICE_NAME", "logic-reflector-backend"),
    exporterEndpoint: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] || undefined,
  },
};
