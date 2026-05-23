"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { snapshotNetWorth } from "@/lib/queries/net-worth";
import { logIfInHousehold } from "@/lib/activity";

export async function setAccountVisibility(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const id = String(formData.get("id") ?? "");
  const visibility = String(formData.get("visibility") ?? "");
  if (!id) throw new Error("id required");
  if (visibility !== "private" && visibility !== "household") {
    throw new Error("invalid visibility");
  }

  const [updated] = await db
    .update(accounts)
    .set({ visibility })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
    .returning({ name: accounts.name, mask: accounts.mask });

  // Take a fresh snapshot so the household NW chart reflects the new
  // shared-account set immediately rather than waiting for the next sync.
  await snapshotNetWorth(user.id);
  if (updated) {
    await logIfInHousehold(
      user.id,
      visibility === "household" ? "account.shared" : "account.unshared",
      { accountName: updated.name, mask: updated.mask },
    );
  }

  revalidatePath("/accounts");
  revalidatePath("/net-worth");
  revalidatePath("/", "layout");
}
