import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptToken, encryptToken, isEncrypted } from "./crypto";

beforeAll(() => {
  process.env.PLAID_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("crypto", () => {
  it("round-trips a plaintext token", () => {
    const ct = encryptToken("access-sandbox-abc123");
    expect(ct).not.toContain("access-sandbox-abc123");
    expect(isEncrypted(ct)).toBe(true);
    expect(decryptToken(ct)).toBe("access-sandbox-abc123");
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const a = encryptToken("same-input");
    const b = encryptToken("same-input");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe(decryptToken(b));
  });

  it("treats unprefixed legacy values as plaintext on read", () => {
    expect(isEncrypted("legacy-token")).toBe(false);
    expect(decryptToken("legacy-token")).toBe("legacy-token");
  });

  it("rejects a tampered ciphertext", () => {
    const ct = encryptToken("secret");
    const [v, iv, body, tag] = ct.split(":");
    // Flip a byte in the ciphertext body.
    const tamperedBody = Buffer.from(body, "base64");
    tamperedBody[0] ^= 0x01;
    const tampered = [v, iv, tamperedBody.toString("base64"), tag].join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws on malformed encrypted token", () => {
    expect(() => decryptToken("v1:only-one-segment")).toThrow(/malformed/);
  });

  it("rejects keys that don't decode to 32 bytes", () => {
    const original = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    try {
      expect(() => encryptToken("x")).toThrow(/32 bytes/);
    } finally {
      process.env.PLAID_TOKEN_ENCRYPTION_KEY = original;
    }
  });
});
