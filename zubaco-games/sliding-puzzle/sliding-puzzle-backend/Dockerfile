FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY prisma ./prisma
RUN bun install

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" bun run prisma:generate

COPY . .
RUN bun run build


FROM oven/bun:1-alpine AS production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./dist/generated
COPY package.json bunfig.toml tsconfig.json prisma.config.ts ./
COPY src ./src
COPY prisma ./prisma
COPY public ./public

USER appuser

EXPOSE 7000
EXPOSE 9081

CMD ["sh", "-c", "bun run start:prod"]
