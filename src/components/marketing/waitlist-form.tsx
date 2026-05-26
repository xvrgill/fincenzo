"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

export function WaitlistForm({
  source,
  size = "default",
}: {
  source: "hero" | "footer";
  size?: "default" | "lg";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // Honeypot value. Bots fill every text input; real users never see this one.
  const [website, setWebsite] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, website }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex w-full max-w-lg items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 motion-safe:animate-[heroFade_400ms_ease-out_both]">
        <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" />
        </span>
        <div className="font-mono text-sm">
          <p className="font-medium text-foreground">You&apos;re on the list.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We&apos;ll email you when the next batch of invites goes out. No drip campaign, no spam.
          </p>
        </div>
      </div>
    );
  }

  const inputHeight = size === "lg" ? "h-11" : "h-10";

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={status === "submitting"}
          aria-invalid={status === "error" || undefined}
          className={cn(
            inputHeight,
            "flex-1 rounded-lg border border-border bg-card/40 px-4 font-mono text-sm placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-60",
          )}
        />
        {/* Honeypot — visually hidden, not display:none so bots see it */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="pointer-events-none absolute left-[-9999px] size-0 opacity-0"
          aria-hidden
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className={cn(
            buttonVariants({ variant: "default", size: size === "lg" ? "lg" : "default" }),
            inputHeight,
          )}
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>Request access →</>
          )}
        </button>
      </div>
      {status === "error" && message ? (
        <p role="alert" className="font-mono text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </form>
  );
}
