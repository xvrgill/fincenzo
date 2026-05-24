# Development

Local setup, scripts, and testing.

## Requirements

- Node 20+
- A free Supabase project
- Plaid sandbox credentials (free)

## Setup

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Create a Supabase project** at https://supabase.com. From Project Settings:
   - **API** tab: copy the Project URL and `anon` key.
   - **Database** tab: copy the "Transaction pooler" connection string (works for both runtime queries and Drizzle migrations in dev).

3. **Configure env vars**

   ```sh
   cp .env.example .env.local
   # fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
   # SUPABASE_SECRET_KEY, DATABASE_URL, and PLAID_TOKEN_ENCRYPTION_KEY
   ```

4. **Run migrations**

   ```sh
   npm run db:generate   # generates SQL from src/lib/db/schema.ts
   npm run db:migrate    # applies migrations to the Supabase database
   ```

5. **Wire Supabase auth to the app schema.** Open the Supabase SQL editor and run `supabase/setup.sql`. This adds an `auth.users → public.users` foreign key and a trigger that creates a `public.users` row on signup.

6. **Get Plaid sandbox credentials.** Sign up at https://dashboard.plaid.com. From the dashboard:
   - Copy your `client_id` and **Sandbox** `secret` into `PLAID_CLIENT_ID` and `PLAID_SECRET` in `.env.local`.
   - Leave `PLAID_ENV=sandbox`.

   Plaid sandbox accepts any institution with username `user_good` and password `pass_good`, returning realistic fake accounts and transactions.

7. **Start the dev server**

   ```sh
   npm run dev
   ```

   Visit http://localhost:3000 — you'll be redirected to `/sign-in`. Create an account, confirm via email, and you'll land on the dashboard.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run Vitest unit suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with V8 coverage report |
| `npm run test:e2e` | Playwright smoke tests (boots `npm run dev` automatically) |
| `npm run db:generate` | Generate migration SQL from the Drizzle schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly to the DB (skip migration files — fine in early dev) |
| `npm run db:studio` | Drizzle Studio (browse/edit DB rows in the browser) |

## Testing

**Unit tests (Vitest).** Specs live next to source as `*.test.ts` under `src/`. The suite covers pure modules — crypto, formatting, category rules, scope helpers. `vitest.setup.ts` stubs `DATABASE_URL` and `PLAID_TOKEN_ENCRYPTION_KEY` so modules that read env at import time don't throw; nothing in the unit suite opens a real DB connection.

**E2E tests (Playwright).** Specs live under `e2e/`. They drive a real `next dev` server using your `.env.local`, so a working Supabase + DB connection is required. Chromium is the only configured browser; first-time setup needs `npx playwright install chromium`.

Targeted runs:

```sh
npm test -- src/lib/crypto.test.ts          # one file
npm run test:e2e -- --grep "redirect"       # one spec by name
```

## Environment variables

See `.env.example` for the full list. Plaid access tokens are encrypted at rest with `PLAID_TOKEN_ENCRYPTION_KEY` (AES-256-GCM); the same key must be set in every environment that talks to the DB. Production additionally needs a real Plaid environment (`PLAID_ENV=production`, prod secret) and `CRON_SECRET` for the daily net-worth snapshot job.

**Sentry** (optional locally, recommended in production). Set `NEXT_PUBLIC_SENTRY_DSN` to the project DSN and the SDK initializes for server, client, and edge runtimes via `src/instrumentation.ts` and `src/instrumentation-client.ts`. Leave it unset to disable — every init guards on the DSN and becomes a no-op. Optional `SENTRY_ENVIRONMENT` and `NEXT_PUBLIC_SENTRY_ENVIRONMENT` override the auto-detected env (defaults to `VERCEL_ENV` on Vercel, `development` otherwise).
