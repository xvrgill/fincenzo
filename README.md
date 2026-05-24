# Fincenzo

A budgeting and net-worth tracking web app, designed first for an individual and then extended to couples sharing a "household." The household model is the differentiator: each partner keeps a personal budget and personal accounts, then explicitly opts which accounts and categories are visible to the shared household view.

Currently single-developer, single-user (the author). Built in phases — solo experience first, household features layered on once the core is solid.

## Product vision

- **Automatic, low-effort tracking.** Linked bank/credit/investment accounts sync transactions and balances; the user reviews and re-categorizes rather than entering data.
- **Net worth over time**, not just monthly spend — assets minus liabilities, charted.
- **Two-tier privacy model.** Personal layer (private to one user) + household layer (explicitly shared). A user can be solo forever, or invite a partner and choose what to share.
- **Modern, calm dashboard UI.** Reference aesthetic: light surfaces, generous whitespace, a single muted accent color, clear typographic hierarchy, charts as the focal point. Inspired by the ACRU dashboard reference (see design notes below).

## How the household model works

**One login per person — no separate "household account."** A household is a shared scope on top of two personal accounts, not a third login.

Worked example:

- Alice signs up and links her checking + credit card. Both belong to Alice.
- Bob signs up and links his checking + brokerage. Both belong to Bob.
- Alice creates a household and invites Bob by email. Bob accepts.
- Each linked account has a `visibility` flag, defaulting to `private`. The owner can flip it to `household`.
- Alice shares her checking but keeps her credit card private. Bob shares his checking but keeps his brokerage private.
- **My view** (for either of them): everything they personally own — shared and private.
- **Household view** (for either of them): the union of accounts marked `household` — here, both checking accounts. Joint budgets and joint net worth are computed from those only.

Rules that fall out of this:

- Sharing is per-account and reversible at any time by the owner.
- A partner never sees an account the other hasn't explicitly shared.
- Budgets and goals are scoped to either a user or a household; household budgets aggregate transactions from any shared account.
- Leaving a household unshares everything automatically; the accounts remain with their original owner.

The reason for this design rather than a shared login: real couples rarely share everything (personal spending, gifts, individual investments), and a single shared login forces an all-or-nothing choice. Default-private + deliberate sharing matches how couples actually negotiate money.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Full-stack React in one repo; server components keep the dashboard fast; API routes handle Plaid webhooks. |
| Styling | **Tailwind CSS + shadcn/ui** | Matches the clean, minimal reference design; shadcn gives accessible primitives we own (not a locked-in component library). |
| Charts | **Recharts** | Good defaults, composable, fits the dashboard cards in the reference. Revisit Visx if we outgrow it. |
| Database | **Postgres (Supabase)** | Managed, generous free tier, row-level security is a natural fit for household/personal data isolation. |
| ORM | **Drizzle** | TypeScript-first, thin, good migrations story. |
| Auth | **Supabase Auth** | Bundled with the DB; one less service. Email + Google to start. |
| Bank linking | **Plaid** | US-first, best-in-class coverage and DX. Wrapped behind an internal interface so we could swap aggregators later. |
| Background jobs | **Inngest** (or Vercel Cron for simple cases) | Plaid webhook fan-out, periodic balance refresh, transaction re-sync. |
| Hosting | **Vercel** + Supabase | Trivial deploys; both have meaningful free tiers for a solo project. |
| Testing | **Vitest** + **Playwright** | Unit + a small smoke E2E suite around auth and Plaid link. |

Things deliberately deferred: mobile app (PWA may be enough early), ML categorization (rules + Plaid's category first), multi-currency.

## Phased roadmap

### Phase 1 — Solo user ✅
1. ✅ Project skeleton: Next.js + Tailwind + shadcn, Supabase project, Drizzle schema, auth.
2. ✅ Plaid Link integration in sandbox; `access_token` stored per institution per user, encrypted at rest (AES-256-GCM via `src/lib/crypto.ts`).
3. ✅ Transaction + account sync — initial pull on link, webhook-driven incremental sync (`/api/plaid/webhook`), plus manual `/api/plaid/sync`.
4. ✅ Categorization: Plaid's category, user override, persisted rules (merchant-equals + name-contains substring).
5. ✅ Dashboard: net worth, income/expense tiles, recent transactions, category breakdown.
6. ✅ Budgets: monthly category budgets with progress bars; month navigator.
7. ✅ Net worth: assets - liabilities, charted over time. Daily snapshot job runs via Vercel Cron (`vercel.json` → `/api/cron/snapshot`).
8. ✅ Goals (savings targets with progress) — create/edit/delete.

### Phase 2 — Households ✅
1. ✅ Household entity; invite-by-email flow with pending-invite state.
2. ✅ Per-account sharing toggle: private by default; owner promotes to `household`.
3. ✅ Per-category sharing for budgets — household-scope add form has a Shared/Personal selector.
4. ✅ Household dashboard view: scope switcher toggles between personal and household, recomputing every panel.
5. ✅ Permissions: partner sees only shared data; only the owner can unlink or re-share.
6. ✅ Activity log on the Household page.

### Phase 3 — Polish (post-MVP, not started)
- Recurring transaction detection, subscription tracker.
- Cash-flow forecasting.
- Export (CSV, maybe a year-end summary PDF).
- PWA / mobile-friendly layout pass (mobile drawer nav landed; deeper responsive pass pending).
- Plaid production approval + JWT-verified webhooks already in place (`src/lib/plaid/webhook-verify.ts`).
- Error monitoring (Sentry or similar).
- Vitest + Playwright test suites (originally planned in Phase 1's tech stack table; deferred).

## Data model sketch

Core tables (Phase 1):

- `users` — Supabase auth user mirror.
- `households` + `household_members` (role: `owner` | `member`) — empty/unused in Phase 1.
- `plaid_items` — one row per linked institution (`access_token`, `item_id`, `user_id`).
- `accounts` — checking/savings/credit/investment; `user_id` owner; `visibility: 'private' | 'household'`.
- `transactions` — `account_id`, `amount`, `date`, `merchant`, `plaid_category`, `user_category` (override), `pending`.
- `category_rules` — user-defined ("merchant matches X -> category Y").
- `budgets` — `user_id` or `household_id`, `category`, `month`, `limit_cents`.
- `net_worth_snapshots` — daily roll-up per user (and later per household) for charting.
- `goals` — target amount, current amount, target date.

Row-level security policies enforce: a user sees their own rows; a household member sees rows where `visibility = 'household'` AND the owning user is in the same household.

## Design direction

The ACRU reference (saved as inspiration) sets the tone:

- Light background, white cards with soft shadows, rounded corners (~16px).
- Single accent color used sparingly to highlight positive trends and primary actions. Starting with a muted green; open to revisiting once there's something to look at.
- Strong typographic hierarchy — large numerals for the headline figures, small uppercase labels.
- Sidebar nav: Dashboard, Accounts, Transactions, Cash flow, Budget, Investments, Goals.
- Charts are first-class, not afterthoughts. Bar/area for time series, donut/arc for composition, progress bars for budgets and goals.

We may inject more personality (illustration, a warmer secondary color, a distinctive empty-state voice) once the structure is in place. Easy to redesign later — keep components decoupled from brand specifics.

## Repository layout (planned)

```
src/
  app/
    (auth)/         sign-in, sign-up, server actions
    (app)/          authenticated shell: dashboard, accounts, transactions, budget, ...
    auth/callback/  Supabase email-confirmation handler
  components/
    ui/             shadcn primitives
    app-sidebar.tsx app-specific composites
  lib/
    db/             drizzle schema, client, queries
    supabase/       server + browser + middleware clients
    utils.ts        cn() and other shared helpers
  proxy.ts          Next.js proxy (was "middleware" pre-v16) — refreshes the Supabase session and gates routes
drizzle/            generated migration SQL (created by db:generate)
supabase/setup.sql  one-time auth → app schema wiring (run in Supabase SQL editor)
```

## Local development

Requires Node 20+ and a free Supabase project. Plaid keys are only needed once we wire the integration in the next step.

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Create a Supabase project** at https://supabase.com (free tier is fine). From Project Settings:
   - **API** tab: copy the Project URL and `anon` key.
   - **Database** tab: copy the "Transaction pooler" connection string (works for both runtime queries and Drizzle migrations in dev).

3. **Configure env vars**

   ```sh
   cp .env.example .env.local
   # then fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
   # SUPABASE_SECRET_KEY, DATABASE_URL, and PLAID_TOKEN_ENCRYPTION_KEY
   ```

4. **Run migrations**

   ```sh
   npm run db:generate   # generates SQL from src/lib/db/schema.ts
   npm run db:migrate    # applies migrations to the Supabase database
   ```

5. **Wire Supabase auth to the app schema.** Open the Supabase SQL editor and run `supabase/setup.sql`. This adds an `auth.users → public.users` foreign key and a trigger that creates a `public.users` row on signup.

6. **Get Plaid sandbox credentials.** Sign up at https://dashboard.plaid.com (free). From the dashboard:
   - Copy your `client_id` and **Sandbox** `secret` into `PLAID_CLIENT_ID` and `PLAID_SECRET` in `.env.local`.
   - Leave `PLAID_ENV=sandbox`.

   To test the link flow, Plaid sandbox accepts any institution with username `user_good` and password `pass_good`. That returns a set of fake but realistic accounts and transactions.

7. **Start the dev server**

   ```sh
   npm run dev
   ```

   Visit http://localhost:3000 — you'll be redirected to `/sign-in`. Create an account, confirm via email, and you'll land on the dashboard.

### Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate migration SQL from the Drizzle schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly to the DB (skip migration files — fine in early dev) |
| `npm run db:studio` | Drizzle Studio (browse/edit DB rows in the browser) |

### Environment variables

See `.env.example` for the full list. Plaid access tokens are encrypted at rest with `PLAID_TOKEN_ENCRYPTION_KEY` (AES-256-GCM); the same key must be set in every environment that talks to the DB. Production additionally needs a real Plaid environment (`PLAID_ENV=production`, prod secret) and `CRON_SECRET` for the daily net-worth snapshot job.
