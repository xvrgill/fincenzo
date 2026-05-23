"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts, categoryRules, transactions } from "@/lib/db/schema";

/**
 * Update a single transaction's category. When `applyToMerchant` is set, also
 * creates a `category_rule` keyed on the transaction's merchant name (or its
 * raw name as a fallback) and retroactively updates every other transaction
 * the user has from that same merchant.
 */
export async function setTransactionCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const transactionId = String(formData.get("transactionId") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const applyToMerchant = formData.get("applyToMerchant") === "on";

  if (!transactionId) throw new Error("transactionId required");
  if (!category) throw new Error("category required");

  // Look up the transaction (and confirm it belongs to this user).
  const [txn] = await db
    .select({
      id: transactions.id,
      merchantName: transactions.merchantName,
      name: transactions.name,
      accountUserId: accounts.userId,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!txn || txn.accountUserId !== user.id) {
    throw new Error("transaction not found");
  }

  await db
    .update(transactions)
    .set({ userCategory: category })
    .where(eq(transactions.id, transactionId));

  if (applyToMerchant) {
    const matchValue = (txn.merchantName ?? txn.name).trim();
    if (matchValue) {
      // Persist the rule for future syncs.
      await db.insert(categoryRules).values({
        userId: user.id,
        matchType: "merchant_equals",
        matchValue,
        category,
      });

      // Retroactively apply to every existing transaction this user has from
      // the same merchant (matching on merchant_name, falling back to name).
      const userTxns = await db
        .select({
          id: transactions.id,
          merchantName: transactions.merchantName,
          name: transactions.name,
        })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .where(eq(accounts.userId, user.id));

      const matchIds = userTxns
        .filter((t) => (t.merchantName ?? t.name).trim() === matchValue)
        .map((t) => t.id);

      if (matchIds.length > 0) {
        for (const id of matchIds) {
          await db
            .update(transactions)
            .set({ userCategory: category })
            .where(eq(transactions.id, id));
        }
      }
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function createSubstringRule(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const matchValue = String(formData.get("matchValue") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!matchValue) throw new Error("substring required");
  if (!category) throw new Error("category required");

  await db.insert(categoryRules).values({
    userId: user.id,
    matchType: "name_contains",
    matchValue,
    category,
  });

  // Retroactively apply to this user's existing transactions whose merchant_name
  // or name contains the substring (case-insensitive).
  const userTxns = await db
    .select({
      id: transactions.id,
      merchantName: transactions.merchantName,
      name: transactions.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        eq(accounts.userId, user.id),
        sql`(coalesce(${transactions.merchantName}, '') || ' ' || ${transactions.name}) ilike ${"%" + matchValue + "%"}`,
      ),
    );

  for (const t of userTxns) {
    await db
      .update(transactions)
      .set({ userCategory: category })
      .where(eq(transactions.id, t.id));
  }

  revalidatePath("/transactions");
  revalidatePath("/transactions/rules");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteCategoryRule(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  await db
    .delete(categoryRules)
    .where(and(eq(categoryRules.id, id), eq(categoryRules.userId, user.id)));

  revalidatePath("/transactions");
}
