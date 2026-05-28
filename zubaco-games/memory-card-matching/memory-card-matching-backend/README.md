# Memory Card Matching Backend

Nest + Bun backend boilerplate for the Memory Card Matching game.

## Included

- `GET /health`
- Global API prefix: `/api/v1`
- Frontend-aligned game endpoints:
  - `GET /api/v1/game/config`
  - `POST /api/v1/game/start`
  - `GET /api/v1/game/level/next`
  - `POST /api/v1/game/progress`
  - `GET /api/v1/game/session/current`
  - `POST /api/v1/game/over`
- Analytics endpoint:
  - `POST /api/v1/analytics/events`
- In-memory session storage for early integration

## Quick start

```bash
bun install
cp .env.example .env
bun run start:dev
```
