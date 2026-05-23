"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { setBudget } from "@/app/(app)/budget/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prettifyCategory } from "@/lib/format";

type Props = {
  availableCategories: string[];
  /** Categories that already have a budget this month — disabled in the picker. */
  takenCategories: string[];
  /** Month the budget applies to, as `YYYY-MM-01`. */
  month: string;
  /** When true, render a Shared/Personal selector (household scope only). */
  showSharingControl?: boolean;
};

export function AddBudgetForm({
  availableCategories,
  takenCategories,
  month,
  showSharingControl = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const taken = new Set(takenCategories);
  const firstFree = availableCategories.find((c) => !taken.has(c)) ?? "";

  return (
    <form
      className={
        showSharingControl
          ? "grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_140px_140px_auto]"
          : "grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_140px_auto]"
      }
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await setBudget(formData);
            const form = document.getElementById("add-budget-form") as HTMLFormElement | null;
            form?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
          }
        });
      }}
      id="add-budget-form"
    >
      <input type="hidden" name="month" value={month} />
      <div className="grid gap-1.5">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          defaultValue={firstFree}
          className="h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        >
          {availableCategories.length === 0 ? (
            <option value="" disabled>
              Link an account to see categories
            </option>
          ) : (
            availableCategories.map((c) => (
              <option key={c} value={c} disabled={taken.has(c)}>
                {prettifyCategory(c)}
                {taken.has(c) ? " (budgeted)" : ""}
              </option>
            ))
          )}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="limitDollars">Limit</Label>
        <Input
          id="limitDollars"
          name="limitDollars"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="500"
          required
        />
      </div>
      {showSharingControl ? (
        <div className="grid gap-1.5">
          <Label htmlFor="sharing">Sharing</Label>
          <select
            id="sharing"
            name="sharing"
            defaultValue="shared"
            className="h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="shared">Shared</option>
            <option value="personal">Just for me</option>
          </select>
        </div>
      ) : null}
      <Button type="submit" disabled={pending || availableCategories.length === 0}>
        <Plus className="size-4" />
        {pending ? "Adding…" : "Add"}
      </Button>
      {error ? (
        <p className="text-xs text-destructive sm:col-span-4">{error}</p>
      ) : null}
    </form>
  );
}
