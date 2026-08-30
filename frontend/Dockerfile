# syntax=docker/dockerfile:1.7

FROM node:22.14.0-bookworm-slim AS base
WORKDIR /app

RUN --mount=type=cache,target=/root/.npm npm install --global npm@10.9.4

COPY package.json package-lock.json .npmrc ./
COPY backend/api/package.json ./backend/api/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm pkg delete scripts.postinstall scripts.prepare

FROM base AS development-dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --workspace=frontend

FROM development-dependencies AS dev
ENV NODE_ENV=development
WORKDIR /app/frontend
COPY frontend ./
CMD ["npm", "run", "start:host"]

FROM dev AS build
ARG JANO_RELEASE
ENV JANO_RELEASE=$JANO_RELEASE
RUN npm run build \
  && test -f dist/jano-web-app/server/server.mjs

FROM base AS production-dependencies
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --workspace=frontend

FROM production-dependencies AS runtime
ARG JANO_RELEASE
LABEL org.opencontainers.image.revision="$JANO_RELEASE"
WORKDIR /app/frontend
COPY --from=build /app/frontend/dist ./dist

EXPOSE 4200
CMD ["npm", "run", "serve:ssr:jano-web-app"]
