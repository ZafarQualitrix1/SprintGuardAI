# SprintGuard AI — Testing Strategy

Status: Draft v1.0 · Owner: Platform Architecture · Last updated: 2026-07-22

Companion to [01-solution-architecture.md](01-solution-architecture.md) §12 (Testing Strategy is
listed there as a later build-sequence deliverable) and to the CI pipeline in
[../../.github/workflows/ci.yml](../../.github/workflows/ci.yml). Documents what is actually
tested today, the tools/patterns behind each layer, and what's explicitly deferred.

---

## 1. Test Pyramid

```
        ┌─────────────────────┐
        │   E2E (HTTP layer)   │   apps/api/test/*.e2e-spec.ts — supertest + real AppModule,
        │                       │   mocked PrismaService only
        ├───────────────────────┤
        │  Component / Store /  │   apps/web/**/*.test.tsx — Vitest + React Testing Library
        │  Schema (frontend)    │
        ├───────────────────────┤
        │      Unit tests        │  apps/api/**/*.spec.ts — pure functions, single classes,
        │  (bulk of coverage)     │  mocked collaborators
        └─────────────────────────┘
```

The heaviest layer is deliberately the bottom: pure application-layer logic (coverage computation,
readiness scoring, prompt rendering, JSON extraction, confidence scoring, Jira reference parsing,
status mapping) is unit-tested directly, with no framework or I/O involved — fast, deterministic,
and the cheapest tests to write and maintain. The E2E layer only needs to prove the HTTP plumbing
(guards, validation, versioning, RBAC, CQRS dispatch) is wired correctly; it deliberately does not
re-verify business logic already covered by unit tests underneath it.

---

## 2. Backend — Unit Tests (`apps/api/src/**/*.spec.ts`)

**Tooling:** Jest + ts-jest, configured via the `"jest"` key in `apps/api/package.json`
(`rootDir: "src"`, `testRegex: ".*\\.spec\\.ts$"`).

**Run:** `pnpm --filter @sprintguard/api test` (or `test:watch` / `test:cov`).

**What's covered (54 tests across 11 files as of this writing):**

| Area | File(s) | What's verified |
|---|---|---|
| Jira connector | `integration/infrastructure/connectors/jira-*.spec.ts` | Reference parsing (URL/id), credential verification, sprint/issue fetch + pagination, ADF→text extraction, error paths |
| Credential Vault | `integration/infrastructure/services/aes-credential-vault.service.spec.ts` | Encrypt/decrypt round-trip, random IV (no ciphertext reuse), tamper detection (GCM auth tag), cross-key isolation |
| Sprint import mapping | `sprint/application/commands/import-sprint-from-jira.command.spec.ts` | Jira status → `StoryStatus` heuristic mapping |
| AI utilities | `ai/application/utils/*.spec.ts` | Prompt template substitution, defensive JSON extraction (fences/prose recovery), confidence scoring |
| AI orchestration | `ai/application/services/ai-orchestration.service.spec.ts` | Happy path, repair-retry on invalid JSON, exhausted-retry → `FLAGGED_FOR_REVIEW` |
| Gemini adapter | `ai/infrastructure/providers/gemini-provider.service.spec.ts` | SDK call shape, usage-metadata mapping, missing-API-key error |
| Coverage computation | `coverage/application/utils/compute-coverage.util.spec.ts` | Full COVERED/PARTIALLY_COVERED/NOT_COVERED matrix, gap generation, overall percentage |
| Release readiness | `release/application/utils/compute-readiness.util.spec.ts` | Weighted formula, rounding, clamping |

**Pattern:** every spec either tests a pure function directly, or constructs the class under test
with hand-written mock collaborators (no DI container, no framework bootstrap) — kept intentionally
lightweight since NestJS's `Test.createTestingModule` is reserved for the E2E layer where the DI
graph itself is part of what's being verified.

**Not yet unit-tested (documented gap, not an oversight):** command/query handlers that are thin
orchestration over 2-3 repository calls (e.g. `CreateProjectHandler`, `RegisterOrganizationHandler`)
are exercised indirectly through the E2E suite instead — a dedicated unit test would mostly
re-assert "calls the mock in the order the code calls it," which the E2E test already proves via
real HTTP responses.

---

## 3. Backend — E2E Tests (`apps/api/test/*.e2e-spec.ts`)

**Tooling:** Jest + ts-jest + supertest, separate config at `apps/api/test/jest-e2e.json`.

**Run:** `pnpm --filter @sprintguard/api test:e2e`.

**Approach — mocked persistence, real everything else:** every E2E spec boots the actual
`AppModule` (`test/utils/create-test-app.ts`) — every guard (`JwtAuthGuard`, `PermissionsGuard`,
`ThrottlerGuard`), pipe (`ValidationPipe`), filter (`AllExceptionsFilter`), the global prefix/URI
versioning, `TenantContextMiddleware`, and the full CQRS command/query bus — with only
`PrismaService` replaced by a deep mock (`jest-mock-extended`'s `mockDeep<PrismaService>()`). This
proves the HTTP request pipeline end-to-end (a request really is rejected with 401/403 by the real
guards, DTOs are really validated, routes are really versioned/prefixed) without needing a live
Postgres — while intentionally *not* re-testing repository/business logic already covered by unit
tests.

**The one non-obvious pattern worth knowing:** Prisma's interactive `$transaction(callback)` form
invokes the callback with the transaction client. A naive deep mock leaves that callback receiving
an *unconfigured* second mock. `create-test-app.ts` fixes this by making `$transaction`
self-referential:

```ts
(prismaMock.$transaction as unknown as jest.Mock).mockImplementation((arg) =>
  typeof arg === 'function' ? arg(prismaMock) : Promise.all(arg),
);
```

Any repository code that does `this.prisma.$transaction(async (tx) => tx.model.create(...))` then
operates against the same configured mock. `test/utils/mock-data.ts` centralizes fixture builders
(`buildUserRow`, `buildMembershipRow`) that match the exact Prisma `include` shape each mapper
expects, so a schema/mapper change only needs updating in one place.

**Current coverage (10 tests across 3 files):**

| Spec | Covers |
|---|---|
| `health.e2e-spec.ts` | Public, version-neutral health route; 404 on an unversioned non-health route |
| `auth.e2e-spec.ts` | Register → session + `Set-Cookie` refresh token; DTO validation rejects before touching the DB; login 401 on unknown email; `/me` 401 without a bearer token |
| `projects.e2e-spec.ts` | List/create happy paths; 403 when the caller's role lacks `sprint:write`; 401 when the JWT's `orgId` no longer matches the caller's current membership |

**Deferred:** true database-integration tests (real Postgres via Testcontainers or a CI service
container, exercising actual repository SQL/Prisma query correctness) are a documented future
addition — this sandbox had no Docker/Postgres available to build and verify them against. The unit
tests already cover the deterministic logic; what's *not* covered yet is "does the actual SQL Prisma
generates for e.g. `PrismaCoverageRepository.replaceForSprint` behave correctly against a real
database," which the mocked E2E layer cannot prove.

---

## 4. Frontend — Component/Store/Schema Tests (`apps/web/src/**/*.test.{ts,tsx}`)

**Tooling:** Vitest + `@testing-library/react` + `@testing-library/jest-dom`, config at
`apps/web/vitest.config.ts` (jsdom environment, `@/*` path alias matching `tsconfig.json`).

**Run:** `pnpm --filter @sprintguard/web test` (or `test:watch`).

**Current coverage (11 tests across 3 files) — one example per test type, establishing the pattern:**

| File | Type | What's verified |
|---|---|---|
| `features/analytics/components/summary-card.test.tsx` | Component | Renders label/value; shows a skeleton instead of the value while loading; renders an optional hint |
| `stores/auth-store.test.ts` | Zustand store | `setSession`/`clearSession` mutate state correctly, starting state is empty |
| `features/auth/login-schema.test.ts` | Shared Zod schema | `loginSchema`/`registerSchema` (from `@sprintguard/shared`) accept valid input and reject invalid email/short password/short org name |

**Deferred:** full page-level integration tests (e.g. rendering `LoginPage`, filling the form via
`@testing-library/user-event`, asserting the mutation fires) are a natural next addition once more
pages stabilize — the three test types above were chosen specifically to establish the pattern
(component, state, validation) rather than chase coverage percentage this pass.

---

## 5. CI Gates

`.github/workflows/ci.yml` runs on every push/PR, in order, against real ephemeral Postgres +
Redis service containers:

1. Install (`pnpm install --frozen-lockfile`)
2. `prisma generate` → `prisma migrate deploy` → `prisma db seed` (validates the schema/migrations
   themselves apply cleanly to a fresh database on every run, even though the API tests above don't
   hit that database directly)
3. `pnpm turbo run typecheck` (all packages/apps)
4. `pnpm turbo run lint` (all packages/apps)
5. `pnpm --filter @sprintguard/api test -- --ci --coverage` (backend unit tests)
6. `pnpm --filter @sprintguard/api test:e2e` (backend E2E, mocked persistence)
7. `pnpm --filter @sprintguard/web test` (frontend component/store/schema tests)
8. `pnpm turbo run build` (all packages/apps)

---

## 6. Known Environment Gotchas (worth knowing before debugging blind)

- **Stale `tsconfig.tsbuildinfo`**: manually running `tsc` with a different `--outDir` against the
  same project can corrupt incremental build state such that a later `nest build` silently omits
  `main.js`. `apps/api/tsconfig.json` sets `"incremental": false` specifically to avoid this class
  of bug recurring.
- **`output: 'standalone'` (Next.js) + pnpm on Windows**: Next's build-time dependency tracing
  creates symlinks into pnpm's `.pnpm` store, which fails with `EPERM` on Windows without Developer
  Mode's elevated symlink privilege. `next.config.mjs` gates `output: 'standalone'` behind a
  `DOCKER_BUILD` environment variable set only inside `apps/web/Dockerfile`, so local
  `next build`/`pnpm build` always use the normal (non-standalone) output and work everywhere; the
  Docker image is the only place standalone output is actually produced.
- **ts-jest + pnpm symlinked workspace packages**: a `transform` pattern matching `.js` files
  (`^.+\\.(t|j)s$`) causes ts-jest to attempt (harmlessly, but noisily) to compile already-built
  `.js` output from `packages/database/dist` when Jest resolves it through the workspace's
  `node_modules` symlink. Both `apps/api/package.json`'s `jest` config and
  `apps/api/test/jest-e2e.json` restrict `transform` to `^.+\\.ts$` only.

---

## 7. Next Artifact

13. ✅ [Production Checklist](06-production-checklist.md) — the final build-sequence deliverable,
    consolidating everything from Steps 1–12 into a go/no-go list before a real production
    deployment.
