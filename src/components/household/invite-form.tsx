"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { inviteToHousehold } from "@/app/(app)/household/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  return (
    <form
      id="invite-form"
      className="grid items-end gap-3 sm:grid-cols-[1fr_auto]"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            const email = String(formData.get("email") ?? "");
            await inviteToHousehold(formData);
            (document.getElementById("invite-form") as HTMLFormElement | null)?.reset();
            setMessage({ kind: "ok", text: `Invite sent to ${email}.` });
          } catch (e) {
            setMessage({
              kind: "err",
              text: e instanceof Error ? e.message : "Something went wrong",
            });
          }
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="invite-email">Invite by email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          placeholder="partner@example.com"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        <Mail className="size-4" />
        {pending ? "Sending…" : "Send invite"}
      </Button>
      {message ? (
        <p
          className={`text-xs sm:col-span-2 ${
            message.kind === "ok" ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
