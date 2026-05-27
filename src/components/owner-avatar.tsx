import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  name: string | null | undefined;
  email?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
  title?: string;
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
};

// FNV-1a hash → stable HSL hue per user id.
function hashHue(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

function initialsFrom(name: string | null | undefined, email?: string | null): string {
  const source = (name && name.trim()) || (email ? email.split("@")[0] : "") || "?";
  const parts = source
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function OwnerAvatar({ userId, name, email, size = "sm", className, title }: Props) {
  const hue = hashHue(userId);
  const initials = initialsFrom(name, email);
  const label = title ?? name ?? email ?? "Member";
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium tabular-nums ring-1 ring-inset ring-black/5 dark:ring-white/10",
        sizeClass[size],
        className,
      )}
      style={{
        backgroundColor: `hsl(${hue} 70% 92%)`,
        color: `hsl(${hue} 50% 28%)`,
      }}
    >
      {initials}
    </span>
  );
}
