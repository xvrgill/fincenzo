import { createHash } from "node:crypto";
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from "jose";
import { plaid } from "./client";

// In-process cache for Plaid's verification JWKs. Keys rarely rotate, so a
// long-lived cache is fine. If Plaid expires a key (`expired_at` is set on the
// returned key), we drop it on the next miss.
const keyCache = new Map<string, JWK>();

async function getVerificationKey(kid: string): Promise<JWK> {
  const cached = keyCache.get(kid);
  if (cached) return cached;
  const { data } = await plaid.webhookVerificationKeyGet({ key_id: kid });
  const key = data.key as unknown as JWK;
  keyCache.set(kid, key);
  return key;
}

/**
 * Verify a Plaid webhook per https://plaid.com/docs/api/webhooks/webhook-verification/
 *  1. The `Plaid-Verification` header is a JWS (ES256) over the request body.
 *  2. Fetch the JWK for `kid` and verify the signature.
 *  3. Confirm `request_body_sha256` in the JWT matches sha256(rawBody).
 *  4. Reject anything older than 5 minutes (replay protection).
 */
export async function verifyWebhook(rawBody: string, jwtHeader: string | null): Promise<boolean> {
  if (!jwtHeader) return false;
  let kid: string;
  try {
    const header = decodeProtectedHeader(jwtHeader);
    if (header.alg !== "ES256" || !header.kid) return false;
    kid = header.kid;
  } catch {
    return false;
  }

  const jwk = await getVerificationKey(kid);
  const key = await importJWK(jwk, "ES256");

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(jwtHeader, key, { algorithms: ["ES256"] });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    return false;
  }

  const iat = typeof payload.iat === "number" ? payload.iat : 0;
  if (Math.abs(Date.now() / 1000 - iat) > 5 * 60) return false;

  const expected = createHash("sha256").update(rawBody, "utf8").digest("hex");
  return payload.request_body_sha256 === expected;
}
