export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  align = "left",
}: {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
}) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start";
  return (
    <div className={`flex flex-col gap-4 ${alignClass}`}>
      <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{index}</span>
        <span className="h-px w-8 bg-border" aria-hidden />
        {eyebrow}
      </div>
      <h2 className="max-w-3xl text-balance font-mono text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
