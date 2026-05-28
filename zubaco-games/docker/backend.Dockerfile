# Multi-stage Dockerfile for NestJS game backends
# Usage: docker build -f docker/backend.Dockerfile --build-arg GAME_DIR=colour-sorting/colour-sorting-backend .

ARG NODE_VERSION=22-alpine

# ─── Stage 1: Install dependencies ───
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

ARG GAME_DIR
COPY ${GAME_DIR}/package.json ${GAME_DIR}/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    cp -R node_modules /prod_modules && \
    npm ci --ignore-scripts

# ─── Stage 2: Generate Prisma client & build ───
FROM node:${NODE_VERSION} AS build
WORKDIR /app

ARG GAME_DIR
COPY --from=deps /app/node_modules ./node_modules
COPY ${GAME_DIR}/ ./

# Generate Prisma client
RUN npx prisma generate

# Build NestJS application
RUN npm run build

# ─── Stage 3: Production image ───
FROM node:${NODE_VERSION} AS production
WORKDIR /app

ENV NODE_ENV=production

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

COPY --from=deps --chown=appuser:appgroup /prod_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/generated ./generated
COPY --from=build --chown=appuser:appgroup /app/prisma ./prisma

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/v1/health/live || exit 1

EXPOSE ${PORT:-3000}

CMD ["node", "dist/main.js"]
