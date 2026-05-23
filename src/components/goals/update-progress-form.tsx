"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { updateGoalProgress } from "@/app/(app)/goals/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  id: string;
  currentCents: number;
};

export function UpdateProgressForm({ id, currentCents }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Update progress">
        <Pencil className="size-4" />
      </Button>
    );
  }

  return (
    <form
      className="flex items-center gap-1"
      action={(formData) => {
        formData.set("id", id);
        startTransition(async () => {
          try {
            await updateGoalProgress(formData);
          } finally {
            setEditing(false);
          }
        });
      }}
    >
      <Input
        name="currentDollars"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        defaultValue={(currentCents / 100).toFixed(2)}
        className="h-8 w-28"
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
