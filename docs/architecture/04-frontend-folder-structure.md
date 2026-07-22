# SprintGuard AI — Frontend Folder Structure

Status: Draft v1.0 · Owner: Platform Architecture · Last updated: 2026-07-21

Implements the Frontend scope from [01-solution-architecture.md](01-solution-architecture.md)
(Next.js 15, React, TypeScript, Tailwind, ShadCN UI, TanStack Query, Zustand, React Hook Form, Zod,
Framer Motion, Recharts) and consumes the API surface defined by
[03-backend-folder-structure.md](03-backend-folder-structure.md). Unlike the backend scaffold, this
one has been installed, type-checked, and **production-built successfully** — see §6.

---

## 1. Top-Level Structure

```
apps/web/
├── src/
│   ├── app/                   # Next.js App Router — routes, layouts, providers
│   ├── components/
│   │   ├── ui/                  # ShadCN UI primitives (Button, Card, Input, Label, Badge, ...)
│   │   └── layout/               # App-shell chrome (Sidebar, Topbar, ThemeToggle, PageHeader)
│   ├── features/                # One folder per bounded context (§4)
│   ├── lib/                      # Cross-cutting utilities (api-client, query-client, cn())
│   └── stores/                    # Zustand stores (auth-store, ui-store)
├── public/
├── components.json               # ShadCN CLI config
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

`transpilePackages: ['@sprintguard/shared']` in `next.config.mjs` lets the app import
`packages/shared`'s Zod schemas/enums directly as workspace TypeScript source — no separate build
step required in dev.

---

## 2. `src/app` — Route Groups

Two top-level route groups, matching whether a session exists:

```
app/
├── layout.tsx            # <html>/<body>, font, Providers wrapper
├── page.tsx                # redirects to /dashboard (session check lands in Auth Module step)
├── providers.tsx            # ThemeProvider (next-themes) + QueryClientProvider
├── globals.css               # Tailwind base + ShadCN CSS variables (light/dark, §5)
│
├── (auth)/                 # Chrome-free, centered layout — no Sidebar/Topbar
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
│
└── (dashboard)/             # Authenticated app shell — Sidebar + Topbar
    ├── layout.tsx
    ├── dashboard/page.tsx                                    # Dashboard
    ├── sprints/
    │   ├── page.tsx                                             # Sprint Dashboard
    │   ├── upload/page.tsx                                       # Sprint Upload
    │   └── [sprintId]/
    │       ├── page.tsx                                           # Sprint Analysis
    │       ├── stories/[storyId]/page.tsx                          # Story Intelligence
    │       ├── requirements/page.tsx                                # Requirement Intelligence
    │       ├── coverage/page.tsx                                     # Coverage Dashboard
    │       ├── test-generator/page.tsx                                # AI Test Generator
    │       ├── executions/page.tsx                                     # Execution Dashboard
    │       └── release-readiness/page.tsx                               # Release Readiness
    ├── analytics/page.tsx                                        # Executive Analytics
    ├── settings/
    │   ├── organization/page.tsx                                   # Organization Settings
    │   ├── prompts/page.tsx                                         # Prompt Management
    │   ├── ai/page.tsx                                               # AI Settings
    │   └── profile/page.tsx                                           # User Profile
    └── admin/page.tsx                                              # Admin
```

Every page under `(dashboard)/...[sprintId].../` is a Next.js dynamic segment; the sprint-scoped
pages (Analysis, Story Intelligence, Requirement Intelligence, Coverage, AI Test Generator,
Executions, Release Readiness) are reached by drilling into a sprint from `/dashboard/sprints`, not
top-level nav — `components/layout/nav-items.ts` reflects this (only sprint-independent routes are
in the primary sidebar).

**Route groups `(auth)` and `(dashboard)` do not appear in the URL** (Next.js parenthesized-segment
convention) — `/login` and `/dashboard` are the real paths, confirmed by the production build output
in §6.

---

## 3. `src/components` — UI Layer

| Path | Contents |
|---|---|
| `components/ui/*` | ShadCN UI primitives generated in the project's own style (`button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `badge.tsx` scaffolded now; the rest are added on-demand per feature via the same pattern — Radix primitive + `cva` variants + `cn()`) |
| `components/layout/sidebar.tsx` | Primary navigation, driven by `nav-items.ts` (data-driven, not hardcoded JSX per link) |
| `components/layout/topbar.tsx` | Org switcher slot (wired up with IAM), theme toggle, profile link |
| `components/layout/theme-toggle.tsx` | Light/dark toggle via `next-themes` |
| `components/layout/page-header.tsx` | Consistent title/description/actions header used by every page |

`components/ui` is intentionally kept free of any API/business logic — it is the ShadCN
primitive layer every `features/*/components` composes on top of.

---

## 4. `src/features` — Feature Modules (mirrors backend bounded contexts)

```
features/<feature>/
├── api/          # TanStack Query hooks (useQuery/useMutation) calling lib/api-client
├── components/    # Feature-specific components composed from components/ui
├── hooks/          # Feature-local non-server-state hooks
└── types/           # Frontend-only types not already covered by @sprintguard/shared
```

Scaffolded now (folder + placeholder `index.ts` per layer, one real example wired up):

| Feature folder | Mirrors backend module | Status |
|---|---|---|
| `auth` | `iam` | Placeholder |
| `sprint` | `sprint` | Placeholder |
| `requirement-intelligence` | `requirement-intelligence` | Placeholder |
| `test-intelligence` | `test-intelligence` | Placeholder |
| `coverage` | `coverage` | Placeholder |
| `execution` | `execution` | Placeholder |
| `release` | `release` | Placeholder |
| `analytics` | (Executive Analytics, cross-context) | **`components/velocity-trend-chart.tsx` implemented** — Recharts line chart wired into `(dashboard)/dashboard/page.tsx`, placeholder series until the read-model API exists |
| `prompts` | `ai-governance` | Placeholder |
| `ai-settings` | `ai-ops` / `ai` | Placeholder |
| `admin` | `platform` | Placeholder |
| `notifications` | `realtime` | Placeholder |

This mirrors the backend's per-bounded-context layering (Solution Architecture §7) on the frontend:
a feature's `api/` hooks are the only thing a page imports, never a raw `fetch`/`apiClient` call
inlined in a page component — the same "presentation depends only on application" discipline,
adapted to React.

---

## 5. `src/lib` and `src/stores`

| File | Purpose |
|---|---|
| `lib/api-client.ts` | Single `fetch` wrapper (`apiClient.get/post/patch/put/delete`) — attaches the JWT from `useAuthStore`, throws a typed `ApiError` parsed from the shared `ApiErrorResponse` shape emitted by the backend's `AllExceptionsFilter` |
| `lib/query-client.ts` | `createQueryClient()` factory (session-scoped, not module-singleton — avoids cross-user cache leakage under SSR) |
| `lib/utils.ts` | `cn()` — the standard ShadCN Tailwind class-merging helper |
| `stores/auth-store.ts` | Zustand + `persist`: access token + user profile (refresh token stays in an httpOnly cookie, never in client state, per Solution Architecture §25) |
| `stores/ui-store.ts` | Sidebar collapse state, active-organization switcher — UI state that doesn't belong in server cache or session persistence |

**Theming** is CSS-variable-based (`app/globals.css`), toggled by `next-themes` stamping a `.dark`
class on `<html>` — every `components/ui` primitive and Tailwind color (`bg-primary`,
`text-muted-foreground`, etc.) resolves correctly in both modes with zero per-component branching,
satisfying the "Dark Mode" MVP requirement structurally rather than as an afterthought.

---

## 6. Build Verification

Unlike the backend scaffold, this one was fully installed and built in this environment:

```
pnpm --filter @sprintguard/web typecheck   # 0 errors
pnpm --filter @sprintguard/web build       # succeeds, 16 routes generated
```

Production build output confirmed all pages compile, all dynamic `[sprintId]`/`[storyId]` segments
are correctly recognized as server-rendered-on-demand (`ƒ`), and every other route is statically
prerendered (`○`) — including `/login` (25.1 kB, the only page with real client-side form logic via
React Hook Form + Zod so far) and `/dashboard` (102 kB, the only page with a Recharts chart so far).
First Load JS shared by all routes is 103 kB.

---

## 7. What's Deliberately Not Here Yet

- Real data fetching in any page beyond the `dashboard` page's placeholder chart — every other page
  renders a "Coming soon" card until its dedicated implementation step
- Session-aware redirect in `(dashboard)/layout.tsx` and `(auth)` pages' submit handlers — added in
  the Authentication Module step, alongside the backend's `iam` module JWT strategy
- Remaining ShadCN primitives (`dialog`, `dropdown-menu`, `select`, `tabs`, `toast`, `avatar`,
  `separator`, `tooltip`) — dependencies are already installed (`package.json`); components are
  added on first actual use rather than speculatively now
- Framer Motion page/element transitions — added alongside the pages that need them
- Any real TanStack Query hook in `features/*/api` — added per-feature as backend endpoints land
  (Step 9 — APIs)

---

## 8. Next Artifact

5. ⏭ Authentication Module — implements `apps/api/src/modules/iam` (JWT strategy, RBAC,
   Argon2id, refresh tokens) and wires up `(auth)` page submit handlers +
   `(dashboard)/layout.tsx` session guard on the frontend.
