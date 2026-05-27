import { and, asc, between, desc, eq, gt, gte, inArray, isNotNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { transactions } from "@/lib/db/schema";

export type FilterField = "merchant" | "name" | "category" | "amount" | "date";
export type TextOp = "contains" | "begins_with" | "ends_with" | "equals" | "not_contains";
export type NumericOp = "eq" | "gt" | "gte" | "lt" | "lte" | "between";
export type FilterOp = TextOp | NumericOp;

export type FilterRule = {
  field: FilterField;
  op: FilterOp;
  value: string;
  value2?: string;
};

export type SortKey =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc"
  | "merchant_asc"
  | "merchant_desc";

export type TxFilters = {
  q?: string;
  accountIds?: string[];
  categories?: string[];
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: "all" | "income" | "expense";
  pending?: "all" | "pending" | "posted";
  rules?: FilterRule[];
  sort?: SortKey;
};

const MAX_RULES = 12;
const MAX_VALUE_LEN = 100;

// Escape LIKE wildcards in user-provided text so a literal `%` stays literal.
function escapeLike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const merchantExpr = sql`coalesce(${transactions.merchantName}, ${transactions.name})`;
const categoryExpr = sql`coalesce(${transactions.userCategory}, ${transactions.plaidCategory})`;

function textPredicate(col: SQL, op: TextOp, raw: string): SQL | null {
  const v = raw.slice(0, MAX_VALUE_LEN);
  if (!v) return null;
  const esc = escapeLike(v);
  switch (op) {
    case "contains":
      return sql`${col} ilike ${`%${esc}%`}`;
    case "not_contains":
      return sql`${col} not ilike ${`%${esc}%`}`;
    case "begins_with":
      return sql`${col} ilike ${`${esc}%`}`;
    case "ends_with":
      return sql`${col} ilike ${`%${esc}`}`;
    case "equals":
      return sql`lower(${col}) = lower(${v})`;
  }
}

function numericPredicate(col: SQL, op: NumericOp, v1: string, v2?: string): SQL | null {
  const n1 = Number(v1);
  if (!Number.isFinite(n1)) return null;
  switch (op) {
    case "eq":
      return sql`${col} = ${n1}`;
    case "gt":
      return sql`${col} > ${n1}`;
    case "gte":
      return sql`${col} >= ${n1}`;
    case "lt":
      return sql`${col} < ${n1}`;
    case "lte":
      return sql`${col} <= ${n1}`;
    case "between": {
      const n2 = Number(v2);
      if (!Number.isFinite(n2)) return null;
      const lo = Math.min(n1, n2);
      const hi = Math.max(n1, n2);
      return sql`${col} between ${lo} and ${hi}`;
    }
    default:
      return null;
  }
}

function datePredicate(op: NumericOp, v1: string, v2?: string): SQL | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v1)) return null;
  const col = transactions.date;
  switch (op) {
    case "eq":
      return eq(col, v1);
    case "gt":
      return gt(col, v1);
    case "gte":
      return gte(col, v1);
    case "lt":
      return lt(col, v1);
    case "lte":
      return lte(col, v1);
    case "between":
      if (!v2 || !/^\d{4}-\d{2}-\d{2}$/.test(v2)) return null;
      return between(col, v1 < v2 ? v1 : v2, v1 < v2 ? v2 : v1);
    default:
      return null;
  }
}

function ruleToPredicate(rule: FilterRule): SQL | null {
  switch (rule.field) {
    case "merchant":
      return textPredicate(merchantExpr, rule.op as TextOp, rule.value);
    case "name":
      return textPredicate(sql`${transactions.name}`, rule.op as TextOp, rule.value);
    case "category":
      return and(
        isNotNull(categoryExpr),
        textPredicate(categoryExpr, rule.op as TextOp, rule.value)!,
      )!;
    case "amount":
      // amount filter is on absolute dollar value to feel intuitive to users.
      return numericPredicate(
        sql`abs(${transactions.amountCents}) / 100.0`,
        rule.op as NumericOp,
        rule.value,
        rule.value2,
      );
    case "date":
      return datePredicate(rule.op as NumericOp, rule.value, rule.value2);
    default:
      return null;
  }
}

export function buildWhere(filters: TxFilters, baseScope: SQL): SQL {
  const parts: SQL[] = [baseScope];

  if (filters.q && filters.q.trim()) {
    const esc = escapeLike(filters.q.trim().slice(0, MAX_VALUE_LEN));
    parts.push(
      or(
        sql`${transactions.name} ilike ${`%${esc}%`}`,
        sql`${transactions.merchantName} ilike ${`%${esc}%`}`,
        sql`${transactions.originalDescription} ilike ${`%${esc}%`}`,
      )!,
    );
  }

  if (filters.accountIds && filters.accountIds.length > 0) {
    parts.push(inArray(transactions.accountId, filters.accountIds));
  }

  if (filters.categories && filters.categories.length > 0) {
    parts.push(inArray(categoryExpr, filters.categories));
  }

  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
    parts.push(gte(transactions.date, filters.from));
  }
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    parts.push(lte(transactions.date, filters.to));
  }

  if (filters.minAmount !== undefined && Number.isFinite(filters.minAmount)) {
    parts.push(sql`abs(${transactions.amountCents}) >= ${Math.round(filters.minAmount * 100)}`);
  }
  if (filters.maxAmount !== undefined && Number.isFinite(filters.maxAmount)) {
    parts.push(sql`abs(${transactions.amountCents}) <= ${Math.round(filters.maxAmount * 100)}`);
  }

  if (filters.type === "income") {
    parts.push(lt(transactions.amountCents, 0));
  } else if (filters.type === "expense") {
    parts.push(gt(transactions.amountCents, 0));
  }

  if (filters.pending === "pending") {
    parts.push(eq(transactions.pending, true));
  } else if (filters.pending === "posted") {
    parts.push(eq(transactions.pending, false));
  }

  if (filters.rules && filters.rules.length > 0) {
    for (const rule of filters.rules.slice(0, MAX_RULES)) {
      const p = ruleToPredicate(rule);
      if (p) parts.push(p);
    }
  }

  return and(...parts)!;
}

export function buildOrderBy(sort: SortKey = "date_desc"): SQL[] {
  switch (sort) {
    case "date_asc":
      return [asc(transactions.date), asc(transactions.createdAt)];
    case "amount_desc":
      return [desc(sql`abs(${transactions.amountCents})`), desc(transactions.date)];
    case "amount_asc":
      return [asc(sql`abs(${transactions.amountCents})`), desc(transactions.date)];
    case "merchant_asc":
      return [asc(merchantExpr), desc(transactions.date)];
    case "merchant_desc":
      return [desc(merchantExpr), desc(transactions.date)];
    case "date_desc":
    default:
      return [desc(transactions.date), desc(transactions.createdAt)];
  }
}

// Decode/encode helpers so URL state stays compact and safe.
export function parseFiltersFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): TxFilters {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const csv = (k: string) => {
    const v = get(k);
    return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  };
  const num = (k: string) => {
    const v = get(k);
    if (v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  let rules: FilterRule[] | undefined;
  const rulesRaw = get("rules");
  if (rulesRaw) {
    try {
      const parsed = JSON.parse(rulesRaw);
      if (Array.isArray(parsed)) {
        rules = parsed
          .slice(0, MAX_RULES)
          .filter(
            (r): r is FilterRule =>
              r && typeof r === "object" &&
              typeof r.field === "string" &&
              typeof r.op === "string" &&
              typeof r.value === "string",
          );
      }
    } catch {
      // ignore malformed
    }
  }

  const type = get("type");
  const pending = get("pending");
  const sort = get("sort") as SortKey | undefined;

  return {
    q: get("q") || undefined,
    accountIds: csv("accounts"),
    categories: csv("categories"),
    from: get("from") || undefined,
    to: get("to") || undefined,
    minAmount: num("min"),
    maxAmount: num("max"),
    type: type === "income" || type === "expense" ? type : "all",
    pending: pending === "pending" || pending === "posted" ? pending : "all",
    rules,
    sort: sort ?? "date_desc",
  };
}

