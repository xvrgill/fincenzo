"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownUp,
  ChevronDown,
  ExternalLink,
  Filter as FilterIcon,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerAvatar } from "@/components/owner-avatar";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { formatDate, formatMoneyCents, prettifyCategory } from "@/lib/format";
import type {
  FilterField,
  FilterOp,
  FilterRule,
  SortKey,
} from "@/lib/transactions/filters";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amountCents: number;
  isoCurrencyCode: string | null;
  effectiveCategory: string | null;
  pending: boolean;
  accountId: string;
  accountName: string;
  accountMask: string | null;
  ownerUserId: string;
  ownerDisplayName: string | null;
  ownerEmail: string;
  paymentChannel: string | null;
  merchantLogoUrl: string | null;
  merchantWebsite: string | null;
  originalDescription: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationRegion: string | null;
  locationPostalCode: string | null;
  locationCountry: string | null;
  locationLat: number | null;
  locationLon: number | null;
  locationStoreNumber: string | null;
};

type AccountOpt = {
  id: string;
  name: string;
  mask: string | null;
  ownerUserId: string;
  ownerDisplayName: string | null;
  ownerEmail: string;
};

type Props = {
  currentUserId: string;
  rows: Row[];
  accounts: AccountOpt[];
  availableCategories: string[];
  isHouseholdScope: boolean;
  mapboxToken: string | null;
};

const TEXT_OPS: { value: FilterOp; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "begins_with", label: "begins with" },
  { value: "ends_with", label: "ends with" },
  { value: "equals", label: "equals" },
];
const NUM_OPS: { value: FilterOp; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "between", label: "between" },
];

const FIELDS: { value: FilterField; label: string; kind: "text" | "number" | "date" }[] = [
  { value: "merchant", label: "Merchant", kind: "text" },
  { value: "name", label: "Description", kind: "text" },
  { value: "category", label: "Category", kind: "text" },
  { value: "amount", label: "Amount", kind: "number" },
  { value: "date", label: "Date", kind: "date" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Amount: high to low" },
  { value: "amount_asc", label: "Amount: low to high" },
  { value: "merchant_asc", label: "Merchant A → Z" },
  { value: "merchant_desc", label: "Merchant Z → A" },
];

function opsForField(field: FilterField) {
  const f = FIELDS.find((x) => x.value === field);
  return f && f.kind === "text" ? TEXT_OPS : NUM_OPS;
}
function defaultOpForField(field: FilterField): FilterOp {
  return opsForField(field)[0].value;
}
function inputTypeForField(field: FilterField): "text" | "number" | "date" {
  return FIELDS.find((x) => x.value === field)?.kind ?? "text";
}

export function TransactionsView({
  currentUserId,
  rows,
  accounts,
  availableCategories,
  isHouseholdScope,
  mapboxToken,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const detailId = searchParams.get("txn");
  const activeRow = useMemo(() => rows.find((r) => r.id === detailId) ?? null, [rows, detailId]);

  // URL is the source of truth for everything except the search input, which
  // we mirror locally so we can debounce typing without one URL write per key.
  const initial = useMemo(() => readFromSearchParams(searchParams), [searchParams]);
  const selectedAccounts = useMemo(() => new Set(initial.accountIds), [initial.accountIds]);
  const type = initial.type;
  const pendingState = initial.pending;
  const sort = initial.sort;
  const rules = initial.rules;

  const [q, setQ] = useState(initial.q);
  // Adjust local q if the URL q changes from elsewhere (back/forward, clear all).
  const [prevUrlQ, setPrevUrlQ] = useState(initial.q);
  if (initial.q !== prevUrlQ) {
    setPrevUrlQ(initial.q);
    setQ(initial.q);
  }

  const ownerLookup = useMemo(() => {
    const map = new Map<string, { name: string | null; email: string }>();
    for (const a of accounts) {
      map.set(a.ownerUserId, { name: a.ownerDisplayName, email: a.ownerEmail });
    }
    return map;
  }, [accounts]);

  const pushFilters = useCallback(
    (next: {
      q?: string;
      accountIds?: string[];
      type?: "all" | "income" | "expense";
      pending?: "all" | "pending" | "posted";
      sort?: SortKey;
      rules?: FilterRule[];
      txn?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, value: string | undefined) => {
        if (value === undefined || value === "" || value === "all") params.delete(key);
        else params.set(key, value);
      };
      if (next.q !== undefined) setOrDelete("q", next.q);
      if (next.accountIds !== undefined) {
        if (next.accountIds.length === 0) params.delete("accounts");
        else params.set("accounts", next.accountIds.join(","));
      }
      if (next.type !== undefined) setOrDelete("type", next.type);
      if (next.pending !== undefined) setOrDelete("pending", next.pending);
      if (next.sort !== undefined) setOrDelete("sort", next.sort === "date_desc" ? undefined : next.sort);
      if (next.rules !== undefined) {
        if (next.rules.length === 0) params.delete("rules");
        else params.set("rules", JSON.stringify(next.rules));
      }
      if (next.txn !== undefined) {
        if (next.txn) params.set("txn", next.txn);
        else params.delete("txn");
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  // Debounce the search input so we don't refetch on every keystroke.
  useEffect(() => {
    if (q === initial.q) return;
    const t = setTimeout(() => pushFilters({ q }), 250);
    return () => clearTimeout(t);
  }, [q, initial.q, pushFilters]);

  const hasActiveFilters =
    q !== "" ||
    selectedAccounts.size > 0 ||
    type !== "all" ||
    pendingState !== "all" ||
    rules.length > 0;

  const clearAll = () => {
    setQ("");
    pushFilters({
      q: "",
      accountIds: [],
      type: "all",
      pending: "all",
      rules: [],
    });
  };

  const toggleAccount = (id: string) => {
    const next = new Set(selectedAccounts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    pushFilters({ accountIds: Array.from(next) });
  };

  const accountsByOwner = useMemo(() => {
    const map = new Map<string, AccountOpt[]>();
    for (const a of accounts) {
      const list = map.get(a.ownerUserId) ?? [];
      list.push(a);
      map.set(a.ownerUserId, list);
    }
    return map;
  }, [accounts]);

  const canEdit = (ownerUserId: string) => ownerUserId === currentUserId;

  return (
    <div className={cn("flex flex-col gap-3", pending && "opacity-90")}>
      <Toolbar
        q={q}
        setQ={setQ}
        accounts={accounts}
        accountsByOwner={accountsByOwner}
        selectedAccounts={selectedAccounts}
        toggleAccount={toggleAccount}
        clearAccounts={() => pushFilters({ accountIds: [] })}
        type={type}
        setType={(v) => pushFilters({ type: v })}
        pendingState={pendingState}
        setPendingState={(v) => pushFilters({ pending: v })}
        sort={sort}
        setSort={(v) => pushFilters({ sort: v })}
        rules={rules}
        setRules={(next) => pushFilters({ rules: next })}
        hasActiveFilters={hasActiveFilters}
        clearAll={clearAll}
        isHouseholdScope={isHouseholdScope}
      />

      {hasActiveFilters ? (
        <ActiveChips
          q={q}
          clearQ={() => {
            setQ("");
            pushFilters({ q: "" });
          }}
          selectedAccounts={selectedAccounts}
          accounts={accounts}
          toggleAccount={toggleAccount}
          type={type}
          clearType={() => pushFilters({ type: "all" })}
          pendingState={pendingState}
          clearPending={() => pushFilters({ pending: "all" })}
          rules={rules}
          removeRule={(idx) => {
            const next = rules.filter((_, i) => i !== idx);
            pushFilters({ rules: next });
          }}
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {rows.map((t) => {
              const outgoing = t.amountCents > 0;
              const merchantLabel = t.merchantName ?? t.name;
              const owner = ownerLookup.get(t.ownerUserId);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => pushFilters({ txn: t.id })}
                    className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    {isHouseholdScope ? (
                      <OwnerAvatar
                        userId={t.ownerUserId}
                        name={owner?.name ?? t.ownerDisplayName}
                        email={owner?.email ?? t.ownerEmail}
                        size="sm"
                      />
                    ) : (
                      <span className="hidden w-12 text-xs text-muted-foreground sm:block">
                        {formatDate(t.date)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {merchantLabel}
                        {t.pending ? (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                            pending
                          </span>
                        ) : null}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                        {isHouseholdScope ? (
                          <span>{formatDate(t.date)}</span>
                        ) : (
                          <span className="sm:hidden">{formatDate(t.date)}</span>
                        )}
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">
                          {t.accountName}
                          {t.accountMask ? ` ••${t.accountMask}` : ""}
                        </span>
                        {t.effectiveCategory ? (
                          <>
                            <span>•</span>
                            <span className="italic">
                              {prettifyCategory(t.effectiveCategory)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        outgoing ? "text-foreground" : "text-emerald-600",
                      )}
                    >
                      {outgoing ? "-" : "+"}
                      {formatMoneyCents(Math.abs(t.amountCents), t.isoCurrencyCode ?? "USD")}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {activeRow ? (
        <DetailSheet
          row={activeRow}
          canEdit={canEdit(activeRow.ownerUserId)}
          availableCategories={availableCategories}
          owner={ownerLookup.get(activeRow.ownerUserId)}
          mapboxToken={mapboxToken}
          onClose={() => pushFilters({ txn: null })}
        />
      ) : null}
    </div>
  );
}

// ---------- Toolbar ----------

type ToolbarProps = {
  q: string;
  setQ: (v: string) => void;
  accounts: AccountOpt[];
  accountsByOwner: Map<string, AccountOpt[]>;
  selectedAccounts: Set<string>;
  toggleAccount: (id: string) => void;
  clearAccounts: () => void;
  type: "all" | "income" | "expense";
  setType: (v: "all" | "income" | "expense") => void;
  pendingState: "all" | "pending" | "posted";
  setPendingState: (v: "all" | "pending" | "posted") => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  rules: FilterRule[];
  setRules: (next: FilterRule[]) => void;
  hasActiveFilters: boolean;
  clearAll: () => void;
  isHouseholdScope: boolean;
};

function Toolbar(props: ToolbarProps) {
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);

  const accountLabel =
    props.selectedAccounts.size === 0
      ? "All accounts"
      : props.selectedAccounts.size === 1
        ? props.accounts.find((a) => a.id === Array.from(props.selectedAccounts)[0])?.name ??
          "1 account"
        : `${props.selectedAccounts.size} accounts`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={props.q}
          onChange={(e) => props.setQ(e.target.value)}
          placeholder="Search merchant or description"
          className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <Popover
        open={accountsOpen}
        onOpenChange={setAccountsOpen}
        trigger={
          <ToolbarButton active={props.selectedAccounts.size > 0}>
            {accountLabel}
            <ChevronDown className="size-3" />
          </ToolbarButton>
        }
      >
        <div className="flex max-h-72 w-64 flex-col">
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <span className="text-xs font-medium">Filter by account</span>
            {props.selectedAccounts.size > 0 ? (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  props.clearAccounts();
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="overflow-y-auto py-1">
            {Array.from(props.accountsByOwner.entries()).map(([ownerId, opts]) => {
              const owner = opts[0];
              return (
                <div key={ownerId}>
                  {props.isHouseholdScope ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <OwnerAvatar
                        userId={ownerId}
                        name={owner.ownerDisplayName}
                        email={owner.ownerEmail}
                        size="xs"
                      />
                      {owner.ownerDisplayName ?? owner.ownerEmail}
                    </div>
                  ) : null}
                  {opts.map((a) => {
                    const selected = props.selectedAccounts.has(a.id);
                    return (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => props.toggleAccount(a.id)}
                          className="size-3.5"
                        />
                        <span className="truncate">
                          {a.name}
                          {a.mask ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ••{a.mask}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Popover>

      <Popover
        open={sortOpen}
        onOpenChange={setSortOpen}
        trigger={
          <ToolbarButton>
            <ArrowDownUp className="size-3" />
            {SORT_OPTIONS.find((s) => s.value === props.sort)?.label ?? "Sort"}
            <ChevronDown className="size-3" />
          </ToolbarButton>
        }
      >
        <div className="flex w-52 flex-col py-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                props.setSort(opt.value);
                setSortOpen(false);
              }}
              className={cn(
                "px-3 py-1.5 text-left text-sm hover:bg-muted/50",
                props.sort === opt.value && "font-medium",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Popover>

      <Popover
        open={moreOpen}
        onOpenChange={setMoreOpen}
        trigger={
          <ToolbarButton
            active={props.type !== "all" || props.pendingState !== "all"}
          >
            <FilterIcon className="size-3" />
            More
          </ToolbarButton>
        }
      >
        <div className="flex w-56 flex-col gap-3 p-3 text-sm">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Type</p>
            <div className="grid grid-cols-3 gap-1">
              {(["all", "expense", "income"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => props.setType(v)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs capitalize",
                    props.type === v
                      ? "border-foreground bg-foreground text-background"
                      : "hover:bg-muted/50",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Status</p>
            <div className="grid grid-cols-3 gap-1">
              {(["all", "posted", "pending"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => props.setPendingState(v)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs capitalize",
                    props.pendingState === v
                      ? "border-foreground bg-foreground text-background"
                      : "hover:bg-muted/50",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Popover>

      <button
        type="button"
        onClick={() => setBuilderOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs transition-colors",
          props.rules.length > 0
            ? "border-foreground/30 bg-foreground/5 text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Plus className="size-3" />
        {props.rules.length > 0 ? `Filters (${props.rules.length})` : "Add filter"}
      </button>

      {props.hasActiveFilters ? (
        <button
          type="button"
          onClick={props.clearAll}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      ) : null}

      {builderOpen ? (
        <div className="basis-full">
          <FilterBuilder rules={props.rules} setRules={props.setRules} />
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  children,
  active,
  ...rest
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs transition-colors",
        active
          ? "border-foreground/30 bg-foreground/5 text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------- Popover (tiny click-outside primitive) ----------

function Popover({
  open,
  onOpenChange,
  trigger,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={wrapRef} className="relative">
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {children}
        </div>
      ) : null}
    </div>
  );
}

// ---------- Active filter chips ----------

function ActiveChips({
  q,
  clearQ,
  selectedAccounts,
  accounts,
  toggleAccount,
  type,
  clearType,
  pendingState,
  clearPending,
  rules,
  removeRule,
}: {
  q: string;
  clearQ: () => void;
  selectedAccounts: Set<string>;
  accounts: AccountOpt[];
  toggleAccount: (id: string) => void;
  type: "all" | "income" | "expense";
  clearType: () => void;
  pendingState: "all" | "pending" | "posted";
  clearPending: () => void;
  rules: FilterRule[];
  removeRule: (idx: number) => void;
}) {
  const chip = (label: string, onClear: () => void, key: string) => (
    <span
      key={key}
      className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs"
    >
      {label}
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Remove filter"
      >
        <X className="size-3" />
      </button>
    </span>
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {q ? chip(`“${q}”`, clearQ, "q") : null}
      {type !== "all" ? chip(`Type: ${type}`, clearType, "type") : null}
      {pendingState !== "all" ? chip(`Status: ${pendingState}`, clearPending, "pending") : null}
      {Array.from(selectedAccounts).map((id) => {
        const a = accounts.find((x) => x.id === id);
        if (!a) return null;
        return chip(`Account: ${a.name}`, () => toggleAccount(id), `acc-${id}`);
      })}
      {rules.map((r, i) => {
        const fieldLabel = FIELDS.find((f) => f.value === r.field)?.label ?? r.field;
        const opLabel =
          opsForField(r.field).find((o) => o.value === r.op)?.label ?? r.op;
        const valueLabel =
          r.op === "between"
            ? `${r.value} – ${r.value2 ?? ""}`
            : r.value;
        return chip(
          `${fieldLabel} ${opLabel} ${valueLabel}`,
          () => removeRule(i),
          `rule-${i}`,
        );
      })}
    </div>
  );
}

// ---------- Filter builder ----------

function FilterBuilder({
  rules,
  setRules,
}: {
  rules: FilterRule[];
  setRules: (next: FilterRule[]) => void;
}) {
  const addRule = () => {
    setRules([
      ...rules,
      { field: "merchant", op: defaultOpForField("merchant"), value: "" },
    ]);
  };
  const update = (idx: number, patch: Partial<FilterRule>) => {
    setRules(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const remove = (idx: number) => setRules(rules.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Build a query without regex. Rules are combined with AND.
      </p>
      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground">No rules yet.</p>
      ) : null}
      {rules.map((r, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-1.5"
        >
          {i > 0 ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              and
            </span>
          ) : null}
          <select
            value={r.field}
            onChange={(e) => {
              const field = e.target.value as FilterField;
              update(i, {
                field,
                op: defaultOpForField(field),
                value: "",
                value2: undefined,
              });
            }}
            className="h-7 rounded border bg-transparent px-1.5 text-xs"
          >
            {FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={r.op}
            onChange={(e) => update(i, { op: e.target.value as FilterOp })}
            className="h-7 rounded border bg-transparent px-1.5 text-xs"
          >
            {opsForField(r.field).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type={inputTypeForField(r.field)}
            value={r.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="value"
            className="h-7 min-w-0 flex-1 rounded border bg-transparent px-1.5 text-xs"
          />
          {r.op === "between" ? (
            <>
              <span className="text-xs text-muted-foreground">and</span>
              <input
                type={inputTypeForField(r.field)}
                value={r.value2 ?? ""}
                onChange={(e) => update(i, { value2: e.target.value })}
                placeholder="value"
                className="h-7 min-w-0 flex-1 rounded border bg-transparent px-1.5 text-xs"
              />
            </>
          ) : null}
          <button
            type="button"
            onClick={() => remove(i)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Remove rule"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="xs" onClick={addRule}>
          <Plus className="size-3" /> Add rule
        </Button>
      </div>
    </div>
  );
}

// ---------- Detail sheet ----------

function DetailSheet({
  row,
  canEdit,
  availableCategories,
  owner,
  mapboxToken,
  onClose,
}: {
  row: Row;
  canEdit: boolean;
  availableCategories: string[];
  owner: { name: string | null; email: string } | undefined;
  mapboxToken: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock body scroll while the sheet is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const outgoing = row.amountCents > 0;
  const merchantLabel = row.merchantName ?? row.name;
  const hasLocation = row.locationLat != null && row.locationLon != null;
  const addressParts = [
    row.locationAddress,
    [row.locationCity, row.locationRegion].filter(Boolean).join(", "),
    row.locationPostalCode,
    row.locationCountry,
  ].filter(Boolean);
  const addressText = addressParts.join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px] animate-in fade-in-0"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-full max-w-md flex-col bg-background shadow-xl animate-in slide-in-from-right duration-200"
      >
        <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {row.merchantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.merchantLogoUrl}
                alt=""
                className="size-10 shrink-0 rounded-md bg-muted object-contain ring-1 ring-black/5"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground">
                {merchantLabel.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{merchantLabel}</h2>
              <p className="text-xs text-muted-foreground">{formatDate(row.date)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-3xl font-semibold tabular-nums",
                outgoing ? "text-foreground" : "text-emerald-600",
              )}
            >
              {outgoing ? "-" : "+"}
              {formatMoneyCents(Math.abs(row.amountCents), row.isoCurrencyCode ?? "USD")}
            </span>
            {row.pending ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                pending
              </span>
            ) : null}
          </div>

          <dl className="mt-5 grid grid-cols-[110px_1fr] gap-y-2.5 text-sm">
            <dt className="text-muted-foreground">Account</dt>
            <dd className="flex items-center gap-2">
              <OwnerAvatar
                userId={row.ownerUserId}
                name={owner?.name ?? row.ownerDisplayName}
                email={owner?.email ?? row.ownerEmail}
                size="xs"
              />
              <span className="truncate">
                {row.accountName}
                {row.accountMask ? (
                  <span className="ml-1 text-muted-foreground">••{row.accountMask}</span>
                ) : null}
              </span>
            </dd>

            <dt className="text-muted-foreground">Category</dt>
            <dd>
              {canEdit ? (
                <CategoryPicker
                  transactionId={row.id}
                  currentCategory={row.effectiveCategory}
                  merchantLabel={merchantLabel}
                  availableCategories={availableCategories}
                />
              ) : (
                <span className="italic text-muted-foreground">
                  {row.effectiveCategory
                    ? prettifyCategory(row.effectiveCategory)
                    : "Uncategorized"}
                </span>
              )}
            </dd>

            {row.paymentChannel ? (
              <>
                <dt className="text-muted-foreground">Channel</dt>
                <dd className="capitalize">{row.paymentChannel}</dd>
              </>
            ) : null}

            {row.merchantWebsite ? (
              <>
                <dt className="text-muted-foreground">Website</dt>
                <dd>
                  <a
                    href={`https://${row.merchantWebsite}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
                  >
                    {row.merchantWebsite}
                    <ExternalLink className="size-3" />
                  </a>
                </dd>
              </>
            ) : null}

            {row.originalDescription ? (
              <>
                <dt className="text-muted-foreground">Original</dt>
                <dd className="break-words text-muted-foreground">
                  {row.originalDescription}
                </dd>
              </>
            ) : null}
          </dl>

          {hasLocation || addressText ? (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MapPin className="size-3" /> Location
              </p>
              {hasLocation && mapboxToken ? (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${row.locationLat}&mlon=${row.locationLon}#map=16/${row.locationLat}/${row.locationLon}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block overflow-hidden rounded-md border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mapboxStaticUrl(
                      row.locationLat!,
                      row.locationLon!,
                      mapboxToken,
                    )}
                    alt={`Map of ${merchantLabel}`}
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                </a>
              ) : null}
              {addressText ? (
                <p className="mt-2 text-sm text-muted-foreground">{addressText}</p>
              ) : !mapboxToken && hasLocation ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> to
                  show a map.
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-6 text-[10px] text-muted-foreground/70">ID: {row.id}</p>
        </div>
      </aside>
    </div>
  );
}

function mapboxStaticUrl(lat: number, lon: number, token: string): string {
  const pin = `pin-s+5b5b5b(${lon},${lat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pin}/${lon},${lat},14,0/600x300@2x?access_token=${token}`;
}

// ---------- helpers ----------

type InitialState = {
  q: string;
  accountIds: string[];
  type: "all" | "income" | "expense";
  pending: "all" | "pending" | "posted";
  sort: SortKey;
  rules: FilterRule[];
};

function readFromSearchParams(sp: URLSearchParams): InitialState {
  const accountIds = (sp.get("accounts") ?? "").split(",").filter(Boolean);
  const type = sp.get("type");
  const pendingParam = sp.get("pending");
  const sort = sp.get("sort") as SortKey | null;
  let rules: FilterRule[] = [];
  const rulesRaw = sp.get("rules");
  if (rulesRaw) {
    try {
      const parsed = JSON.parse(rulesRaw);
      if (Array.isArray(parsed)) {
        rules = parsed.filter(
          (r): r is FilterRule =>
            r && typeof r === "object" &&
            typeof r.field === "string" &&
            typeof r.op === "string" &&
            typeof r.value === "string",
        );
      }
    } catch {
      // ignore
    }
  }
  return {
    q: sp.get("q") ?? "",
    accountIds,
    type: type === "income" || type === "expense" ? type : "all",
    pending: pendingParam === "pending" || pendingParam === "posted" ? pendingParam : "all",
    sort: sort ?? "date_desc",
    rules,
  };
}
