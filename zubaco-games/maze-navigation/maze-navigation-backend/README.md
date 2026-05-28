# Maze Navigation Backend

NestJS game microservice for Maze Navigation (Restate + Prisma). Pairs with [`maze-navigation-frontend`](../maze-navigation-frontend/README.md).

## Prerequisites

- [Bun](https://bun.sh/) (runtime)
- [Docker](https://www.docker.com/) (Restate runtime)
- [Restate CLI](https://docs.restate.dev/develop/local_dev#install-the-restate-cli)

## Getting Started

### 1. Install and generate client

```bash
bun install
bun prisma generate
```

### 2. Start Restate (Docker)

```bash
docker run --name restate -d \
  -p 8080:8080 \
  -p 9070:9070 \
  -p 9071:9071 \
  --add-host=host.docker.internal:host-gateway \
  restatedev/restate:latest
```

### 3. Start the API

```bash
bun run start:dev
```

Default game HTTP port is typically **3005** (match `VITE_API_BASE_URL` in the frontend `.env.local`).

### 4. Register with Restate

In another terminal:

```bash
restate deployments register http://host.docker.internal:9080 --force
```

## Game HTTP API (frontend)

The Vite frontend calls these under `VITE_API_BASE_URL` (see frontend README for auth and encryption):

| Area    | Examples                                                 |
| ------- | -------------------------------------------------------- |
| Session | `GET /v1/game/status`, `POST /v1/game/game-start`        |
| Play    | `POST /v1/game/submit-moves`, `POST /v1/game/next-board` |
| End     | `POST /v1/game/end-board`, `POST /v1/game/end-game`      |

Session status codes match `GAME_SESSION_STATUS` in the frontend (`STARTED`, `ENDED`, `EXPIRED`, etc.).

## Development commands

| Command                    | Description              |
| -------------------------- | ------------------------ |
| `bun run start:dev`        | Backend watch mode       |
| `bun run migrate:dev`      | Prisma migrations        |
| `bun run db:seed`          | Seed database            |
| `restate deployments list` | List Restate deployments |

## Frontend

Local UI: from `maze-navigation-frontend`, `npm run dev` → [http://localhost:3000](http://localhost:3000). Requires mock-user / dev-session URL and stage env vars documented in the frontend README.
