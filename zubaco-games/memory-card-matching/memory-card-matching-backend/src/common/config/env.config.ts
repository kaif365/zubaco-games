import * as fs from "fs";
import * as path from "path";

import * as dotenv from "dotenv";

function findProjectRoot(start: string): string {
  let directory = start;

  while (true) {
    if (fs.existsSync(path.join(directory, "package.json"))) {
      return directory;
    }

    const parent = path.dirname(directory);
    if (parent === directory) {
      return start;
    }

    directory = parent;
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
    username?: string;
    password?: string;
    db: number;
    usersProjectKey: string;
    adminProjectKey: string;
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
    s3: {
      bucketName: string;
    };
    cloudfrontDomain: string;
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
  upload: {
    allowedMimeTypes: string[];
    maxFileSizeBytes: number;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const config: Config = {
  nodeEnv: env,
  gameType: parseInt(getEnvVar("GAME_TYPE", "6"), 10),
  gameTypeKey: getEnvVar("GAME_TYPE_KEY", "MEMORY_CARD_MATCHING"),
  database: {
    url: getEnvVar(
      "DATABASE_URL",
      "postgresql://postgres:postgres@localhost:5432/memory_card_matching",
    ),
  },
  server: {
    port: parseInt(getEnvVar("PORT", "3000"), 10),
  },
  security: {
    jwtSecret: getEnvVar("JWT_SECRET", "change-me-min-32-chars"),
  },
  redis: {
    host: getEnvVar("REDIS_HOST", "localhost"),
    port: parseInt(getEnvVar("REDIS_PORT", "6379"), 10),
    username: process.env.REDIS_USERNAME?.trim() || undefined,
    password: process.env.REDIS_PASSWORD?.trim() || undefined,
    db: parseInt(getEnvVar("REDIS_DB", "0"), 10),
    usersProjectKey: getEnvVar("REDIS_USERS_PROJECT_KEY", "ZUBACO-Users"),
    adminProjectKey: getEnvVar("REDIS_ADMIN_PROJECT_KEY", "ZUBACO-admin"),
  },
  restate: {
    ingressUrl: getEnvVar("RESTATE_INGRESS_URL", "http://localhost:8080"),
    endpointPort: parseInt(getEnvVar("RESTATE_ENDPOINT_PORT", "9080"), 10),
  },
  aws: {
    region: getEnvVar("AWS_REGION", "ap-south-1"),
    sns: {
      cheatTopicArn: getEnvVar(
        "AWS_SNS_CHEAT_TOPIC_ARN",
        "arn:aws:sns:ap-south-1:000000000000:memory-card-cheat-topic",
      ),
    },
    sqs: {
      jobQueueUrl: getEnvVar("AWS_SQS_JOB_QUEUE_URL"),
      pollWaitSeconds: parseInt(
        getEnvVar("AWS_SQS_POLL_WAIT_SECONDS", "20"),
        10,
      ),
      maxMessages: parseInt(getEnvVar("AWS_SQS_MAX_MESSAGES", "10"), 10),
    },
    s3: {
      bucketName: getEnvVar("AWS_S3_BUCKET_NAME", "memory-card-matching-local"),
    },
    cloudfrontDomain: getEnvVar("AWS_CLOUDFRONT_DOMAIN", "localhost"),
  },
  adminMicroservice: {
    baseUrl: getEnvVar("ADMIN_MICROSERVICE_BASE_URL"),
  },
  usersMicroservice: {
    baseUrl: getEnvVar("USERS_MICROSERVICE_BASE_URL"),
  },
  swagger: {
    title: getEnvVar("PROJECT_NAME", "Memory Card Matching Backend"),
    description: getEnvVar(
      "PROJECT_DESCRIPTION",
      "Memory Card Matching backend API",
    ),
    version: getEnvVar("PROJECT_VERSION", "1.0"),
  },
  throttle: {
    enabled: getEnvVar("THROTTLE_ENABLED", "true") !== "false",
    ttlMs: parseInt(getEnvVar("THROTTLE_TTL_MS", "60000"), 10),
    gameLimit: parseInt(getEnvVar("THROTTLE_GAME_LIMIT", "100"), 10),
    defaultLimit: parseInt(getEnvVar("THROTTLE_DEFAULT_LIMIT", "10"), 10),
  },
  crypto: {
    enabled: getEnvVar("ENCRYPTION_ENABLED", "false") !== "false",
    encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  },
  upload: {
    allowedMimeTypes: getEnvVar(
      "UPLOAD_ALLOWED_MIME_TYPES",
      "image/jpeg,image/png,image/webp",
    )
      .split(",")
      .map((type) => type.trim()),
    maxFileSizeBytes: parseInt(
      getEnvVar("UPLOAD_MAX_FILE_SIZE_BYTES", String(10 * 1024 * 1024)),
      10,
    ),
  },
};
