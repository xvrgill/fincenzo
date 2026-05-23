"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createGoal } from "@/app/(app)/goals/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddGoalForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      id="add-goal-form"
      className="grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr_1fr_auto] sm:items-end"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await createGoal(formData);
            (document.getElementById("add-goal-form") as HTMLFormElement | null)?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
          }
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="name">Goal</Label>
        <Input id="name" name="name" placeholder="Emergency fund" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="targetDollars">Target</Label>
        <Input
          id="targetDollars"
          name="targetDollars"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="10000"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="startingDollars">Saved so far</Label>
        <Input
          id="startingDollars"
          name="startingDollars"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="targetDate">Target date</Label>
        <Input id="targetDate" name="targetDate" type="date" />
      </div>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" />
        {pending ? "Adding…" : "Add"}
      </Button>
      {error ? <p className="text-xs text-destructive sm:col-span-5">{error}</p> : null}
    </form>
  );
}
