"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { ChevronDown, Landmark, LineChart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type LinkMode = "banking" | "investments";

function useLinkToken(mode: LinkMode) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/plaid/link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) return;
      const { link_token } = (await res.json()) as { link_token: string };
      if (!cancelled) setToken(link_token);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);
  return token;
}

export function LinkAccountButton() {
  const router = useRouter();
  const [exchanging, setExchanging] = useState(false);
  const [pending, setPending] = useState<LinkMode | null>(null);

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
        setPending(null);
      }
    },
    [router],
  );

  const bankingToken = useLinkToken("banking");
  const investmentsToken = useLinkToken("investments");

  const banking = usePlaidLink({ token: bankingToken, onSuccess });
  const investments = usePlaidLink({ token: investmentsToken, onSuccess });

  // Open Link as soon as the relevant token+SDK become ready for the picked
  // mode. The dropdown item fires before the SDK is necessarily initialized.
  // Before opening, stash the token in sessionStorage so the OAuth resume
  // page (/plaid-oauth) can re-init Link with `receivedRedirectUri` for
  // OAuth institutions like Chase, Fidelity, etc.
  useEffect(() => {
    const stash = (token: string) => {
      sessionStorage.setItem("plaid:oauth:link_token", token);
      sessionStorage.setItem(
        "plaid:oauth:flow",
        JSON.stringify({ flow: "new" }),
      );
    };
    if (pending === "banking" && banking.ready && bankingToken) {
      stash(bankingToken);
      banking.open();
      setPending((p) => (p === "banking" ? null : p));
    } else if (
      pending === "investments" &&
      investments.ready &&
      investmentsToken
    ) {
      stash(investmentsToken);
      investments.open();
      setPending((p) => (p === "investments" ? null : p));
    }
  }, [pending, banking, investments, bankingToken, investmentsToken]);

  const disabled = exchanging || pending !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button disabled={disabled}>
            <Plus className="size-4" />
            {exchanging ? "Linking…" : "Link account"}
            <ChevronDown className="size-4 opacity-70" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => setPending("banking")}>
          <Landmark className="size-4" />
          <div className="flex flex-col">
            <span>Bank or credit card</span>
            <span className="text-xs text-muted-foreground">
              Checking, savings, cards
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPending("investments")}>
          <LineChart className="size-4" />
          <div className="flex flex-col">
            <span>Investment account</span>
            <span className="text-xs text-muted-foreground">
              Brokerage, 401(k), IRA
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
