# SprintGuard AI

AI-powered Sprint Quality Intelligence Platform. Analyzes sprint stories, extracts requirements
and acceptance criteria, generates test scenarios/cases, computes coverage gaps, and scores
release readiness — for QA, Product, and Engineering teams to make confident release decisions.

Full solution architecture, database design, and folder-structure rationale live in
[docs/architecture](docs/architecture/):

- [01-solution-architecture.md](docs/architecture/01-solution-architecture.md)
- [02-database-design.md](docs/architecture/02-database-design.md)
- [03-backend-folder-structure.md](docs/architecture/03-backend-folder-structure.md)
- [04-frontend-folder-structure.md](docs/architecture/04-frontend-folder-structure.md)
- [05-testing-strategy.md](docs/architecture/05-testing-strategy.md)
- [06-production-checklist.md](docs/architecture/06-production-checklist.md) — go/no-go before a real deployment

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind, ShadCN UI, TanStack Query, Zustand, React Hook Form + Zod |
| Backend | NestJS, TypeScript, Prisma, PostgreSQL 16 + pgvector, Redis, CQRS |
| AI | Anthropic Claude, OpenAI, Google Gemini — behind a shared `IAiProvider` abstraction |
| Auth | JWT (access + rotating refresh token), Argon2id, RBAC |
| Monorepo | pnpm workspaces + Turborepo |

## Prerequisites

- Node.js 20+, pnpm 9+ (`npm install -g pnpm@9.12.0`)
- Docker + Docker Compose (recommended path — see below), **or** local PostgreSQL 16 with the
  `pgvector` extension and Redis 7 if running without Docker

## Quickstart (Docker Compose)

```bash
cp .env.example .env   # fill in JWT secrets, credential vault key, and at least one AI provider key
docker compose up --build
```

This builds both app images, waits for Postgres/Redis to be healthy, runs `prisma migrate deploy`
then `prisma db seed` (RBAC roles/permissions, connector catalog, AI agent/model/prompt registry)
as one-shot services, then starts the API on `:3001` and the web app on `:3000`.

## Local development (without Docker)

```bash
pnpm install
pnpm db:generate           # generate the Prisma client
pnpm db:migrate            # apply migrations against your local Postgres
pnpm db:seed               # seed RBAC/connector/agent/prompt catalog
pnpm dev                   # runs apps/api and apps/web in watch mode via turbo
```

You'll need `DATABASE_URL` and `REDIS_URL` in `.env` pointing at a local Postgres (with pgvector)
and Redis instance — see `.env.example` for every required/optional variable.

## Scripts

| Command | Effect |
|---|---|
| `pnpm dev` | Run all apps in watch mode |
| `pnpm build` | Build all apps/packages (respects Turborepo dependency graph) |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Run across every workspace package |
| `pnpm db:generate` / `db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma workflows, scoped to `packages/database` |

## Repository layout

```
apps/
  api/          NestJS backend — Clean Architecture per bounded context (see docs/architecture/03-*)
  web/          Next.js frontend — feature-based structure (see docs/architecture/04-*)
packages/
  database/     Prisma schema, seed script, PrismaService, tenant-scoping primitives
  shared/       Zod schemas/types shared by both apps
docs/
  architecture/ Solution architecture, database design, folder-structure docs
```

## Testing

Unit tests live alongside the code they cover (`*.spec.ts`) in `apps/api`, run via
`pnpm --filter @sprintguard/api test`. CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit
tests, and a full build against a real ephemeral Postgres + Redis on every push/PR.

## Deployment

- `apps/api/Dockerfile` and `apps/web/Dockerfile`: multi-stage builds using `turbo prune` to
  isolate each app's dependency subset from the monorepo; the web image uses Next's `standalone`
  output.
- `docker-compose.yml`: local-parity stack (Postgres+pgvector, Redis, one-shot migrate/seed jobs,
  both apps).
- `.github/workflows/ci.yml`: lint/typecheck/test/build on every push and PR.
- `.github/workflows/docker-build.yml`: builds and pushes both images to GHCR, tagged by commit
  SHA, after CI passes on `main`. Promoting an image to staging/production is left to your
  deployment platform's own approval-gated pipeline (Solution Architecture §27) — this repo does
  not assume a specific cloud target.

## Current status / known limitations

- **AI providers**: Claude, OpenAI, and Gemini adapters are implemented and unit-tested with
  mocked HTTP calls. Live end-to-end verification was only possible against Gemini in this
  project's development environment, and that project's API key currently has a **0 free-tier
  quota** for `generateContent` (confirmed via a successful `ListModels` call — network and
  auth both work, generation is blocked by account-level quota). Enable billing on that Google
  Cloud project, or supply a key from a project that already has it, before relying on live
  generation.
- **Sprint import**: Jira is the only implemented connector (Solution Architecture §18's
  reference implementation); Linear and others are cataloged but not yet built.
- **Story Intelligence** page (`/dashboard/sprints/[id]/stories/[id]`) is scaffolded but not wired
  up — it was never in scope for any completed increment.
- No environment in this repository has been deployed to a real cloud target; Dockerfiles and
  compose config are written to established patterns but have not been build-verified against a
  live Docker daemon in this project's development sandbox (Docker was unavailable there). Build
  and run them yourself before trusting them in CI/production.
