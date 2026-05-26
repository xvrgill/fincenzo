"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  consumeInviteToken,
  lookupInviteToken,
} from "@/lib/waitlist/invite-token";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const token = String(formData.get("token") ?? "");

  const invite = await lookupInviteToken(token);
  if (invite.kind !== "valid") {
    redirect("/sign-up?error=invite_required");
  }

  // Email comes from the invite, not the form — the user can't change it.
  const email = invite.email;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });
  if (error) {
    const params = new URLSearchParams({ token, error: error.message });
    redirect(`/sign-up?${params.toString()}`);
  }

  // Token is single-use; consume only after Supabase accepted the signup so a
  // failed call (e.g. weak password) leaves the invite usable for a retry.
  await consumeInviteToken(token);

  redirect("/sign-up?check_email=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
