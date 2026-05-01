FROM node:22.14.0-bookworm-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM base AS dev
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "start:dev"]

FROM base AS build
COPY . .
RUN npm run build

FROM node:22.14.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist

CMD ["node", "dist/main"]
