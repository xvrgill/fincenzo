# Architecture

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

## Data model

Core tables:

- `users` — Supabase auth user mirror.
- `households` + `household_members` (role: `owner` | `member`).
- `plaid_items` — one row per linked institution (`access_token`, `item_id`, `user_id`).
- `accounts` — checking/savings/credit/investment; `user_id` owner; `visibility: 'private' | 'household'`.
- `transactions` — `account_id`, `amount`, `date`, `merchant`, `plaid_category`, `user_category` (override), `pending`.
- `category_rules` — user-defined ("merchant matches X -> category Y").
- `budgets` — `user_id` or `household_id`, `category`, `month`, `limit_cents`.
- `net_worth_snapshots` — daily roll-up per user (and later per household) for charting.
- `goals` — target amount, current amount, target date.

Row-level security policies enforce: a user sees their own rows; a household member sees rows where `visibility = 'household'` AND the owning user is in the same household.

## Repository layout

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
docs/               developer documentation (this file lives here)
e2e/                Playwright specs
```

## Design direction

The ACRU reference (saved as inspiration) sets the tone:

- Light background, white cards with soft shadows, rounded corners (~16px).
- Single accent color used sparingly to highlight positive trends and primary actions. Starting with a muted green; open to revisiting once there's something to look at.
- Strong typographic hierarchy — large numerals for the headline figures, small uppercase labels.
- Sidebar nav: Dashboard, Accounts, Transactions, Cash flow, Budget, Investments, Goals.
- Charts are first-class, not afterthoughts. Bar/area for time series, donut/arc for composition, progress bars for budgets and goals.

We may inject more personality (illustration, a warmer secondary color, a distinctive empty-state voice) once the structure is in place. Easy to redesign later — keep components decoupled from brand specifics.
