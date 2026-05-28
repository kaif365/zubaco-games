# Multi-stage Dockerfile for React/Vite game frontends
# Usage: docker build -f docker/frontend.Dockerfile --build-arg GAME_DIR=colour-sorting/colour-sorting-frontend .

ARG NODE_VERSION=22-alpine

# ─── Stage 1: Install dependencies ───
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

ARG GAME_DIR
COPY ${GAME_DIR}/package.json ${GAME_DIR}/package-lock.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Build static assets ───
FROM node:${NODE_VERSION} AS build
WORKDIR /app

ARG GAME_DIR
ARG VITE_API_BASE_URL=/api/v1

COPY --from=deps /app/node_modules ./node_modules
COPY ${GAME_DIR}/ ./

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ─── Stage 3: Serve with Nginx ───
FROM nginx:stable-alpine AS production

# Security: remove default config
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf

# Security: run as non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
