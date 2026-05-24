"use client";

import { useTransition } from "react";
import { Unlink } from "lucide-react";
import { unlinkPlaidItem } from "@/app/(app)/accounts/actions";
import { Button } from "@/components/ui/button";

export function UnlinkItemButton({
  id,
  institutionName,
}: {
  id: string;
  institutionName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        const ok = window.confirm(
          `Unlink ${institutionName}? This removes the connection plus its accounts and transactions from Fincenzo. You can always re-link.`,
        );
        if (!ok) return;
        formData.set("id", id);
        startTransition(async () => {
          await unlinkPlaidItem(formData);
        });
      }}
    >
      <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label="Unlink institution">
        <Unlink className="size-4" />
        {pending ? "Unlinking…" : "Unlink"}
      </Button>
    </form>
  );
}
