# Logic Reflector Game Service

ZUBACO Gaming Engine — Logic Reflector Game Microservice

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Framework | NestJS v11 |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis |
| State Machine | Restate |
| Validation | Zod |
| API Docs | Swagger / OpenAPI |
| Security | Helmet, JWT |
| Observability | OpenTelemetry |
| AWS | SNS (cheat events), SQS (job queue) |

---

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- PostgreSQL >= 14
- Redis
- [Restate Server](https://docs.restate.dev) running and accessible

---

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Set up environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

See the [Environment Variables](#environment-variables) section for all required fields.

### 3. Run database migrations

```bash
bun run migrate:dev
```

### 4. Generate Prisma client

```bash
bun run prisma:generate
```

### 5. (Optional) Seed the database

```bash
bun run db:seed
```

### 6. Start the server

```bash
# Development (watch mode)
bun run start:dev

# Debug mode
bun run start:debug

# Production
bun run start:prod
```

Server starts on port `3006` by default.
Swagger UI available at: `http://localhost:3006/api`

---

## Scripts

| Script | Description |
|---|---|
| `bun run start` | Run without watch |
| `bun run start:dev` | Run with hot reload |
| `bun run start:debug` | Run with inspector + hot reload |
| `bun run start:prod` | Run compiled production build |
| `bun run build` | Compile TypeScript to `dist/` |
| `bun run lint` | Run ESLint with auto-fix |
| `bun run format` | Run Prettier |
| `bun run test` | Run tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:cov` | Run tests with coverage |
| `bun run test:e2e` | Run end-to-end tests |
| `bun run migrate:dev` | Run Prisma migrations (dev) |
| `bun run migrate:deploy` | Run Prisma migrations (prod) |
| `bun run prisma:generate` | Regenerate Prisma client |
| `bun run db:seed` | Seed the database |

---

## Project Structure

```
src/
├── main.ts                        # App bootstrap
├── tracing.ts                     # OpenTelemetry setup (must be first import)
├── app.module.ts
│
├── admin/                         # Admin APIs (boards, levels, stage configs)
│   ├── board/
│   ├── level/
│   ├── stage-config/
│   └── http/                      # Admin microservice HTTP client
│
├── aws/                           # SNS & SQS services
│
├── common/
│   ├── config/env.config.ts       # Typed environment config
│   ├── constants.ts               # All enums and game constants
│   ├── decorators/
│   ├── filters/                   # Global exception filter
│   ├── guards/
│   ├── interceptors/              # Global response interceptor
│   ├── prisma/                    # Prisma service + transaction context
│   └── utils/
│
├── crypto/                        # AES-256-GCM request/response encryption
│
├── game/                          # Game session logic
│   ├── game.controller.ts
│   ├── game-session.restate.ts    # Restate virtual object (game state machine)
│   ├── game-expiry.restate.ts     # Restate service (session expiry)
│   ├── game-restate-state.types.ts
│   └── utils/
│       ├── laser-simulator.ts     # Server-side laser path simulation
│       └── move-validator.ts
│
├── redis/
├── server/                        # Health check endpoint
└── user/                          # User demo boards
```

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ── Server ──────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3006

# ── Database ─────────────────────────────────────────────────────────
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db>?schema=public&sslmode=disable"

# ── Security ─────────────────────────────────────────────────────────
JWT_SECRET=<min-32-char-secret>

# ── Redis ─────────────────────────────────────────────────────────────
REDIS_HOST=<host>
REDIS_PORT=<port>
REDIS_USERNAME=
REDIS_PASSWORD=<password>
REDIS_DB=0
REDIS_REFLECTOR_PROJECT_KEY="REFLECTOR_SERVICE"
REDIS_ADMIN_PROJECT_KEY="ADMIN_SERVICE"
REDIS_USERS_PROJECT_KEY="USERS_SERVICE"
REDIS_MAZE_PROJECT_KEY="MAZE_SERVICE"

# ── Restate ───────────────────────────────────────────────────────────
RESTATE_INGRESS_URL=http://<host>:8080
RESTATE_ENDPOINT_PORT=9082

# ── Microservices ─────────────────────────────────────────────────────
ADMIN_MICROSERVICE_BASE_URL=https://<admin-service-url>/
USERS_MICROSERVICE_BASE_URL=https://<users-service-url>/

# ── Swagger ───────────────────────────────────────────────────────────
PROJECT_NAME="Logic Reflector Game Service"
PROJECT_DESCRIPTION="ZUBACO Gaming Engine — Logic Reflector Game Microservice"
PROJECT_VERSION="1.0.0"

# ── Features ──────────────────────────────────────────────────────────
ADMIN_BYPASS=false
ENABLE_DEV_AUTH=true          # Skips real auth in development
ENABLE_SWAGGER=true

# ── Language ──────────────────────────────────────────────────────────
SUPPORTED_LANGUAGES=en
DEFAULT_LANGUAGE=en

# ── Cloudinary ────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# ── Encryption ────────────────────────────────────────────────────────
ENCRYPTION_ENABLED=false
ENCRYPTION_KEY=<64-char-hex>  # AES-256 key (64 hex chars = 32 bytes)

# ── AWS ───────────────────────────────────────────────────────────────
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>

# ── AWS SNS ───────────────────────────────────────────────────────────
AWS_SNS_CHEAT_TOPIC_ARN=arn:aws:sns:<region>:<account>:<topic>

# ── AWS SQS ───────────────────────────────────────────────────────────
AWS_SQS_JOB_QUEUE_URL=https://sqs.<region>.amazonaws.com/<account>/<queue>
AWS_SQS_JOB_QUEUE_ARN=arn:aws:sqs:<region>:<account>:<queue>

# ── Game ──────────────────────────────────────────────────────────────
GAME_TYPE=8

# ── Throttling ────────────────────────────────────────────────────────
THROTTLE_ENABLED=false
THROTTLE_TTL_MS=60000
THROTTLE_GAME_LIMIT=100
THROTTLE_DEFAULT_LIMIT=10

# ── Observability ─────────────────────────────────────────────────────
OTEL_ENABLED=false
OTEL_SERVICE_NAME=logic-reflector-backend      # optional, has default
OTEL_EXPORTER_OTLP_ENDPOINT=                   # set to ship to a collector (Grafana, Jaeger, etc.)
LOGGING_COLOR_ENABLED=true
```

---

## API Overview

All endpoints are prefixed by version. Swagger docs available at `/api`.

### Game Endpoints (`/v1/game`)

Require: `Authorization: Bearer <token>` (user JWT)

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/game/game-start` | Start or re-enter a game session |
| `GET` | `/v1/game/next-level` | Pre-fetch the next board |
| `POST` | `/v1/game/submit-moves` | Submit block placement/removal moves |
| `POST` | `/v1/game/end-board` | End current board (triggers laser simulation) |
| `POST` | `/v1/game/end-game` | Finalize the game session |
| `GET` | `/v1/game/status` | Get current game state |

### Admin Endpoints

Require: `Authorization: Bearer <token>` (admin JWT)

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/boards` | Create a board |
| `PUT` | `/v1/boards` | Update a board |
| `DELETE` | `/v1/boards` | Delete boards |
| `GET` | `/v1/boards` | List boards |
| `GET` | `/v1/boards/details` | Get single board |
| `POST` | `/v1/levels` | Create a level |
| `PUT` | `/v1/levels` | Update a level |
| `DELETE` | `/v1/levels` | Delete levels |
| `GET` | `/v1/levels` | List levels |
| `PUT` | `/v1/stage-configs` | Upsert stage config |
| `DELETE` | `/v1/stage-configs` | Delete stage configs |
| `GET` | `/v1/stage-configs` | List stage configs |

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Service health check |

---

## Database Models

| Model | Description |
|---|---|
| `Level` | Game levels grouping boards |
| `Board` | Grid-based board definition |
| `BoardCell` | Static cells (emitters, targets, walls) |
| `BoardBlock` | Pre-placed blocks on a board |
| `BoardAvailableBlock` | Block inventory per board |
| `GameSession` | User game session |
| `GameSessionBoard` | Board state per round |
| `GameSessionBlock` | Block placement snapshot |
| `GameMove` | Per-move audit trail |
| `StageConfig` | Stage settings (time limit, levels) |
| `StageLevelConfig` | Level-to-stage mapping |
| `CheatFlag` | Detected cheat events |
| `UserStageDemoBoard` | Demo board state per user |

---

## Restate Services

[Restate](https://docs.restate.dev) is used for durable, fault-tolerant game state management.

| Service | Type | Description |
|---|---|---|
| `LogicReflectorGameSessionRestateObject` | Virtual Object | Game session state machine (start, moves, end) |
| `LogicReflectorGameExpiryRestateService` | Service | Handles session expiry and result processing |

The Restate endpoint is exposed on `RESTATE_ENDPOINT_PORT` (default `9082`).

---

## Observability

OpenTelemetry is configured in `src/tracing.ts` and bootstrapped before any other module.

- **When `OTEL_ENABLED=false`** — SDK is not started; no output.
- **When `OTEL_ENABLED=true` and no `OTEL_EXPORTER_OTLP_ENDPOINT`** — Traces/metrics/logs are printed to stdout (console exporter, dev mode).
- **When `OTEL_EXPORTER_OTLP_ENDPOINT` is set** — Telemetry is shipped to that collector via HTTP.

Instrumented libraries: HTTP, IORedis, Prisma.

---

## Path Aliases

Defined in `tsconfig.json`:

| Alias | Resolves to |
|---|---|
| `@common/*` | `src/common/*` |
| `@config` | `src/common/config/env.config` |
| `@prisma` | `generated/prisma/client` |

---

## Anti-Cheat

Server-side cheat detection runs on move submission and board end:

| Flag | Trigger |
|---|---|
| `CLICK_TOO_FAST` | Consecutive moves < 50ms apart |
| `UNIFORM_TIMING` | Move intervals have suspiciously low variance |
| `REMAINING_MOVES_AT_END` | Player ends board with unused blocks |
| `IMPOSSIBLE_SOLVE_TIME` | Board solved faster than 100ms per arrow |

Detected flags are published to AWS SNS (`AWS_SNS_CHEAT_TOPIC_ARN`).

---

## Encryption

When `ENCRYPTION_ENABLED=true`, game controller requests and responses are encrypted with AES-256-GCM. The `@EnableEncryption()` decorator on the game controller activates the decryption middleware and encryption interceptor.

`ENCRYPTION_KEY` must be a 64-character hex string (32 bytes).
