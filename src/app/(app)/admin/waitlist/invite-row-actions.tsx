"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { issueInvite, revokeInvite } from "./actions";

type Props = {
  id: string;
  state: "waiting" | "invited" | "expired" | "signed_up";
};

export function InviteRowActions({ id, state }: Props) {
  const [pending, startTransition] = useTransition();
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function onIssue() {
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const res = await issueInvite(fd);
      if (!res.ok || !res.url) {
        setError(res.error ?? "Failed to issue invite.");
        return;
      }
      setIssuedUrl(res.url);
    });
  }

  function onRevoke() {
    setError(null);
    setIssuedUrl(null);
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const res = await revokeInvite(fd);
      if (!res.ok) setError(res.error ?? "Failed to revoke.");
    });
  }

  async function onCopy() {
    if (!issuedUrl) return;
    await navigator.clipboard.writeText(issuedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (state === "signed_up") {
    return <span className="font-mono text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {state === "waiting" ? (
          <Button size="sm" onClick={onIssue} disabled={pending}>
            {pending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
            Issue invite
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={onIssue} disabled={pending}>
              {pending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
              Re-issue
            </Button>
            <Button size="sm" variant="ghost" onClick={onRevoke} disabled={pending}>
              <Trash2 className="size-3" />
              Revoke
            </Button>
          </>
        )}
      </div>

      {issuedUrl ? (
        <div className="flex max-w-md items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5">
          <code className="truncate font-mono text-[11px] text-foreground/90">{issuedUrl}</code>
          <Button size="sm" variant="ghost" onClick={onCopy} className="shrink-0">
            {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : null}

      {error ? <p className="font-mono text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
