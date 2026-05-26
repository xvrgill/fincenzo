"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  usePlaidLink,
  type PlaidLinkOnSuccess,
  type PlaidLinkOnExit,
} from "react-plaid-link";

// OAuth resume page. When a user picks an OAuth institution (Chase, Fidelity,
// etc.), Plaid Link redirects the browser to the bank's site, then back here
// with an `oauth_state_id` query param. We re-initialize Link with the
// original `link_token` (stashed in sessionStorage before handoff) plus
// `receivedRedirectUri: window.location.href` to resume the flow.
//
// On success we either exchange a public_token into a new item, or (in
// update mode) call /api/plaid/reauth to clear login_required, then bounce
// back to /accounts.

type StashedFlow =
  | { flow: "new" }
  | { flow: "update"; itemId: string };

const TOKEN_KEY = "plaid:oauth:link_token";
const FLOW_KEY = "plaid:oauth:flow";

export default function PlaidOAuthPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [stashed, setStashed] = useState<StashedFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    const f = sessionStorage.getItem(FLOW_KEY);
    if (!t || !f) {
      setError(
        "Missing link session. Please retry from the Accounts page.",
      );
      return;
    }
    try {
      setStashed(JSON.parse(f) as StashedFlow);
    } catch {
      setError("Invalid link session. Please retry from the Accounts page.");
      return;
    }
    setToken(t);
    setRedirectUri(window.location.href);
  }, []);

  const finish = useCallback(
    (ok: boolean) => {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(FLOW_KEY);
      if (ok) router.replace("/accounts");
    },
    [router],
  );

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token, metadata) => {
      if (!stashed) return;
      try {
        if (stashed.flow === "update") {
          const res = await fetch("/api/plaid/reauth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: stashed.itemId }),
          });
          if (!res.ok) {
            setError("Reconnect failed. Try again.");
            return;
          }
        } else {
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
          if (!res.ok) {
            setError("Link failed. Try again.");
            return;
          }
        }
        finish(true);
      } catch {
        setError("Network error. Try again.");
      }
    },
    [stashed, finish],
  );

  const onExit = useCallback<PlaidLinkOnExit>(() => {
    finish(false);
    router.replace("/accounts");
  }, [finish, router]);

  const { open, ready } = usePlaidLink({
    token,
    receivedRedirectUri: redirectUri ?? undefined,
    onSuccess,
    onExit,
  });

  useEffect(() => {
    if (ready && token && redirectUri) open();
  }, [ready, token, redirectUri, open]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium">
          {error ? "Couldn't finish linking" : "Finishing link…"}
        </p>
        <p className="text-xs text-muted-foreground">
          {error ?? "Plaid is reconnecting. This should only take a moment."}
        </p>
      </div>
    </div>
  );
}
