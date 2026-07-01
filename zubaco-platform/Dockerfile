# ─── Stage 1: Build ───
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

# OPS-S2 (O4-fix): build via `nest build`, which honors tsconfig.build.json
# (excludes **/*spec.ts). A bare `npx tsc` uses tsconfig.json, which now pulls
# in the T5 *.spec.ts files that live under src/ and fails the image build on
# jest globals (describe/it/expect). This is the actual repository-ready fix
# that makes the production Docker image buildable again.
RUN npm run build

# ─── Stage 2: Production ───
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# OPS-S2 (O4): dumb-init as PID 1 so SIGTERM is forwarded to node and zombie
# child processes are reaped — required for the graceful shutdown enabled in
# main.ts to actually run on container stop / rolling redeploy.
RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev

# OPS-S2 (O4): copy build artifacts owned by the unprivileged built-in `node`
# user (uid 1000) rather than root.
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./

# OPS-S2 (O4): drop root — run the API as a non-privileged user.
USER node

EXPOSE 3000

# OPS-S2 (O2): probe the readiness endpoint (checks DB + Redis, 503 when a
# dependency is down) so the orchestrator only routes to a fully-ready instance.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health/ready || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
