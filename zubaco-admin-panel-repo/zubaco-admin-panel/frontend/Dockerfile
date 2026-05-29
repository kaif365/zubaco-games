FROM node:alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG BUILD_CMD="npm run build"
RUN ${BUILD_CMD}


FROM node:alpine AS production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

USER appuser

EXPOSE 3000

CMD ["npm", "start"]
