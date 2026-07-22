# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js web app, using `turbo prune` + Next's standalone output
# (next.config.mjs: output: 'standalone') so the runtime image needs no full node_modules copy.
# Build from the repo root:
#   docker build -f apps/web/Dockerfile -t sprintguard/web .

FROM node:20-bookworm-slim AS base
RUN npm install -g pnpm@9.12.0 turbo@2.1.0

# --- Prune: extract just @sprintguard/web's dependency subset from the full workspace ---
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @sprintguard/web --docker

# --- Install + build ---
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# NEXT_PUBLIC_* values are baked in at build time -- override per environment by rebuilding, not
# by changing runtime env vars (standard Next.js constraint).
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Only Docker builds opt into `output: 'standalone'` (next.config.mjs) -- see the comment there.
ENV DOCKER_BUILD=true
RUN pnpm turbo run build --filter=@sprintguard/web...

# --- Runtime ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=installer /app/apps/web/public ./apps/web/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
