import Link from "next/link";
import { signUp } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupInviteToken } from "@/lib/waitlist/invite-token";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; check_email?: string }>;
}) {
  const { token, error, check_email } = await searchParams;

  if (check_email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link. Open it to finish creating your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Already confirmed?{" "}
            <Link href="/sign-in" className="underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  const invite = token ? await lookupInviteToken(token) : { kind: "missing" as const };

  if (invite.kind !== "valid") {
    return <InviteRequiredCard reason={invite.kind} />;
  }

  // The error param is shown only when we already have a valid token in hand —
  // we never leak the "invite_required" sentinel through this branch.
  const displayError = error && error !== "invite_required" ? error : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          You&apos;re invited. Set a password and you&apos;re in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signUp} className="grid gap-4">
          <input type="hidden" name="token" value={token} />
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={invite.email}
              readOnly
              disabled
              autoComplete="email"
              className="cursor-not-allowed opacity-80"
            />
            <p className="font-mono text-[11px] text-muted-foreground">
              This invite is tied to your waitlist email.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          {displayError ? (
            <p className="text-sm text-destructive">{displayError}</p>
          ) : null}
          <Button type="submit" className="w-full">Create account</Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function InviteRequiredCard({ reason }: { reason: "missing" | "expired" | "consumed" }) {
  const copy: Record<typeof reason, { title: string; description: string }> = {
    missing: {
      title: "Invite required",
      description:
        "Fincenzo is in invite-only beta. Join the waitlist and we'll email you a signup link when the next batch opens.",
    },
    expired: {
      title: "This invite expired",
      description:
        "Invite links expire after a few days. You're still on the waitlist — we'll send a fresh link in the next batch.",
    },
    consumed: {
      title: "This invite was already used",
      description:
        "Looks like an account has already been created with this invite. Sign in instead, or reset your password if you don't remember it.",
    },
  };
  const { title, description } = copy[reason];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {reason === "consumed" ? (
          <Link
            href="/sign-in"
            className="rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
        ) : (
          <Link
            href="/#waitlist"
            className="rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Join the waitlist
          </Link>
        )}
        <Link
          href="/"
          className="text-center text-sm text-muted-foreground underline underline-offset-4"
        >
          Back to home
        </Link>
      </CardContent>
    </Card>
  );
}
