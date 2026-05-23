"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createSubstringRule } from "@/app/(app)/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prettifyCategory } from "@/lib/format";

const NEW_CATEGORY = "__new__";

export function AddSubstringRuleForm({
  availableCategories,
}: {
  availableCategories: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(availableCategories[0] ?? NEW_CATEGORY);
  const [newCategory, setNewCategory] = useState("");

  return (
    <form
      id="add-substring-rule-form"
      className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end"
      action={(formData) => {
        setError(null);
        const finalCategory = selected === NEW_CATEGORY ? newCategory.trim() : selected;
        if (!finalCategory) {
          setError("Pick or enter a category.");
          return;
        }
        formData.set("category", finalCategory);
        startTransition(async () => {
          try {
            await createSubstringRule(formData);
            (document.getElementById("add-substring-rule-form") as HTMLFormElement | null)?.reset();
            setNewCategory("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
          }
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="matchValue">Contains</Label>
        <Input id="matchValue" name="matchValue" placeholder="UBER" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="rule-category">Category</Label>
        <select
          id="rule-category"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {availableCategories.map((c) => (
            <option key={c} value={c}>
              {prettifyCategory(c)}
            </option>
          ))}
          <option value={NEW_CATEGORY}>+ New category…</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" />
        {pending ? "Adding…" : "Add"}
      </Button>
      {selected === NEW_CATEGORY ? (
        <div className="grid gap-1.5 sm:col-span-3">
          <Label htmlFor="new-rule-category">New category name</Label>
          <Input
            id="new-rule-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="e.g. Date nights"
          />
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive sm:col-span-3">{error}</p> : null}
    </form>
  );
}
