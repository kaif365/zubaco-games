FROM oven/bun:latest

WORKDIR /app

COPY package*.json bun.lock* ./
RUN bun install

COPY . .

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" bunx prisma generate

RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

EXPOSE 3001

CMD ["bun", "run", "start:prod"]
