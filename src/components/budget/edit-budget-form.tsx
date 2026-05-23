"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { setBudget } from "@/app/(app)/budget/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  category: string;
  month: string;
  limitCents: number;
  /** Forwarded to setBudget so an edit targets the correct row when both a
   * shared and a personal budget exist for the same category. */
  sharing?: "shared" | "personal";
};

export function EditBudgetForm({ category, month, limitCents, sharing }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit limit">
        <Pencil className="size-4" />
      </Button>
    );
  }

  return (
    <form
      className="flex items-center gap-1"
      action={(formData) => {
        formData.set("category", category);
        formData.set("month", month);
        if (sharing) formData.set("sharing", sharing);
        startTransition(async () => {
          try {
            await setBudget(formData);
          } finally {
            setEditing(false);
          }
        });
      }}
    >
      <Input
        name="limitDollars"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        defaultValue={(limitCents / 100).toFixed(2)}
        className="h-8 w-24"
        required
        autoFocus
      />
      <Button type="submit" size="icon" variant="ghost" disabled={pending} aria-label="Save">
        <Check className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setEditing(false)}
        aria-label="Cancel"
      >
        <X className="size-4" />
      </Button>
    </form>
  );
}
