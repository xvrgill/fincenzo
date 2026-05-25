# Roadmap

Built in phases — solo experience first, household features layered on once the core is solid.

## Phase 1 — Solo user ✅

1. ✅ Project skeleton: Next.js + Tailwind + shadcn, Supabase project, Drizzle schema, auth.
2. ✅ Plaid Link integration in sandbox; `access_token` stored per institution per user, encrypted at rest (AES-256-GCM via `src/lib/crypto.ts`).
3. ✅ Transaction + account sync — initial pull on link, webhook-driven incremental sync (`/api/plaid/webhook`), plus manual `/api/plaid/sync`.
4. ✅ Categorization: Plaid's category, user override, persisted rules (merchant-equals + name-contains substring).
5. ✅ Dashboard: net worth, income/expense tiles, recent transactions, category breakdown.
6. ✅ Budgets: monthly category budgets with progress bars; month navigator.
7. ✅ Net worth: assets - liabilities, charted over time. Daily snapshot job runs via Vercel Cron (`vercel.json` → `/api/cron/snapshot`).
8. ✅ Goals (savings targets with progress) — create/edit/delete.

## Phase 2 — Households ✅

1. ✅ Household entity; invite-by-email flow with pending-invite state.
2. ✅ Per-account sharing toggle: private by default; owner promotes to `household`.
3. ✅ Per-category sharing for budgets — household-scope add form has a Shared/Personal selector.
4. ✅ Household dashboard view: scope switcher toggles between personal and household, recomputing every panel.
5. ✅ Permissions: partner sees only shared data; only the owner can unlink or re-share.
6. ✅ Activity log on the Household page.

## Phase 3 — Polish (in progress)

- Vitest + Playwright test scaffolding ✅
- Recurring transaction detection / subscription tracker ✅
- Cash-flow forecasting ✅
- CSV transaction export ✅ (year-end summary PDF still a stretch goal)
- PWA / mobile-friendly layout pass ✅ (mobile drawer nav, responsive sweep of dense pages, web app manifest + generated `icon` / `apple-icon` routes, `themeColor` + `viewportFit=cover`, safe-area-inset on the sticky header)
- JWT-verified Plaid webhooks ✅ (`src/lib/plaid/webhook-verify.ts` wired into `/api/plaid/webhook`, covered by `webhook-verify.test.ts`)
- Plaid production approval — external process; see [docs/plaid-production.md](./plaid-production.md) for the checklist
- Error monitoring ✅ (Sentry: server + client + edge init via `instrumentation.ts`, `onRequestError` hook, explicit captures in `/api/plaid/webhook` and `/api/cron/snapshot`, build-time source-map upload via `withSentryConfig` in `next.config.ts`, error-only Session Replay with `maskAllText`/`maskAllInputs`/`blockAllMedia`)
