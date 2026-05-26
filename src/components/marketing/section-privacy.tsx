import { Lock, EyeOff, Undo2 } from "lucide-react";
import { SectionHeader } from "./section-header";

export function SectionPrivacy() {
  return (
    <section className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <SectionHeader
          index="05"
          eyebrow="Privacy by default"
          title={
            <>
              Nothing shared by default.{" "}
              <span className="text-primary">Everything reversible.</span>
            </>
          }
          description="Your data belongs to you. Your partner sees what you choose, when you choose. You can take it back."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Pillar
            icon={<EyeOff className="size-5" />}
            title="Private by default"
            body="Link an account and it's yours alone. Nothing is shared with a partner unless you explicitly flip a switch — per account, per category."
          />
          <Pillar
            icon={<Undo2 className="size-5" />}
            title="Reversible at any time"
            body="Un-share an account and it vanishes from your partner's view immediately. Leave a household and your data follows you out."
          />
          <Pillar
            icon={<Lock className="size-5" />}
            title="Encrypted at rest"
            body="Plaid access tokens are encrypted with AES-256-GCM. Plaid is the only third party that ever sees your bank credentials — never us."
          />
        </div>
      </div>
    </section>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-6 transition-colors hover:border-primary/40">
      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <h3 className="font-mono text-base font-medium tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
