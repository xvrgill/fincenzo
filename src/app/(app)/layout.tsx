import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { InviteBanner } from "@/components/household/invite-banner";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { getHouseholdState, getPendingInvitesForEmail } from "@/lib/queries/household";
import { getActiveScope } from "@/lib/scope";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [invites, household, scope] = await Promise.all([
    user.email ? getPendingInvitesForEmail(user.email, user.id) : Promise.resolve([]),
    getHouseholdState(user.id),
    getActiveScope(user.id),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <AppSidebar userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-x-hidden bg-background">
        <InviteBanner invites={invites} />
        {household.inHousehold ? (
          <div className="border-b border-border bg-card/40">
            <div className="mx-auto flex max-w-7xl items-center justify-end px-4 py-2 md:px-6">
              <ScopeSwitcher
                current={scope.kind === "household" ? "household" : "user"}
                householdName={household.household.name}
              />
            </div>
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
