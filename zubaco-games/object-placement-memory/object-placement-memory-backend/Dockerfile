FROM oven/bun:1.3 AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bunx prisma generate
EXPOSE 3004
CMD ["bun", "src/main.ts"]
