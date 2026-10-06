# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS workspace

ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/corepack"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /workspace

# Prisma necesita OpenSSL dentro de la imagen.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p "$COREPACK_HOME" "$PNPM_HOME" \
    && corepack enable \
    && corepack prepare pnpm@10.34.5 --activate \
    && chown -R node:node "$COREPACK_HOME" "$PNPM_HOME"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install \
    --frozen-lockfile \
    --filter @trackon/api...

COPY apps/api apps/api

RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" \
    pnpm --filter @trackon/api exec prisma generate \
    && pnpm --filter @trackon/api build


# ---------------------------------------------------------
# Migraciones
# ---------------------------------------------------------

FROM workspace AS migrate

WORKDIR /workspace/apps/api

USER node

CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]


# ---------------------------------------------------------
# Preparar dependencias de producción
# ---------------------------------------------------------

FROM workspace AS production-deploy

WORKDIR /workspace

RUN pnpm --filter @trackon/api --prod deploy --legacy /out \
    && PRISMA_SOURCE="$(dirname "$(readlink -f apps/api/node_modules/@prisma/client)")/../.prisma/client" \
    && PRISMA_TARGET="$(dirname "$(readlink -f /out/node_modules/@prisma/client)")/../.prisma/client" \
    && mkdir -p "$PRISMA_TARGET" \
    && cp -a "$PRISMA_SOURCE/." "$PRISMA_TARGET/" \
    && rm -rf \
        /out/src \
        /out/prisma \
        /out/prisma.config.ts \
        /out/tsconfig.json


# ---------------------------------------------------------
# Runtime
# ---------------------------------------------------------

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=production-deploy \
    --chown=node:node \
    /out ./

USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]

# ---------------------------------------------------------
# Tests
# ---------------------------------------------------------

FROM workspace AS test

ENV NODE_ENV=test

WORKDIR /workspace/apps/api

RUN chown -R node:node /workspace/apps/api

USER node

CMD ["pnpm", "test:coverage"]