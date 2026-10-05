# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS workspace
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @trackon/api...

COPY apps/api apps/api
RUN pnpm --filter @trackon/api exec prisma generate \
    && pnpm --filter @trackon/api build

FROM workspace AS migrate
WORKDIR /workspace/apps/api
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM workspace AS production-deploy
WORKDIR /workspace
# The pnpm 10 workspace is not configured for injected packages, so use its
# legacy deploy mode to produce a production-only, isolated API directory.
RUN pnpm --filter @trackon/api --prod deploy --legacy /out \
    && mkdir -p /out/node_modules/.prisma \
    && cp -a apps/api/node_modules/.prisma/client /out/node_modules/.prisma/client \
    && rm -rf /out/src /out/prisma /out/prisma.config.ts /out/tsconfig.json

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-deploy --chown=node:node /out ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
