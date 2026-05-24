import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM with a 32-byte key supplied via PLAID_TOKEN_ENCRYPTION_KEY
// (base64). Generate one with: openssl rand -base64 32
//
// Encrypted format: "v1:<iv-b64>:<ciphertext-b64>:<tag-b64>". The version
// prefix lets us rotate keys/algorithms later. Values without the prefix are
// treated as legacy plaintext so reads keep working during the one-shot
// backfill.

const VERSION = "v1";

function getKey(): Buffer {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY must decode to 32 bytes (base64-encoded)");
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}:${ct.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptToken(value: string): string {
  if (!value.startsWith(`${VERSION}:`)) {
    // Legacy plaintext row — return as-is. The backfill script will rewrite
    // these; once it's done, this branch is dead code but harmless.
    return value;
  }
  const [, ivB64, ctB64, tagB64] = value.split(":");
  if (!ivB64 || !ctB64 || !tagB64) throw new Error("malformed encrypted token");
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${VERSION}:`);
}
