import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Mirror of auth.users — populated by a Postgres trigger on auth.users insert.
// The FK to auth.users is added in a hand-written SQL migration so Drizzle does
// not need to know about the auth schema.
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdById: uuid("created_by_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const householdMembers = pgTable(
  "household_members",
  {
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.userId] })],
);

export const householdInvites = pgTable("household_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  invitedById: uuid("invited_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "accepted", "revoked", "expired"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// One row per linked institution. access_token is sensitive — encrypt at the
// application layer (or via pgcrypto) before storing in production.
export const plaidItems = pgTable("plaid_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plaidItemId: text("plaid_item_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  institutionId: text("institution_id"),
  institutionName: text("institution_name"),
  status: text("status", { enum: ["healthy", "login_required", "error"] })
    .notNull()
    .default("healthy"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  syncCursor: text("sync_cursor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plaidItemId: uuid("plaid_item_id").references(() => plaidItems.id, { onDelete: "cascade" }),
  plaidAccountId: text("plaid_account_id").unique(),
  name: text("name").notNull(),
  officialName: text("official_name"),
  mask: text("mask"),
  type: text("type", {
    enum: ["depository", "credit", "loan", "investment", "other"],
  }).notNull(),
  subtype: text("subtype"),
  currentBalanceCents: bigint("current_balance_cents", { mode: "number" }),
  availableBalanceCents: bigint("available_balance_cents", { mode: "number" }),
  isoCurrencyCode: text("iso_currency_code").default("USD"),
  visibility: text("visibility", { enum: ["private", "household"] })
    .notNull()
    .default("private"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    plaidTransactionId: text("plaid_transaction_id").unique(),
    // Positive = money out, negative = money in (matches Plaid convention).
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    isoCurrencyCode: text("iso_currency_code").default("USD"),
    date: date("date").notNull(),
    name: text("name").notNull(),
    merchantName: text("merchant_name"),
    plaidCategory: text("plaid_category"),
    userCategory: text("user_category"),
    pending: boolean("pending").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("transactions_account_plaid_idx").on(t.accountId, t.plaidTransactionId)],
);

export const categoryRules = pgTable("category_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  matchType: text("match_type", { enum: ["merchant_equals", "name_contains"] }).notNull(),
  matchValue: text("match_value").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Scope: either a user (personal budget) or a household (shared budget).
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeType: text("scope_type", { enum: ["user", "household"] }).notNull(),
    scopeId: uuid("scope_id").notNull(),
    category: text("category").notNull(),
    month: date("month").notNull(), // first-of-month
    limitCents: bigint("limit_cents", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("budgets_scope_category_month_idx").on(t.scopeType, t.scopeId, t.category, t.month),
  ],
);

export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeType: text("scope_type", { enum: ["user", "household"] }).notNull(),
    scopeId: uuid("scope_id").notNull(),
    date: date("date").notNull(),
    assetsCents: bigint("assets_cents", { mode: "number" }).notNull(),
    liabilitiesCents: bigint("liabilities_cents", { mode: "number" }).notNull(),
    netCents: bigint("net_cents", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("net_worth_scope_date_idx").on(t.scopeType, t.scopeId, t.date)],
);

// Append-only feed of notable household events. Read on the Household page;
// also useful later for "what changed since I last logged in".
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_log_household_created_idx").on(t.householdId, t.createdAt)],
);

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  scopeType: text("scope_type", { enum: ["user", "household"] }).notNull(),
  scopeId: uuid("scope_id").notNull(),
  name: text("name").notNull(),
  targetCents: bigint("target_cents", { mode: "number" }).notNull(),
  currentCents: bigint("current_cents", { mode: "number" }).notNull().default(0),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
