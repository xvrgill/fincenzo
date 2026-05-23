"use client";

import { useTransition } from "react";
import { Lock, Users } from "lucide-react";
import { setAccountVisibility } from "@/app/(app)/accounts/actions";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  visibility: "private" | "household";
  disabled?: boolean;
};

export function VisibilityToggle({ id, visibility, disabled }: Props) {
  const [pending, startTransition] = useTransition();
  const shared = visibility === "household";

  return (
    <form
      action={(formData) => {
        formData.set("id", id);
        formData.set("visibility", shared ? "private" : "household");
        startTransition(() => setAccountVisibility(formData));
      }}
    >
      <button
        type="submit"
        disabled={disabled || pending}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] uppercase transition-colors",
          shared
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
          disabled && "cursor-not-allowed opacity-60",
        )}
        title={
          disabled
            ? "Join a household to share accounts"
            : shared
              ? "Click to make private"
              : "Click to share with household"
        }
      >
        {shared ? <Users className="size-3" /> : <Lock className="size-3" />}
        {shared ? "Shared" : "Private"}
      </button>
    </form>
  );
}
