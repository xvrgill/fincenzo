"use client";

import { useState, useTransition } from "react";
import { setTransactionCategory } from "@/app/(app)/transactions/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prettifyCategory } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  transactionId: string;
  currentCategory: string | null;
  merchantLabel: string;
  availableCategories: string[];
};

const NEW_CATEGORY = "__new__";

export function CategoryPicker({
  transactionId,
  currentCategory,
  merchantLabel,
  availableCategories,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(currentCategory ?? availableCategories[0] ?? NEW_CATEGORY);
  const [newCategory, setNewCategory] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const display = currentCategory ? prettifyCategory(currentCategory) : "Uncategorized";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setSelected(currentCategory ?? availableCategories[0] ?? NEW_CATEGORY);
          setNewCategory("");
          setError(null);
        }
      }}
    >
      <DialogTrigger
        className={cn(
          "rounded-md px-1.5 py-0.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          !currentCategory && "italic",
        )}
      >
        {display}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Categorize transaction</DialogTitle>
          <DialogDescription className="truncate">{merchantLabel}</DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            const finalCategory =
              selected === NEW_CATEGORY ? newCategory.trim() : selected;
            if (!finalCategory) {
              setError("Pick or enter a category.");
              return;
            }
            formData.set("transactionId", transactionId);
            formData.set("category", finalCategory);
            setError(null);
            startTransition(async () => {
              try {
                await setTransactionCategory(formData);
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Something went wrong");
              }
            });
          }}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="category-select">Category</Label>
            <select
              id="category-select"
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

          {selected === NEW_CATEGORY ? (
            <div className="grid gap-2">
              <Label htmlFor="new-category">New category name</Label>
              <Input
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Date nights"
                autoFocus
              />
            </div>
          ) : null}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="applyToMerchant"
              className="mt-0.5"
            />
            <span>
              Apply to all transactions from <span className="font-medium">{merchantLabel}</span>{" "}
              (creates a rule for future transactions too).
            </span>
          </label>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
