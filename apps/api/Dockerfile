# syntax=docker/dockerfile:1
# Multi-stage build for the NestJS API, using `turbo prune` to pull in only this app's slice of
# the monorepo (Solution Architecture §27 Deployment Architecture). Build from the repo root:
#   docker build -f apps/api/Dockerfile -t sprintguard/api .
#
# Debian slim (not alpine): Prisma's query engine binary targets and native deps (argon2) build
# more reliably against glibc than musl, avoiding an extra binaryTargets dance in schema.prisma.

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9.12.0 turbo@2.1.0

# --- Prune: extract just @sprintguard/api's dependency subset from the full workspace ---
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @sprintguard/api --docker

# --- Install + build ---
FROM base AS installer
WORKDIR /app
# Installing from the pruned lockfile/package.jsons first keeps this layer cached across builds
# that only change application source, not dependencies.
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @sprintguard/database exec prisma generate
RUN pnpm turbo run build --filter=@sprintguard/api...

# --- Runtime ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nestjs

# pnpm's node_modules are symlinks into node_modules/.pnpm's content-addressable store, both of
# which live inside this same copied tree, so a single directory copy keeps every symlink valid.
COPY --from=installer --chown=nestjs:nodejs /app .

USER nestjs
EXPOSE 3001
ENV PORT=3001

CMD ["node", "apps/api/dist/main.js"]
