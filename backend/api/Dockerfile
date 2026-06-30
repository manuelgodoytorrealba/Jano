# syntax=docker/dockerfile:1.7

FROM node:22.14.0-bookworm-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.npm npm install --global npm@10.9.4

COPY package.json package-lock.json .npmrc ./
COPY backend/api/package.json ./backend/api/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm pkg delete scripts.postinstall scripts.prepare

FROM base AS development-dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --workspace=backend/api

COPY backend/api/prisma ./backend/api/prisma
COPY backend/api/prisma.config.ts ./backend/api/prisma.config.ts
WORKDIR /app/backend/api
RUN npm exec -- prisma generate

FROM development-dependencies AS dev
ENV NODE_ENV=development
COPY backend/api ./
CMD ["npm", "run", "start:dev"]

FROM dev AS build
RUN npm run build \
  && test -f dist/src/main.js

FROM base AS production-dependencies
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --workspace=backend/api

COPY backend/api/prisma ./backend/api/prisma
COPY backend/api/prisma.config.ts ./backend/api/prisma.config.ts
WORKDIR /app/backend/api
RUN npm exec -- prisma generate

FROM production-dependencies AS runtime
ARG JANO_RELEASE
LABEL org.opencontainers.image.revision="$JANO_RELEASE"
COPY --from=build /app/backend/api/dist ./dist

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
