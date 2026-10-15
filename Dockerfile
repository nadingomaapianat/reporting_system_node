# Build stage: install everything, compile, then drop dev dependencies
FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --force

COPY . .
RUN npm run build && npm prune --omit=dev --force

# Runtime stage: compiled output and production dependencies only, run as the
# unprivileged "node" user in production mode (secure cookies, TLS verification on).
# Configuration comes from the environment (docker-compose env_file); .env is not baked in.
FROM node:20

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3002

CMD ["node", "dist/main"]
