import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

// MDX content lives outside the Next routing tree so writers can add files
// without touching `src/app`. The catch-all `[[...slug]]` route consumes
// it via dynamic import (see (marketing)/docs/[[...slug]]/page.tsx).
export const CONTENT_DIR = path.join(process.cwd(), "content", "docs");

export type DocFrontmatter = {
  title: string;
  description?: string;
  section?: string;
  order?: number;
  hidden?: boolean;
};

export type DocMeta = {
  slug: string[]; // empty array = the index page
  href: string;
  title: string;
  description?: string;
  section: string;
  order: number;
};

export type DocSection = {
  name: string;
  order: number;
  pages: DocMeta[];
};

export type TocItem = {
  id: string;
  text: string;
  depth: 2 | 3;
};

const DEFAULT_SECTION = "Overview";

function isMdxFile(name: string) {
  return name.endsWith(".mdx") || name.endsWith(".md");
}

function walk(dir: string, base: string[] = []): { absPath: string; slug: string[] }[] {
  if (!fs.existsSync(dir)) return [];
  const out: { absPath: string; slug: string[] }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(abs, [...base, entry.name]));
    } else if (entry.isFile() && isMdxFile(entry.name)) {
      const name = entry.name.replace(/\.mdx?$/, "");
      const slug = name === "index" ? base : [...base, name];
      out.push({ absPath: abs, slug });
    }
  }
  return out;
}

function readDoc(absPath: string, slug: string[]): DocMeta | null {
  const raw = fs.readFileSync(absPath, "utf-8");
  const { data } = matter(raw);
  const fm = data as DocFrontmatter;
  if (!fm.title) return null;
  if (fm.hidden) return null;
  return {
    slug,
    href: `/docs${slug.length ? "/" + slug.join("/") : ""}`,
    title: fm.title,
    description: fm.description,
    section: fm.section ?? DEFAULT_SECTION,
    order: typeof fm.order === "number" ? fm.order : 999,
  };
}

let cachedDocs: DocMeta[] | null = null;

export function getAllDocs(): DocMeta[] {
  if (process.env.NODE_ENV === "production" && cachedDocs) return cachedDocs;
  const files = walk(CONTENT_DIR);
  const docs = files
    .map((f) => readDoc(f.absPath, f.slug))
    .filter((d): d is DocMeta => d !== null);
  cachedDocs = docs;
  return docs;
}

const SECTION_ORDER = [
  "Overview",
  "Getting started",
  "Connecting accounts",
  "Personal finance",
  "Households",
  "Privacy & data",
  "Reference",
  "Developers",
];

function sectionOrder(name: string) {
  const idx = SECTION_ORDER.indexOf(name);
  return idx === -1 ? 999 : idx;
}

export function getDocTree(): DocSection[] {
  const docs = getAllDocs();
  const bySection = new Map<string, DocMeta[]>();
  for (const d of docs) {
    if (!bySection.has(d.section)) bySection.set(d.section, []);
    bySection.get(d.section)!.push(d);
  }
  const sections: DocSection[] = [];
  for (const [name, pages] of bySection) {
    pages.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    sections.push({ name, order: sectionOrder(name), pages });
  }
  sections.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return sections;
}

export function findDoc(slug: string[]): DocMeta | null {
  const docs = getAllDocs();
  const target = slug.join("/");
  return docs.find((d) => d.slug.join("/") === target) ?? null;
}

// Flat ordering across all sections for prev/next navigation.
export function getFlatOrderedDocs(): DocMeta[] {
  return getDocTree().flatMap((s) => s.pages);
}

export function getPrevNext(slug: string[]): { prev: DocMeta | null; next: DocMeta | null } {
  const flat = getFlatOrderedDocs();
  const target = slug.join("/");
  const idx = flat.findIndex((d) => d.slug.join("/") === target);
  if (idx === -1) return { prev: null, next: null };
  return { prev: flat[idx - 1] ?? null, next: flat[idx + 1] ?? null };
}

// Extract h2/h3 from raw MDX. Walks line-by-line so we can skip fenced code
// blocks (otherwise `## inside a code sample` would land in the TOC).
export function extractToc(slug: string[]): TocItem[] {
  const filePath = findRawPath(slug);
  if (!filePath) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  const { content } = matter(raw);

  const items: TocItem[] = [];
  const slugger = new GithubSlugger();
  let inFence = false;

  for (const line of content.split("\n")) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const depth = m[1].length === 2 ? 2 : 3;
    const text = m[2].replace(/`/g, "").trim();
    items.push({ id: slugger.slug(text), text, depth });
  }
  return items;
}

function findRawPath(slug: string[]): string | null {
  const segments = slug.length === 0 ? ["index"] : slug;
  for (const ext of [".mdx", ".md"]) {
    const direct = path.join(CONTENT_DIR, ...segments) + ext;
    if (fs.existsSync(direct)) return direct;
    const asDirIndex = path.join(CONTENT_DIR, ...segments, "index" + ext);
    if (fs.existsSync(asDirIndex)) return asDirIndex;
  }
  return null;
}
