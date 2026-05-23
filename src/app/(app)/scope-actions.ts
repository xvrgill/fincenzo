"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SCOPE_COOKIE } from "@/lib/scope";

export async function setScope(formData: FormData) {
  const value = String(formData.get("scope") ?? "user");
  const store = await cookies();
  if (value === "household") {
    store.set(SCOPE_COOKIE, "household", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    store.delete(SCOPE_COOKIE);
  }
  revalidatePath("/", "layout");
}
