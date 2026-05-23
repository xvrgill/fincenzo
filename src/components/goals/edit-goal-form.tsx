"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateGoal } from "@/app/(app)/goals/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  targetDate: string | null;
};

export function EditGoalForm({ id, name, targetCents, currentCents, targetDate }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Edit goal"
      >
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit goal</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          action={(formData) => {
            formData.set("id", id);
            setError(null);
            startTransition(async () => {
              try {
                await updateGoal(formData);
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Something went wrong");
              }
            });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor={`name-${id}`}>Name</Label>
            <Input id={`name-${id}`} name="name" defaultValue={name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`target-${id}`}>Target</Label>
              <Input
                id={`target-${id}`}
                name="targetDollars"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                defaultValue={(targetCents / 100).toFixed(2)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`current-${id}`}>Saved</Label>
              <Input
                id={`current-${id}`}
                name="currentDollars"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                defaultValue={(currentCents / 100).toFixed(2)}
                required
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`date-${id}`}>Target date</Label>
            <Input
              id={`date-${id}`}
              name="targetDate"
              type="date"
              defaultValue={targetDate ?? ""}
            />
          </div>
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
