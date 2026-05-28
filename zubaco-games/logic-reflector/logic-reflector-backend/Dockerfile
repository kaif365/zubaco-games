FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" bunx prisma generate

COPY . .
RUN bun run build && cp -r generated/prisma dist/generated/


FROM oven/bun:1-alpine AS production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/dist ./dist
COPY package.json tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

USER appuser

EXPOSE 3000

CMD ["sh", "-c", "bun run start:prod"]
