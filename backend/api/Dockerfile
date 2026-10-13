# syntax=docker/dockerfile:1.7

FROM node:22.14.0-bookworm-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl poppler-utils tesseract-ocr tesseract-ocr-spa \
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
ARG LOCAL_UID=1000
ARG LOCAL_GID=1000
ENV NODE_ENV=development
COPY backend/api ./
RUN groupmod --gid "$LOCAL_GID" node \
  && usermod --uid "$LOCAL_UID" --gid "$LOCAL_GID" node \
  && mkdir -p dist uploads \
  && chown -R node:node /app/backend/api
USER node
CMD ["npm", "run", "start:dev"]

FROM dev AS build
RUN npm run build \
  && test -f dist/src/main.js

FROM base AS production-dependencies
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --workspace=backend/api

FROM production-dependencies AS migration
ARG JANO_RELEASE
LABEL org.opencontainers.image.revision="$JANO_RELEASE"
WORKDIR /app/backend/api
COPY --chown=node:node backend/api/prisma ./prisma
COPY --chown=node:node backend/api/prisma.config.ts ./prisma.config.ts
USER node
CMD ["npm", "exec", "--", "prisma", "migrate", "deploy"]

FROM production-dependencies AS runtime-dependencies
# Prisma's CLI is an optional peer of the runtime client. The generated client is
# copied from the build stage, so shipping the CLI and its database drivers only
# increases the production image and its advisory surface.
RUN rm -rf \
  /app/node_modules/prisma \
  /app/node_modules/@prisma/config \
  /app/node_modules/deepmerge-ts \
  /app/node_modules/mysql2

FROM runtime-dependencies AS runtime
ARG JANO_RELEASE
LABEL org.opencontainers.image.revision="$JANO_RELEASE"
WORKDIR /app/backend/api
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --chown=node:node --from=build /app/backend/api/dist ./dist
RUN mkdir -p uploads && chown node:node uploads

EXPOSE 3000
USER node
CMD ["node", "dist/src/main.js"]
