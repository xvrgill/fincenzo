import { setScope } from "@/app/(app)/scope-actions";
import { cn } from "@/lib/utils";

type Props = {
  current: "user" | "household";
  householdName: string;
};

export function ScopeSwitcher({ current, householdName }: Props) {
  return (
    <div className="inline-flex rounded-full border bg-card p-0.5 text-xs">
      <form action={setScope}>
        <input type="hidden" name="scope" value="user" />
        <button
          type="submit"
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            current === "user"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Me
        </button>
      </form>
      <form action={setScope}>
        <input type="hidden" name="scope" value="household" />
        <button
          type="submit"
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            current === "household"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {householdName}
        </button>
      </form>
    </div>
  );
}
