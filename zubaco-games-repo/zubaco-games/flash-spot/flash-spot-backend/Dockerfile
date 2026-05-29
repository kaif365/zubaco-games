FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY . .

# Generate Prisma client
RUN bunx prisma generate

EXPOSE 3001
CMD ["bun", "--no-network-family-autoselection", "src/main.ts"]
