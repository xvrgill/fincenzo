# Going to production with Plaid

Sandbox credentials don't work in production. Production access is a manual
approval from Plaid plus a handful of config flips on our side.

## 1. Request production access

In the [Plaid Dashboard](https://dashboard.plaid.com), go to **Team Settings →
Billing → Request Production Access**. Plaid asks for:

- A short product description (what the app does with the data).
- The exact products we use: `transactions`, plus `auth` / `identity` /
  `liabilities` if/when we add them. Today: **transactions only**.
- Which countries (`US`).
- Privacy policy URL — required, must be reachable.
- Whether we connect to OAuth-only institutions (Chase, Capital One, Wells
  Fargo, etc.). If yes, Plaid requires extra OAuth redirect-URI setup below.

Turnaround is typically a few business days.

## 2. Switch the app to production

Once approved:

1. Generate a new **production** secret in the Plaid Dashboard → Team Settings
   → Keys. The `client_id` stays the same; the secret is per-environment.
2. Set Vercel project env vars (Production environment only):
   - `PLAID_ENV=production`
   - `PLAID_SECRET=<production secret>`
3. Leave Preview/Development pointed at `sandbox` so PR previews don't hit
   production banks.
4. **Back up `PLAID_TOKEN_ENCRYPTION_KEY`** somewhere durable before launch.
   Losing it means every linked institution must be re-linked — encrypted
   `access_token`s in the DB become unrecoverable. See [`src/lib/crypto.ts`](../src/lib/crypto.ts).

## 3. Sandbox tokens do not migrate

Every user has to re-link their institutions in production. Sandbox
`access_token`s are not valid against the production API. Plan a one-time
"reconnect your bank" prompt for any existing user when flipping environments.

## 4. Webhooks

Register the production webhook URL in the Plaid Dashboard → Team Settings →
Webhooks: `https://<prod-domain>/api/plaid/webhook`.

Signature verification is already wired up. Every request to
[`/api/plaid/webhook`](../src/app/api/plaid/webhook/route.ts) runs through
[`verifyWebhook`](../src/lib/plaid/webhook-verify.ts), which:

- Reads the `Plaid-Verification` JWS header.
- Fetches the matching JWK via `webhookVerificationKeyGet` (cached in-process).
- Confirms the signature is ES256 and the body's SHA-256 matches the JWT's
  `request_body_sha256` claim.
- Rejects anything with `iat` more than 5 minutes off (replay protection).

Unverified requests get a 401. There is no dev bypass — Plaid signs sandbox
webhooks too, so local testing with the Plaid CLI or ngrok works the same way.

## 5. OAuth redirect URIs (only if connecting OAuth institutions)

For Chase, Capital One, etc., add the production redirect URI in the Plaid
Dashboard → Team Settings → API → Allowed redirect URIs:
`https://<prod-domain>/plaid-oauth` (or whatever path the Link component
handles the OAuth return on — verify against the current Link integration
before launch).

## 6. Post-launch monitoring

- Sentry already captures webhook handler failures with `area: plaid-webhook`.
  See [`src/app/api/plaid/webhook/route.ts`](../src/app/api/plaid/webhook/route.ts).
- Plaid Dashboard → Activity has per-Item error counts and webhook delivery
  history; check it the first week after launch for `ITEM_LOGIN_REQUIRED`
  spikes (users whose creds expired in re-link).
