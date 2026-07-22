# SprintGuard AI — Production Checklist

Status: Draft v1.0 · Owner: Platform Architecture · Last updated: 2026-07-21

Final artifact in the 13-step build sequence. Consolidates Steps 1–12 into a **go/no-go list**
for a real production deployment. This document is intentionally blunt: it separates what has
been *built and verified in this sandbox* from what has been *built but not verified against real
infrastructure* from what is *not built at all* (Phase 2+ per
[02-database-design.md](02-database-design.md)'s own MVP/Phase labeling). Treat every "✗ Not
done" and "⚠ Unverified" row below as a launch blocker unless a named owner explicitly accepts
the risk.

---

## 1. How to read this document

- **✅ Done & verified** — code exists, and this sandbox proved it works (typecheck, build,
  unit/e2e test, or a real network call).
- **⚠ Built, not verified against real infra** — code exists and passes tests against mocks, but
  has never run against a live Postgres, Redis, Docker daemon, or CI runner, because none were
  available in this sandbox. **This is the single largest category of risk in this document** —
  nothing here has failed, but nothing here has actually run for real either.
- **✗ Not implemented** — described in the architecture docs as a capability, but no code exists
  yet. Cross-referenced to its Phase label where one exists.

---

## 2. Go/No-Go Summary

| Gate | Status | Blocking? |
|---|---|---|
| Core auth, RBAC, multi-tenancy (org-scoped queries) | ✅ Done & verified (mocked persistence) | Verify against real Postgres first |
| Postgres RLS policies actually enforced | ⚠ Written, never executed against a live DB | **Yes** |
| Core domain flows (Sprint import, Requirement/AC/Test generation, Coverage, Execution, Release) | ✅ Done & verified (mocked persistence) | Verify against real Postgres/Redis first |
| AI provider calls (Claude/OpenAI/Gemini) | ⚠ Claude/OpenAI code paths never called with a live key in this sandbox; Gemini called live but blocked by `429`/quota=0 | **Yes** — no AI path has completed a real end-to-end call |
| Audit logging | ✗ Not implemented — table exists, nothing writes to it | **Yes** |
| Async/background job processing (BullMQ) | ✗ Not implemented — installed, unused | **Yes**, if you need non-blocking AI/import calls at any real scale |
| Observability (OpenTelemetry tracing, metrics, dashboards) | ✗ Not implemented — installed, unused | **Yes** |
| Docker images build & run | ⚠ Dockerfiles written, `docker build`/`docker run` never executed (no Docker daemon in this sandbox) | **Yes** |
| CI pipeline (GitHub Actions) | ⚠ Workflow YAML written, never executed on GitHub | **Yes** |
| Secrets management | ✗ Plain `.env` files only, no vault/KMS | **Yes** |
| Frontend feature completeness | ⚠ Auth + Dashboard + Sprint/Requirement/Test/Coverage/Execution/Release UI done; 7 pages are still literal "Coming soon" stubs | Depends on launch scope |

**Overall: NO-GO for production as-is.** The codebase is a genuinely working, well-tested MVP
*against mocks*. It has never been exercised against a real database, real cache, a real container
runtime, or a real CI runner. Section 4 is the literal punch list to close before that changes.

---

## 3. What's genuinely production-ready today

These have passing automated tests and/or a real (non-mocked) verification in this sandbox:

- **Authentication & session management** — Argon2id hashing, JWT access + rotating opaque
  refresh tokens (SHA-256 hashed at rest), register/login/refresh/logout/me — covered by
  `apps/api/test/auth.e2e-spec.ts` and IAM unit tests.
- **RBAC + tenant isolation logic** — `PermissionsGuard`, `TenantContextMiddleware`, role/permission
  seed data — covered by `apps/api/test/projects.e2e-spec.ts` (403 on missing permission, 401 on
  stale org membership).
- **Sprint/Requirement/Test Intelligence/Coverage/Execution/Release domain logic** — all pure
  business logic (coverage matrix computation, readiness scoring, Jira status mapping, JSON
  extraction/repair, confidence scoring) is unit-tested directly with no I/O — see
  [05-testing-strategy.md](05-testing-strategy.md) §2.
- **Jira connector** — reference parsing, credential verification, paginated fetch, ADF→text
  extraction all unit-tested; AES-256-GCM credential vault has a verified encrypt/decrypt round
  trip, tamper detection, and cross-key isolation.
- **Gemini connectivity** — a live network call was actually made against the user's API key: auth
  succeeded and `ListModels` returned 40+ real models, proving the key and network path work.
  `generateContent` itself is currently blocked by a `429`/quota=0 response on the free tier — an
  account/billing configuration issue, not a code defect (see §5).
- **Database schema & seed** — `prisma migrate deploy` + `prisma db seed` are wired into
  `.github/workflows/ci.yml` against a real ephemeral Postgres+pgvector container, but that
  workflow has never actually executed on GitHub (§4.3).

---

## 4. Blocking checklist (must close before launch)

### 4.1 Real infrastructure verification
- [ ] Run every migration in `packages/database/prisma/migrations/` against a real Postgres 16
      instance from a clean state; confirm `prisma db seed` completes.
- [ ] Execute `packages/database/prisma/sql/rls_policies.sql` against that database and write at
      least one test proving a query from Org A cannot read Org B's rows even if application code
      forgets a `WHERE organizationId = ...` clause. **Currently never run — RLS exists only as a
      SQL file, not an enforced control.**
- [ ] Point the API at that real Postgres + a real Redis instance and run the full e2e suite a
      second time with `PrismaService` *not* mocked (a true integration pass), per the deferred
      item already flagged in [05-testing-strategy.md](05-testing-strategy.md) §3.
- [ ] `docker build` both `apps/api/Dockerfile` and `apps/web/Dockerfile`, then `docker compose up`
      the full stack and hit `/api/health/ready` for real. No Docker daemon was available in this
      sandbox — these files have never been built, only reviewed.
- [ ] Push to a real GitHub repo and let `.github/workflows/ci.yml` and `docker-build.yml` execute
      at least once; fix whatever the ephemeral-container environment surfaces that this sandbox
      couldn't.

### 4.2 AI path
- [ ] Resolve the Gemini quota issue (enable billing on the Google Cloud project, or drop Gemini
      as a launch-time provider and rely on Claude/OpenAI) — confirmed root cause is account
      configuration, not code (see §5).
- [ ] Make at least one real, non-mocked `generateContent`/completion call against Claude and
      OpenAI too — neither has been called with a live key in this sandbox; only Gemini's
      reachability was actually tested.
- [ ] Decide on a cost ceiling / budget alert before enabling any provider in production —
      `AiUsageMetric` exists in the schema but nothing currently consumes it to enforce a cap.

### 4.3 Audit logging (currently a compliance gap)
- [ ] `AuditLog` is a real Prisma model but **no code anywhere writes to it** — confirmed by
      search: zero references to `auditLog` in `apps/api/src`. Every mutating command handler
      (register, login, project/sprint create, sprint import, requirement/test generation,
      execution recording, release computation) currently produces no audit trail. This must be
      closed before any customer relying on audit/compliance guarantees goes live — implement it
      as a CQRS event subscriber or an interceptor on mutating commands, not scattered manual calls.

### 4.4 Async processing
- [ ] `bullmq`/`@nestjs/bullmq` are installed dependencies with **zero actual queues or
      processors** wired up. Every current operation (Jira sprint import, requirement/AC
      generation, test scenario/case generation, release summary generation) runs synchronously
      inside the HTTP request/response cycle. This works for demo-scale data but will time out or
      block the event loop under real sprint sizes (100+ issues) or slow LLM latency. Decide before
      launch whether to (a) move these to real BullMQ jobs with a polling/websocket status API, or
      (b) explicitly accept synchronous execution for v1 with a documented request timeout budget.

### 4.5 Observability
- [ ] `@opentelemetry/api` and `@opentelemetry/sdk-node` are installed but **never
      bootstrapped** — no `NodeSDK` initialization exists anywhere in `apps/api/src`, including
      `main.ts`. There are currently no traces, no metrics, and no dashboards in production, despite
      [01-solution-architecture.md](01-solution-architecture.md) §26 describing this as a first-class
      capability. Winston structured logging *is* wired up and real (`common/logging/winston.config.ts`)
      — that is the only observability signal that actually exists today.
- [ ] No circuit breaker exists for LLM provider calls or the Jira connector (no `opossum` or
      equivalent anywhere in `apps/api`) — a slow/down provider currently degrades every caller
      synchronously rather than failing fast.
- [ ] No alerting/synthetic monitoring configured for `/api/health/live` / `/api/health/ready`.

### 4.6 Secrets & security hardening
- [ ] Move `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, and every AI
      provider key out of plain `.env` files into a real secrets manager (cloud KMS/Vault) before
      any production deployment — the current `.env` is a local development convenience only and
      must never be the source of production secrets.
- [ ] Rotate the Gemini API key currently in the local `.env` before any production use, since it
      was shared in plaintext during this build session.
- [ ] Add dependency/secret scanning to CI (Dependabot or equivalent) — not currently configured.
- [ ] Review Helmet/CORS defaults and add a real Content-Security-Policy for the frontend origin;
      current config uses framework defaults only, not a hardened policy.
- [ ] Implement the backend half of password reset — the `forgot-password` frontend page and any
      `/auth/forgot-password` endpoint do not exist yet (confirmed: no "forgot"/"reset" reference
      anywhere in `apps/api/src/modules/iam`).

### 4.7 Deployment topology
- [ ] `docker-compose.yml` is the only deployment artifact — there are no Kubernetes
      manifests/Helm charts, despite [01-solution-architecture.md](01-solution-architecture.md) §27
      describing a Kubernetes target. Decide the real launch topology (Compose on a single VM vs.
      K8s) before writing infra-as-code, rather than assuming the architecture doc's aspirational
      target.
- [ ] No backup/restore or disaster-recovery procedure exists for Postgres in this repo (relies on
      whatever the hosting provider offers) — document and test a real restore before launch.

---

## 5. Explicitly deferred to Phase 2+ (not blocking, but must be communicated to customers/sales)

Matches the Phase labeling already established in
[02-database-design.md](02-database-design.md). None of these are half-built; each is a clean
`providers: []` stub controller with no routes, confirmed by direct inspection:

- Knowledge Graph / Knowledge Intelligence (`modules/knowledge`)
- Document Intelligence (`modules/documents`)
- Feature Management / flags & experiments (`modules/feature-management`)
- Plugin framework (`modules/plugins`)
- Workflow engine (`modules/workflows`)
- SaaS billing/subscription platform (`modules/platform-saas`)
- AI Governance (prompt approval workflow) (`modules/ai-governance`)
- AI Operations dashboards (`modules/ai-ops`)
- Rich multi-agent orchestration framework beyond the 3 implemented agents (Requirement
  Intelligence, Test Scenario, Test Case) — `modules/agents` is a stub; the real orchestration
  lives in `modules/ai`'s `AiOrchestrationService`.
- Defect intelligence module (`modules/defect`)
- Realtime/WebSocket layer (`modules/realtime`) — no `@WebSocketGateway` exists anywhere
- GraphQL API — REST-only today; no `@nestjs/graphql` usage anywhere
- Additional integration connectors (Linear, Azure DevOps, GitHub, Slack, Teams, Confluence,
  Notion, TestRail, Xray, Zephyr) — only Jira is implemented
- Frontend pages still showing a literal "Coming soon" placeholder: Story Intelligence detail page,
  Admin, Settings → Profile/AI/Prompts/Organization, Analytics, Forgot Password

Recommendation: ship v1 explicitly scoped to the "✅ Done & verified" + "⚠ Unverified-but-built"
capability set, and communicate the Phase 2+ list above as a public roadmap rather than silently
absent functionality.

---

## 6. Non-engineering gates (owner: business/legal, not this checklist's scope to close)

- [ ] Terms of Service / Privacy Policy review, especially given customer sprint data is sent to
      third-party AI providers (Anthropic/OpenAI/Google) — data processing agreements needed.
- [ ] GDPR/data-residency posture — no export/delete-my-data workflow exists yet; `Organization`/
      `User` deletion cascades are schema-level only, untested end-to-end.
- [ ] Accessibility (a11y) audit of the frontend — not performed.
- [ ] Load/performance testing — not performed at any layer.

---

## 7. Recommended launch sequencing

1. Close §4.1 (real infra) and §4.3 (audit logging) first — these are the two gaps most likely to
   surface silent data-integrity or compliance problems post-launch.
2. Close §4.5 (observability) before any real traffic — without it, diagnosing a production
   incident in a system this architecturally deep (21 modules, CQRS, multi-provider AI) is
   impractical.
3. Decide §4.4 (async processing) based on expected sprint sizes — small pilot customers may
   tolerate synchronous calls; do not assume this scales without deciding explicitly.
4. Resolve §4.2 (AI provider billing/quota) and §4.6 (secrets) before onboarding the first real
   customer, not after.
5. Treat §5 (Phase 2+ stubs) as a roadmap conversation with early customers, not a blocker to a
   scoped v1 launch.

---

*This closes the 13-step build sequence: Solution Architecture → Database Design → Backend
Structure → Frontend Structure → Authentication → Dashboard → Sprint Intelligence → AI Services →
APIs → UI Components → Deployment → Testing Strategy → Production Checklist.*
