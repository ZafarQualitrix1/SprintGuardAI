# SprintGuard AI — Backend Folder Structure

Status: Draft v1.0 · Owner: Platform Architecture · Last updated: 2026-07-21

Implements the layering rules from [01-solution-architecture.md §7](01-solution-architecture.md)
and persists via the schema in [02-database-design.md](02-database-design.md). This document
describes what has actually been scaffolded under `apps/api`, `packages/database`, and
`packages/shared`, and the conventions every subsequent implementation step (Authentication Module,
Dashboard, Sprint Intelligence Module, AI Services, ...) must follow.

> **Toolchain note:** this environment has no Node.js/npm/pnpm installed. Every file below was
> hand-written and is structurally consistent with NestJS/Prisma/Turborepo conventions, but has not
> been installed, compiled, or run. Before development starts: install Node.js 20+, pnpm 9+, run
> `pnpm install` at the repo root, then `pnpm db:generate` (Prisma client) and `pnpm dev`.

---

## 1. Monorepo Layout

```
sprintguard-ai/
├── apps/
│   ├── api/                  # NestJS backend (this document)
│   └── web/                  # Next.js frontend (Step 4)
├── packages/
│   ├── database/             # Prisma schema + PrismaService + tenant-scoping primitives
│   └── shared/                # Cross-cutting Zod schemas, enums, DTO contracts (frontend + backend)
├── docs/
│   └── architecture/         # This document and its companions
├── package.json               # Workspace root (pnpm workspaces + turbo pipelines)
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json          # Shared compiler options, extended by every package/app
```

`turbo.json` defines `build`/`dev`/`lint`/`typecheck`/`test`/`test:e2e` pipelines with proper
`dependsOn: ["^build"]` ordering so `packages/database` and `packages/shared` always build before
`apps/api`/`apps/web` consume them.

---

## 2. `apps/api` — Top-Level Structure

```
apps/api/
├── src/
│   ├── main.ts                 # Bootstrap: Helmet, CORS, versioning, global pipes/filters, Swagger
│   ├── app.module.ts            # Composition root — imports every bounded context module
│   ├── config/
│   │   ├── configuration.ts      # Namespaced config factory (app/database/redis/auth/ai/...)
│   │   └── env.validation.ts     # Zod schema; ConfigModule.forRoot({ validate }) fails fast on boot
│   ├── common/                  # Cross-cutting concerns shared by every module (§3 below)
│   ├── health/                  # Liveness/readiness probes (Terminus)
│   └── modules/                 # One folder per bounded context (§4 below)
├── test/                        # Jest e2e config
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 3. `src/common` — Cross-Cutting Concerns

| Path | Purpose |
|---|---|
| `common/context/tenant-context.ts` | `AsyncLocalStorage`-backed `TenantContext`, populated per-request (Solution Architecture §8) |
| `common/middleware/tenant-context.middleware.ts` | Decodes the JWT, seeds `TenantContext` before any guard/controller runs |
| `common/guards/jwt-auth.guard.ts` | Global AuthN guard; honors `@Public()` |
| `common/guards/permissions.guard.ts` | RBAC AuthZ guard; reads `@RequirePermission(...)` metadata against the authenticated user's resolved permissions |
| `common/decorators/public.decorator.ts` | `@Public()` — exempts a route from `JwtAuthGuard` |
| `common/decorators/require-permission.decorator.ts` | `@RequirePermission('sprint:read', ...)` |
| `common/decorators/current-user.decorator.ts` | `@CurrentUser()` param decorator |
| `common/filters/all-exceptions.filter.ts` | Normalizes every thrown error into the shared `ApiErrorResponse` shape (`packages/shared`) |
| `common/interceptors/logging.interceptor.ts` | Correlation-id generation/propagation + request timing log |
| `common/logging/winston.config.ts` | Structured JSON logging in production, pretty-printed in development |

All five are wired globally in `app.module.ts` (`APP_GUARD` providers, `NestModule.configure`), so
no bounded context module needs to re-apply them.

---

## 4. `src/modules/<context>` — Per-Bounded-Context Layering

Every bounded context from Solution Architecture §6 got an identical Clean Architecture skeleton:

```
modules/<context>/
├── <context>.module.ts
├── presentation/
│   ├── <context>.controller.ts
│   └── dto/                    # Request/response DTOs (class-validator + Zod)
├── application/
│   ├── commands/                 # CQRS command handlers (writes)
│   ├── queries/                  # CQRS query handlers (reads)
│   └── ports/                    # Interfaces Infrastructure must implement (IAiProvider, etc.)
├── domain/
│   ├── entities/                 # Plain TS classes, zero framework/Prisma imports
│   ├── events/                   # Domain events published within this context
│   └── repositories/              # Repository interfaces (ports) owned by Domain
└── infrastructure/
    ├── repositories/              # Prisma-backed implementations of Domain repository interfaces
    └── mappers/                    # Prisma model <-> Domain entity mappers
```

The 21 modules currently scaffolded (folder + module wiring only — command/query handlers, domain
entities, and repositories are added per-module in their dedicated implementation step):

| Module folder | Bounded Context (Solution Architecture §6) | Built out in |
|---|---|---|
| `iam` | Identity & Tenancy | Step 5 — Authentication Module |
| `sprint` | Project & Sprint | Step 7 — Sprint Intelligence Module |
| `requirement-intelligence` | Requirement Intelligence | Step 7 / Step 8 |
| `test-intelligence` | Test Intelligence | Step 8 — AI Services |
| `coverage` | Coverage & Risk | Step 7 |
| `execution` | Execution | Step 7 |
| `release` | Release Governance | Step 7 |
| `defect` | Defect Intelligence (Phase 2 stub) | — |
| `agents` | Agent Framework | Step 8 — AI Services |
| `ai` | AI Orchestration | Step 8 |
| `ai-governance` | AI Governance | Step 8 |
| `ai-ops` | AI Operations | Step 8 |
| `knowledge` | Knowledge Intelligence | Step 8 |
| `documents` | Document Intelligence | Step 8 |
| `integration` | Integration Hub | Step 9 — APIs |
| `feature-management` | Feature Management | Step 9 |
| `plugins` | Plugin Framework | Future |
| `workflows` | Workflow Engine | Future |
| `realtime` | Realtime & Notification | Step 9 |
| `platform-saas` | SaaS Platform (billing) | Future |
| `platform` | Platform / Audit | Step 9 |

**Dependency rule enforced by this layout:** `presentation` imports only from `application`;
`application` imports only from `domain` and its own `ports`; `infrastructure` imports `domain`
(to implement its repository interfaces) and `@sprintguard/database` (Prisma) — never the other
way around. `domain/` never imports `@nestjs/*` or `@prisma/client`.

---

## 5. `packages/database` — Persistence Layer

```
packages/database/
├── prisma/
│   ├── schema.prisma            # Executable schema (docs/architecture/02-database-design.md)
│   └── sql/
│       └── rls_policies.sql       # Row-Level Security policies, run after `prisma migrate deploy`
├── src/
│   ├── prisma.service.ts          # Injectable PrismaClient wrapper + withTenant() (SET LOCAL for RLS)
│   ├── tenant-scoped.repository.ts # Base class: merges { organizationId } into every query
│   ├── database.module.ts          # @Global() module exporting PrismaService
│   └── index.ts                    # Barrel: re-exports @prisma/client types + the above
└── package.json
```

`PrismaService` is the **only** place `PrismaClient` is instantiated — every Infrastructure
repository across every bounded context module injects `PrismaService`, never imports
`@prisma/client`'s `PrismaClient` directly, keeping the Solution Architecture §7 dependency rule
enforceable by code review (`grep -r "new PrismaClient" apps/` should only ever match this file).

---

## 6. `packages/shared` — Cross-Cutting Contracts

```
packages/shared/
├── src/
│   ├── pagination.ts       # Shared pagination query schema (Zod) + PaginatedResult<T>
│   ├── api-envelope.ts     # ApiSuccessResponse<T> / ApiErrorResponse
│   ├── enums.ts             # Plain-TS mirrors of Prisma enums, so apps/web never depends on @prisma/client
│   └── index.ts
└── package.json
```

This package is imported by **both** `apps/api` (for request/response typing) and `apps/web`
(Step 4), which is the mechanism behind "typed contracts end-to-end" in Solution Architecture §28 —
a Zod schema defined once here validates on the server and types the client without duplication.

---

## 7. What's Deliberately Not Here Yet

Per the incremental build sequence, the following are intentionally left as empty
`application/`, `domain/`, `infrastructure/` folders (present, but only containing a one-line
placeholder `index.ts`) until their dedicated step:

- Command/Query handlers and domain entities for every module (Steps 5–9)
- `JwtStrategy`/`PassportModule` registration inside `iam` (Step 5) — `JwtAuthGuard` is already
  wired globally in `app.module.ts`, but the `'jwt'` Passport strategy it delegates to is added
  when the Authentication Module is implemented
- BullMQ queue/processor registration (Step 8, alongside the Agent Runtime)
- OpenTelemetry SDK bootstrap (Step 11 — Deployment)
- Any actual LLM provider adapter code (Step 8)

---

## 8. Next Artifact

4. ⏭ Frontend Folder Structure — `apps/web` (Next.js 15 App Router), mirroring `packages/shared`
   contracts and consuming the API surface this backend structure exposes.
