"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LinkAccountButton() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/plaid/link-token", { method: "POST" });
      if (!res.ok) return;
      const { link_token } = (await res.json()) as { link_token: string };
      if (!cancelled) setLinkToken(link_token);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token, metadata) => {
      setExchanging(true);
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token,
            institution: metadata.institution
              ? {
                  institution_id: metadata.institution.institution_id,
                  name: metadata.institution.name,
                }
              : undefined,
          }),
        });
        if (res.ok) {
          router.refresh();
        }
      } finally {
        setExchanging(false);
      }
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <Button onClick={() => open()} disabled={!ready || !linkToken || exchanging}>
      <Plus className="size-4" />
      {exchanging ? "Linking…" : "Link account"}
    </Button>
  );
}
