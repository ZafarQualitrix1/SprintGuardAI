# SprintGuard AI — UAT & Production Environment Isolation

Status: Draft v1.0 · Owner: Platform Architecture · Last updated: 2026-07-29

Companion to [06-production-checklist.md](06-production-checklist.md). That document is the
go/no-go feature checklist; this one is the deployment topology — how `uat` and `master` map to
Vercel and Supabase, how they stay isolated, and how a change moves safely from a developer's
laptop to production. Written from a direct audit of the live repo and the live Vercel account, not
from the aspirational workflow alone — §1 records what was actually found and fixed.

---

## 1. Audit findings (2026-07-29) and what changed

Before this document, the real infrastructure did not match the intended workflow. What was found,
and what this change set does about it:

| Finding | Fix |
|---|---|
| None of the 4 Vercel projects were connected to GitHub — all deploys so far were manual `vercel deploy` CLI runs. "Push → auto-deploy" did not exist. | Documented as the required manual runbook in §4.3 — connecting real GitHub webhooks can trigger an immediate deployment, so this is a hands-on dashboard step, not something applied blind. |
| GitHub's default branch is `main`, 2 commits behind. `master` and `uat` were already identical (`4ccdba2`) — `master` had been pushed to directly, not merged via PR. | **Decision: `master` is production going forward**; `main` is legacy (left alone, not deleted). |
| `apps/api/.vercel/project.json` was linked to `sprintguardai-api-prod` while the repo was checked out on the UAT branch — a live footgun (a bare `vercel deploy` from `apps/api` would have shipped to production). | Fixed — relinked to `sprintguardai-api-uat`, matching `apps/web`'s (already-correct) link. Redundant root-level `.vercel/` link removed entirely. |
| `sprintguardai-api-uat`'s cached Build Command was missing the `ncc` bundling step that `sprintguardai-api-prod` had; the two projects' settings had drifted. | Fixed — both projects reset to **Auto** for Build/Install Command via `vercel project update --auto-detect`, so `apps/api/vercel.json` (committed, identical on both branches) is now the single source of truth. Can't drift again. |
| CI (`ci.yml`) only ran on push to `main`; `docker-build.yml` chained off that. Neither referenced `uat`/`master`. | Fixed — both retargeted to `[uat, master]`. |
| No migration promotion pipeline existed. | Added `.github/workflows/db-migrate.yml` — see §6. |
| No branch protection existed. | Documented exact settings in §3.2 — requires repo-admin access this session doesn't have. |

---

## 1.1 Incident: login/signup broken on both UAT and Production (2026-07-29)

Reported symptom: signup/login didn't work on either the UAT or Production **web app**. Root-caused
by testing the API directly first (register/login against `sprintguardai-api-uat.vercel.app`
succeeded immediately — the backend and its Supabase connection were never the problem), then
inspecting what the deployed frontends actually shipped:

- **`sprintguardai_uat` and `sprintguardai_prod` had zero environment variables configured** —
  confirmed via `vercel env ls production` on both (`No Environment Variables found`). Next.js bakes
  `NEXT_PUBLIC_*` vars in at *build* time; with nothing set, both frontends built with
  `apps/web/src/lib/api-client.ts`'s dev fallback, `http://localhost:3001/api/v1`. Confirmed by
  pulling the live JS bundle and finding the literal string baked into
  `chunks/822-*.js` on both sites — every login/signup click in a real browser was trying to reach
  the visitor's own `localhost`, which obviously doesn't exist.
- **`sprintguardai-api-prod` had never been deployed** — `vercel ls sprintguardai-api-prod` returned
  no deployments at all, and the production URL 404'd with `DEPLOYMENT_NOT_FOUND`. Production had no
  running backend to call even once the frontend was pointed at the right URL.

**Fix applied and verified this session:**
1. Set `NEXT_PUBLIC_API_URL=https://sprintguardai-api-uat.vercel.app/api/v1` on `sprintguardai_uat`
   (Production scope) and redeployed — required, since the old build had it baked in.
2. Deployed `sprintguardai-api-prod` for the first time (`vercel deploy --prod`) — its env vars
   (`DATABASE_URL`, JWT secrets, etc.) were already correctly configured, just never used.
3. Set `NEXT_PUBLIC_API_URL=https://sprintguardai-api-prod.vercel.app/api/v1` on `sprintguardai_prod`
   and redeployed.
4. Re-pulled both live bundles to confirm they now reference the correct API host (no more
   `localhost:3001`).
5. Verified end-to-end with real HTTP calls carrying the matching `Origin` header (i.e. simulating
   an actual browser, not just hitting the API directly) — **register and login both returned
   200/201 with a valid access token and `Set-Cookie: refresh_token=...; Secure; HttpOnly` on both
   `sprintguardai-api-uat.vercel.app` and `sprintguardai-api-prod.vercel.app`.** CORS (`WEB_URL`
   in `bootstrap.ts`) allowed both origins correctly.

**Known follow-up gap, not blocking login/signup:** `/api/health/ready` still returns `503` on both
API projects. Both `PrismaHealthIndicator` and `RedisHealthIndicator` run for readiness
(`apps/api/src/health/health.controller.ts`), and `REDIS_URL` on both Vercel projects is set to
`redis://localhost:6379` — a local-dev placeholder, unreachable from Vercel. Register/login don't
touch Redis (BullMQ is installed but unwired, per
[06-production-checklist.md](06-production-checklist.md) §4.4), so this doesn't block auth, but it
will make `/api/health/ready` lie to any uptime monitor pointed at it. Fix by provisioning a real
reachable Redis per environment (Upstash has a native Vercel integration) — not done this session,
flagged as a real gap.

**Operational note for future manual `vercel deploy` runs:** both API/web projects have their
dashboard `Root Directory` set to `apps/web`/`apps/api` (needed once Git integration is connected,
§4.3), but `apps/web/.vercel` and `apps/api/.vercel` are linked *inside* those same subfolders.
Running `vercel deploy` from within the subfolder (or with `--cwd` pointed at it) doubles the path
(`apps/web/apps/web`) and fails. Work around it by temporarily linking the **repo root** to the
target project instead: `vercel link --yes --project <name> --cwd <repo-root>` followed by
`vercel deploy --prod --cwd <repo-root>`, then remove the root-level `.vercel/` link afterward so it
doesn't linger pointed at whichever project was deployed last (`apps/web/.vercel` and
`apps/api/.vercel` stay untouched by this — they should always point at the `*_uat` projects as the
local dev default).

---

## 2. Branch → Vercel project → Supabase project mapping

This is the ground truth. Every other section derives from this table.

| Git branch | Vercel project (web) | Vercel project (api) | Supabase project | Postgres ref |
|---|---|---|---|---|
| `master` | `sprintguardai_prod` → `sprintguardaiprod.vercel.app` | `sprintguardai-api-prod` | `SprintGuardAI` | `yzhtgtsjalvrdjxeakke` |
| `uat` | `sprintguardai_uat` → `sprintguardaiuat.vercel.app` | `sprintguardai-api-uat` → `sprintguardai-api-uat.vercel.app` | `SprintGuardAI_UAT` | `rtbwmsldqtmvgxxkoidr` |

Both API projects have `Root Directory = apps/api`; both web projects have
`Root Directory = apps/web` — same monorepo, four independently-configured projects, no shared
build artifacts or settings between prod and UAT.

**On "Supabase isolation":** this codebase uses Supabase purely as hosted Postgres, reached through
Prisma's `DATABASE_URL` (confirmed: no `@supabase/*` SDK usage anywhere in `apps/` or `packages/`).
Auth is custom (Argon2id + JWT, `apps/api/src/modules/iam`), there's no Supabase Storage or Edge
Function usage. The two Supabase *projects* above are already fully separate Postgres instances —
different project refs, different hosts, different credentials — so database isolation (Rule 1/2)
is real today at the DB layer. Supabase Auth/Storage/Edge Functions/RLS-enforcement don't apply to
the current architecture; if adopted later, replicate the same one-project-per-environment pattern
and add their keys to §5's variable table.

---

## 3. Git strategy

```
master  (protected, merge-only, = Production)
  ▲
  │ PR + review + passing CI
  │
uat     (protected on PRs, = UAT / integration)
  ▲
  │ PR + passing CI
  │
feature/*  (developer branches, cloned from uat)
```

Developers clone `uat`, branch `feature/*` off it, open a PR back into `uat`. QA validates in the
live UAT deployment. Once approved, `uat` is merged into `master` via PR — that merge is the only
thing that reaches production. **Nobody pushes to `master` directly.**

### 3.1 Recommended (optional) cleanup

- GitHub's default branch is currently `main`. Since devs always start from `uat`, consider changing
  the repo default branch to `uat` (Settings → General → Default branch) so `git clone` and new PRs
  target the right place by default. Not required — `main` can stay untouched indefinitely — but
  worth doing once `main` has no open PRs against it.
- Local branch `UAT` (uppercase) now tracks `origin/uat` (fixed this session). Renaming it to
  lowercase `uat` (`git branch -m UAT uat`) is optional cosmetic consistency, not a functional issue.

### 3.2 Branch protection (apply via GitHub UI — repo admin access required, not available from
this session)

**`master`** — Settings → Branches → Add rule → branch name pattern `master`:
- Require a pull request before merging (require at least 1 approval)
- Require status checks to pass before merging → select the `test` job from `CI`
- Require branches to be up to date before merging
- Do not allow bypassing the above settings (applies to admins too)
- Restrict who can push to matching branches (empty allow-list = nobody pushes directly)
- Block force pushes; block deletions

**`uat`** — same rule shape, branch name pattern `uat`, but approvals can be 0–1 depending on team
size; the non-negotiable part is the required `CI` status check and blocked force-push/deletion.

Equivalent via API, once you have `gh` authenticated with repo-admin scope:
```bash
gh api repos/ZafarQualitrix1/SprintGuardAI/branches/master/protection -X PUT --input - <<'JSON'
{
  "required_status_checks": {"strict": true, "contexts": ["test"]},
  "enforce_admins": true,
  "required_pull_request_reviews": {"required_approving_review_count": 1},
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```
(repeat with `branches/uat/protection`, dropping `enforce_admins` / lowering review count if desired.)

---

## 4. Vercel configuration

### 4.1 Per-project settings (already correct as of this audit)

| Setting | `sprintguardai_prod` / `sprintguardai_uat` | `sprintguardai-api-prod` / `sprintguardai-api-uat` |
|---|---|---|
| Root Directory | `apps/web` | `apps/api` |
| Framework Preset | Next.js (auto) | NestJS (auto) |
| Build/Install Command | Auto-detected (no `vercel.json` in `apps/web`, Next.js defaults apply) | Auto-detected from committed `apps/api/vercel.json` (installs with `pnpm install --prod=false`, builds Prisma client + Nest app, then `ncc`-bundles `dist/serverless.js` → `dist-bundle/`, per the comment in `apps/api/api/index.js`) |

### 4.2 The isolation mechanism: Ignored Build Step

All four projects will connect to the **same** GitHub repository (§4.3) — the thing that makes
"only `uat` pushes deploy `sprintguardai_uat`" actually true isn't the repo connection itself (that
alone would preview-deploy every branch on every project), it's each project's **Ignored Build
Step** (Project Settings → Git → Ignored Build Step). Paste the matching one-liner into each
project. Vercel's convention: exit code `0` skips the build, non-zero proceeds — so each project
*refuses to build* for every branch except its own, no matter what triggers it:

```bash
# sprintguardai_prod AND sprintguardai-api-prod
if [ "$VERCEL_GIT_COMMIT_REF" == "master" ]; then exit 1; else exit 0; fi

# sprintguardai_uat AND sprintguardai-api-uat
if [ "$VERCEL_GIT_COMMIT_REF" == "uat" ]; then exit 1; else exit 0; fi
```

This is what makes Rule 3 ("UAT deployment can never overwrite Production" etc.) structural rather
than procedural — even a stray push or a misconfigured PR can't cause cross-deployment, because the
non-matching project's build simply never runs.

### 4.3 Manual runbook — connecting Git (do this per project, in this exact order)

Not done this session: connecting a live GitHub webhook to 4 real projects can trigger an immediate
deployment, and this Vercel CLI version has no flag to set Production Branch — so a partial CLI
attempt would leave a project connected but pointed at the wrong branch. Do each project fully
before moving to the next:

1. **Project Settings → Git → Connect** → select `ZafarQualitrix1/SprintGuardAI`.
2. **Project Settings → Git → Production Branch** → set to `master` (for the two `*prod` projects)
   or `uat` (for the two `*uat` projects). Do this immediately after connecting, before any push.
3. **Project Settings → Git → Ignored Build Step** → paste the matching script from §4.2.

Repeat for all 4 projects. Only after all 4 have their Ignored Build Step in place should you push
to `uat` or `master` to test the pipeline end-to-end (§10).

---

## 5. Environment variables

Both apps are 100% environment-variable driven — confirmed by direct code read:
`apps/api/src/config/env.validation.ts` is a Zod schema with no hardcoded fallback URLs/keys/project
IDs (`APP_URL`/`WEB_URL` default to `localhost` only, which is never reachable in a deployed
environment so it's a safe non-value); `apps/web/src/lib/api-client.ts` reads a single
`NEXT_PUBLIC_API_URL`. **No code changes are required to switch between `uat` and `master`** — set
these once per Vercel project (Project Settings → Environment Variables, scoped to "Production" —
each project has exactly one meaningful scope since Preview/Development traffic is blocked by §4.2's
guard anyway):

| Variable | apps/api | apps/web | Differs per environment? |
|---|:-:|:-:|:-:|
| `NODE_ENV` | ✓ | — | No (`production` both) |
| `PORT` | ✓ | — | No |
| `APP_URL` | ✓ | — | **Yes** — each project's own domain |
| `WEB_URL` | ✓ | — | **Yes** — used for CORS origin in `bootstrap.ts`; must be the matching web project's exact domain |
| `NEXT_PUBLIC_API_URL` | — | ✓ | **Yes** — must point at the matching api project |
| `DATABASE_URL` | ✓ | — | **Yes** — the two separate Supabase Postgres refs from §2 |
| `REDIS_URL` | ✓ | — | **Yes**, if using separate Redis instances per environment (recommended) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✓ | — | **Yes** — never share signing secrets across environments; a UAT-issued token must never validate against production |
| `CREDENTIAL_ENCRYPTION_KEY` | ✓ | — | **Yes** — encrypts stored connector credentials (Jira, etc.); a UAT key must never be able to decrypt production data or vice versa |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | ✓ | — | Recommended: separate keys per environment for cost attribution/rate-limit isolation, even though not a correctness requirement |
| `AI_DEFAULT_PROVIDER`, `LOG_LEVEL`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, `OTEL_EXPORTER_OTLP_ENDPOINT` | ✓ | — | No (operational tuning, can match) |

No secret values are recorded in this document. `.env.example` (root, for `apps/api`) and
`apps/web/.env.example` (added this session) list variable *names* only, for local dev; they are
git-tracked. `.env`, `.env.*.local`, and `apps/*/.env.local` are all gitignored and must never be
committed — verified against `.gitignore` this session.

---

## 6. Migration strategy

```
1. Write migration → apps against UAT locally (`pnpm db:migrate`)
2. Push to uat → CI runs → db-migrate.yml's migrate-uat job auto-applies it to SprintGuardAI_UAT
3. QA validates against the live UAT deployment
4. PR uat -> master, reviewed, merged
5. db-migrate.yml's migrate-production job runs, held by the `production` GitHub Environment's
   required-reviewer rule -- migration is NOT applied until someone explicitly approves the run
```

`.github/workflows/db-migrate.yml` (added this session) implements steps 2 and 5, reusing the
existing `pnpm db:deploy` script (`prisma migrate deploy`) — no new tooling. It intentionally does
**not** run from `apps/api/vercel.json`'s build command (which only runs `prisma generate`) — baking
`migrate deploy` into every serverless build would apply schema changes on every push with no
approval gate, which is exactly what Rule 3 (no accidental cross-environment/unreviewed changes)
prohibits.

**Setup required (dashboard, not done this session):**
- Settings → Environments → New environment → `uat`. Add secret `DATABASE_URL` = the UAT Supabase
  connection string. No protection rules.
- Settings → Environments → New environment → `production`. Add secret `DATABASE_URL` = the
  production Supabase connection string. Add a **required reviewers** protection rule — this is the
  actual approval gate; without it, `migrate-production` runs unattended on every merge to `master`.

---

## 7. Rollback strategy

- **Application (Vercel):** every deployment is immutable and addressable. Project → Deployments →
  select a previous successful deployment → **Promote to Production**. This is instant (DNS/edge
  routing swap, no rebuild) and works identically for both `*prod` and `*uat` projects, independently
  of each other.
- **Database (Prisma):** `prisma migrate deploy` has no automatic down-migration. Policy: **forward-
  fix, don't roll back schema**. If a migration causes an incident, write and promote a new migration
  that corrects it through the same uat→master pipeline (§6), rather than attempting to reverse-apply
  history — reversing a migration that's already had application code (and possibly writes) build on
  top of it is higher-risk than fixing forward. For a destructive migration, take a Supabase point-
  in-time-recovery snapshot immediately before promoting to production (manual step, not automated
  here) so a full restore is available as a last resort.

---

## 8. Team development workflow

1. Clone the repo, `git checkout uat`, branch `feature/<name>` off it.
2. Develop locally against `.env.uat.local`'s config (already present, points at the UAT Supabase
   project) or a fully local Postgres via `docker-compose.yml`.
3. Open a PR into `uat`. CI (`ci.yml`) runs typecheck/lint/unit/e2e/build.
4. On merge to `uat`: `sprintguardai_uat` + `sprintguardai-api-uat` deploy automatically (§4);
   `db-migrate.yml`'s `migrate-uat` job applies any new migrations to `SprintGuardAI_UAT`.
5. QA validates against `sprintguardaiuat.vercel.app`.
6. Once approved, open a PR from `uat` into `master`. This is the only path into production — direct
   pushes to `master` are blocked by branch protection (§3.2).
7. On merge: `sprintguardai_prod` + `sprintguardai-api-prod` deploy automatically; `migrate-production`
   runs, held for approval by the `production` GitHub Environment.

Multiple developers can safely work in parallel on separate `feature/*` branches — they all target
the shared `uat` integration branch and its one Supabase project; nothing here is environment-per-
developer, so the usual PR/merge discipline on `uat` is what prevents feature branches from
conflicting with each other (unrelated to prod/UAT isolation, which is enforced structurally by §4.2
regardless of how many people are pushing to `uat`).

---

## 9. UAT deployment checklist

- [ ] PR into `uat` has a green `CI` check.
- [ ] If the PR includes a Prisma migration, confirm `migrate-uat` completed successfully after merge
      (Actions tab) before starting QA.
- [ ] Deployment visible at `sprintguardaiuat.vercel.app` / `sprintguardai-api-uat.vercel.app` and
      `Ignored Build Step` logs confirm it built (i.e., the commit ref was `uat`).
- [ ] `apps/api`'s `/api/health/ready` responds against the UAT deployment.
- [ ] QA sign-off recorded on the PR/ticket before opening the `uat` → `master` PR.

## 10. Production release checklist

Feature-completeness gates already live in
[06-production-checklist.md](06-production-checklist.md) §2–§6 — treat that as the go/no-go source
of truth. This list is the mechanical release step once that checklist is green:

- [ ] `uat` → `master` PR has required approval(s) and a green `CI` check (branch protection enforces
      this once §3.2 is applied).
- [ ] If the release includes a migration, the `production` GitHub Environment reviewer has the
      change queued and understands what they're approving before merge.
- [ ] Merge the PR (squash or merge, per team convention — not prescribed here).
- [ ] Confirm `sprintguardai_prod` / `sprintguardai-api-prod` built from commit ref `master` (Vercel
      deployment detail page shows the git ref) — this is also your proof that Ignored Build Step
      isolation held.
- [ ] Approve the held `migrate-production` run in Actions, if applicable.
- [ ] Smoke-test `/api/health/ready` and a real login against production.
- [ ] Watch error logs (Winston output in Vercel's Runtime Logs) for the first few minutes of traffic.

---

## 11. Verification — proving the two environments are actually isolated

Run these after the manual runbook in §4.3 is complete:

```bash
# 1. Confirm each API project is pointed at a different Postgres project (compare refs, not full URLs)
grep -o '@db\.[a-z]*\.supabase' .env.uat.local .env.master.local
# expect: rtbwmsldqtmvgxxkoidr (uat) vs yzhtgtsjalvrdjxeakke (master) -- must differ

# 2. Confirm no shared JWT/encryption secrets between environments (compare, don't print, values)
diff <(grep '^JWT_ACCESS_SECRET=\|^JWT_REFRESH_SECRET=\|^CREDENTIAL_ENCRYPTION_KEY=' .env.uat.local) \
     <(grep '^JWT_ACCESS_SECRET=\|^JWT_REFRESH_SECRET=\|^CREDENTIAL_ENCRYPTION_KEY=' .env.master.local)
# expect: every line differs (no diff output in common = bad, means a secret is shared)

# 3. Confirm each Vercel project's local link matches its intended environment
cat apps/web/.vercel/project.json apps/api/.vercel/project.json
# expect: both say "*_uat" while checked out on the uat branch

# 4. Confirm Production Branch + Ignored Build Step took effect: push a trivial commit to uat and
#    confirm in the Vercel dashboard that ONLY sprintguardai_uat/sprintguardai-api-uat produced a
#    new deployment, and that sprintguardai_prod/sprintguardai-api-prod's deployment list is
#    untouched. Repeat for a master merge, expecting the opposite.

# 5. Confirm branch protection is live
curl -s https://api.github.com/repos/ZafarQualitrix1/SprintGuardAI/branches/master/protection \
  -H "Authorization: Bearer $GITHUB_TOKEN" | grep required_status_checks
```

Success criteria (mirrors the user's original spec): a `uat` push only ever produces new deployments
on the two `*_uat` projects against `SprintGuardAI_UAT`; a `master` merge only ever produces new
deployments on the two `*_prod` projects against `SprintGuardAI`; no secret, URL, or DB credential
value is equal between `.env.uat.local` and `.env.master.local`; direct pushes to `master` are
rejected by GitHub; production migrations never run without an explicit approval.
