import { getDocTree } from "@/lib/docs";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const sections = getDocTree();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
      <div className="grid gap-10 py-10 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12 md:py-12 lg:grid-cols-[220px_minmax(0,1fr)_200px]">
        <aside className="hidden md:sticky md:top-20 md:block md:h-[calc(100vh-6rem)] md:self-start md:overflow-y-auto md:pb-12">
          <DocsSidebar sections={sections} />
        </aside>
        {children}
      </div>
    </div>
  );
}
