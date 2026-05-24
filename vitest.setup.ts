import { randomBytes } from "node:crypto";

// Stubs so modules that read env at import time don't blow up. Nothing in the
// unit suite actually opens a DB connection — postgres-js connects lazily on
// first query. Individual tests can override these as needed.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.PLAID_TOKEN_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");
