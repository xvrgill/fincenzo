import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  extractToc,
  findDoc,
  getAllDocs,
  getPrevNext,
} from "@/lib/docs";
import { DocsToc } from "@/components/docs/docs-toc";
import { DocsPrevNext } from "@/components/docs/docs-prev-next";

type Params = { slug?: string[] };

// Catch-all pre-renders every doc found in content/docs/**. Adding a new MDX
// file requires no code changes — drop it in, ensure it has frontmatter, and
// it shows up in the sidebar on the next build.
export function generateStaticParams() {
  return getAllDocs().map((d) => ({ slug: d.slug.length === 0 ? undefined : d.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug = [] } = await params;
  const doc = findDoc(slug);
  if (!doc) return {};

  const ogParams = new URLSearchParams({
    title: doc.title,
    section: doc.section,
    path: doc.href,
  });
  if (doc.description) ogParams.set("description", doc.description);
  const ogUrl = `/api/og?${ogParams.toString()}`;

  return {
    title: `${doc.title} · Fincenzo docs`,
    description: doc.description,
    openGraph: {
      title: `${doc.title} · Fincenzo docs`,
      description: doc.description,
      url: doc.href,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: doc.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${doc.title} · Fincenzo docs`,
      description: doc.description,
      images: [ogUrl],
    },
  };
}

export default async function DocPage({ params }: { params: Promise<Params> }) {
  const { slug = [] } = await params;
  const doc = findDoc(slug);
  if (!doc) notFound();

  // Dynamic import resolves to the compiled MDX module. The `default` export
  // is the React component; `frontmatter` is injected by remark-mdx-frontmatter
  // and we already have it via the docs lib, so we don't read it again here.
  const segments = slug.length === 0 ? ["index"] : slug;
  const Mod = await import(`@/../content/docs/${segments.join("/")}.mdx`);
  const Content = Mod.default;

  const toc = extractToc(slug);
  const { prev, next } = getPrevNext(slug);

  return (
    <>
      <article className="min-w-0">
        <Breadcrumbs section={doc.section} title={doc.title} isIndex={slug.length === 0} />
        <Content />
        <DocsPrevNext prev={prev} next={next} />
      </article>
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pb-12">
        <DocsToc items={toc} />
      </aside>
    </>
  );
}

function Breadcrumbs({
  section,
  title,
  isIndex,
}: {
  section: string;
  title: string;
  isIndex: boolean;
}) {
  if (isIndex) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
    >
      <span>Docs</span>
      <ChevronRight className="size-3" />
      <span>{section}</span>
      <ChevronRight className="size-3" />
      <span className="text-foreground">{title}</span>
    </nav>
  );
}
