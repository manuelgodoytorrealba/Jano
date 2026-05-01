FROM node:22.14.0-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---- DEV (no se usará en servidor) ----
FROM base AS dev
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "start:host"]

# ---- BUILD ----
FROM base AS build
COPY . .
RUN npm run build

# ---- PRODUCTION ----
FROM node:22.14.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 4200

CMD ["npm", "run", "serve:ssr:jano-web-app"]