import { createHash } from "node:crypto";
import { SignJWT, exportJWK, generateKeyPair, type JWK } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const keyGetMock = vi.fn();
vi.mock("./client", () => ({
  plaid: {
    webhookVerificationKeyGet: (...args: unknown[]) => keyGetMock(...args),
  },
}));

// Import after the mock so verifyWebhook picks up the mocked client.
const { verifyWebhook } = await import("./webhook-verify");

type Keypair = Awaited<ReturnType<typeof generateKeyPair>>;

async function makeKeypair(): Promise<{ kp: Keypair; jwk: JWK; kid: string }> {
  const kp = await generateKeyPair("ES256", { extractable: true });
  const jwk = await exportJWK(kp.publicKey);
  const kid = "test-kid";
  jwk.kid = kid;
  jwk.alg = "ES256";
  return { kp, jwk, kid };
}

async function signWebhook(opts: {
  body: string;
  privateKey: Keypair["privateKey"];
  kid: string;
  alg?: string;
  iat?: number;
  bodyHash?: string;
}) {
  const hash =
    opts.bodyHash ?? createHash("sha256").update(opts.body, "utf8").digest("hex");
  return new SignJWT({ request_body_sha256: hash })
    .setProtectedHeader({ alg: opts.alg ?? "ES256", typ: "JOSE", kid: opts.kid })
    .setIssuedAt(opts.iat)
    .sign(opts.privateKey);
}

describe("verifyWebhook", () => {
  beforeEach(() => {
    keyGetMock.mockReset();
  });

  it("accepts a valid signature whose body hash matches", async () => {
    const { kp, jwk, kid } = await makeKeypair();
    keyGetMock.mockResolvedValue({ data: { key: jwk } });
    const body = JSON.stringify({ webhook_type: "TRANSACTIONS", item_id: "x" });
    const jwt = await signWebhook({ body, privateKey: kp.privateKey, kid });

    expect(await verifyWebhook(body, jwt)).toBe(true);
    expect(keyGetMock).toHaveBeenCalledWith({ key_id: kid });
  });

  it("rejects a missing header", async () => {
    expect(await verifyWebhook("{}", null)).toBe(false);
    expect(keyGetMock).not.toHaveBeenCalled();
  });

  it("rejects a non-ES256 algorithm header", async () => {
    const { jwk } = await makeKeypair();
    keyGetMock.mockResolvedValue({ data: { key: jwk } });
    // A header advertising HS256 should be rejected before we even fetch a key.
    const fakeHeader = Buffer.from(
      JSON.stringify({ alg: "HS256", kid: "test-kid" }),
    ).toString("base64url");
    const fakePayload = Buffer.from(JSON.stringify({})).toString("base64url");
    const jwt = `${fakeHeader}.${fakePayload}.sig`;

    expect(await verifyWebhook("{}", jwt)).toBe(false);
    expect(keyGetMock).not.toHaveBeenCalled();
  });

  it("rejects when the body hash does not match", async () => {
    const { kp, jwk, kid } = await makeKeypair();
    keyGetMock.mockResolvedValue({ data: { key: jwk } });
    const body = JSON.stringify({ webhook_type: "TRANSACTIONS" });
    const jwt = await signWebhook({
      body,
      privateKey: kp.privateKey,
      kid,
      bodyHash: "0".repeat(64),
    });

    expect(await verifyWebhook(body, jwt)).toBe(false);
  });

  it("rejects a tampered body", async () => {
    const { kp, jwk, kid } = await makeKeypair();
    keyGetMock.mockResolvedValue({ data: { key: jwk } });
    const body = JSON.stringify({ webhook_type: "TRANSACTIONS" });
    const jwt = await signWebhook({ body, privateKey: kp.privateKey, kid });

    expect(await verifyWebhook(body + " ", jwt)).toBe(false);
  });

  it("rejects an iat older than 5 minutes", async () => {
    const { kp, jwk, kid } = await makeKeypair();
    keyGetMock.mockResolvedValue({ data: { key: jwk } });
    const body = "{}";
    const stale = Math.floor(Date.now() / 1000) - 6 * 60;
    const jwt = await signWebhook({ body, privateKey: kp.privateKey, kid, iat: stale });

    expect(await verifyWebhook(body, jwt)).toBe(false);
  });

  it("rejects a signature from a different key", async () => {
    const real = await makeKeypair();
    const attacker = await makeKeypair();
    // We hand the verifier the *real* public key, but sign with the attacker's
    // private key — signature check should fail.
    keyGetMock.mockResolvedValue({ data: { key: real.jwk } });
    const body = "{}";
    const jwt = await signWebhook({
      body,
      privateKey: attacker.kp.privateKey,
      kid: real.kid,
    });

    expect(await verifyWebhook(body, jwt)).toBe(false);
  });
});
