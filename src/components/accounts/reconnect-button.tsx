"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Update-mode Link flow. The token is fetched lazily on click so we don't
// preload one per item — there can be many on the Accounts page.
export function ReconnectButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async () => {
    setWorking(true);
    try {
      const res = await fetch("/api/plaid/reauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (res.ok) {
        setLinkToken(null);
        router.refresh();
      } else {
        const body = (await res.json().catch(() => ({}))) as { errorMessage?: string };
        setError(body.errorMessage ?? "Reconnect failed. Try again.");
      }
    } finally {
      setWorking(false);
    }
  }, [itemId, router]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setLinkToken(null),
  });

  const fetchAndOpen = async () => {
    setError(null);
    setWorking(true);
    try {
      const res = await fetch("/api/plaid/link-token/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (!res.ok) {
        setError("Could not start reconnect. Try again.");
        return;
      }
      const { link_token } = (await res.json()) as { link_token: string };
      setLinkToken(link_token);
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => {
    if (linkToken && ready) {
      // Stash for the OAuth resume page (/plaid-oauth) in case Plaid hands
      // the user off to the bank's site for re-auth.
      sessionStorage.setItem("plaid:oauth:link_token", linkToken);
      sessionStorage.setItem(
        "plaid:oauth:flow",
        JSON.stringify({ flow: "update", itemId }),
      );
      open();
    }
  }, [linkToken, ready, open, itemId]);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={fetchAndOpen} disabled={working}>
        <RefreshCw className={`size-4 ${working ? "animate-spin" : ""}`} />
        {working ? "Reconnecting…" : "Reconnect"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
