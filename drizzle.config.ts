import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// Match Next.js: prefer .env.local, fall back to .env.
config({ path: [".env.local", ".env"] });

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
