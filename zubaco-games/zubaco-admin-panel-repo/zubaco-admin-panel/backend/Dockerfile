FROM oven/bun:latest AS builder

WORKDIR /app

COPY package*.json bun.lock* ./
RUN bun install

COPY . .

RUN bunx prisma generate

RUN bun run build


FROM oven/bun:latest AS production

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

USER appuser

EXPOSE 3001

CMD ["bun", "run", "start:prod"]
