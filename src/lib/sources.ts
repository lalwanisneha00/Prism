import { z } from "zod";
import emSources from "@/data/subjects/em-sources.json";
import mathSources from "@/data/subjects/engg-math-sources.json";
import type { Source } from "@/lib/schema";

/*
 * Which trusted sources back each topic. We choose the sources, never the AI:
 * the AI may only cite these by id, so every citation points at a real page.
 */

const BookSchema = z.object({ url: z.url(), title: z.string().min(1) });

/*
 * A subject cites one OpenStax book ("openstaxBook"), or several ("openstaxBooks"); with
 * several, each section is written "<book key>/<section slug>", e.g. "calc3/6-4-greens-theorem".
 */
const SourceMapSchema = z.object({
  openstaxBook: z.url().optional(),
  openstaxBookTitle: z.string().min(1).optional(),
  openstaxBooks: z.record(z.string(), BookSchema).optional(),
  openstaxSections: z.record(z.string(), z.string().min(1)),
  topics: z.record(
    z.string(),
    z.object({
      wikipedia: z.array(z.string().min(1)).min(1),
      openstax: z.array(z.string().min(1)),
    }),
  ),
});
type SourceMap = z.infer<typeof SourceMapSchema>;

const sourceMaps: Record<string, SourceMap> = {
  em: SourceMapSchema.parse(emSources),
  "engg-math": SourceMapSchema.parse(mathSources),
};

/** The book and page slug a section key points at. */
function resolveSection(map: SourceMap, key: string): { url: string; title: string; slug: string } {
  const [bookKey, slug] = key.includes("/") ? key.split("/", 2) : ["", key];
  const book = bookKey
    ? map.openstaxBooks?.[bookKey]
    : map.openstaxBook && map.openstaxBookTitle
      ? { url: map.openstaxBook, title: map.openstaxBookTitle }
      : undefined;
  if (!book) throw new Error(`no OpenStax book for section "${key}"`);
  return { url: `${book.url}${slug}`, title: book.title, slug };
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function wikipediaUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

/** The sources for one topic, ready to put in a lesson's meta.sources. */
export function sourcesForTopic(subjectId: string, topicId: string): Source[] {
  const map = sourceMaps[subjectId];
  const entry = map?.topics[topicId];
  if (!map || !entry) return [];

  const openstax: Source[] = entry.openstax.map((key) => {
    const { url, title, slug } = resolveSection(map, key);
    const number = slug.match(/^(\d+)-(\d+)-/);
    const section = number ? `§${number[1]}.${number[2]} ` : "";
    return {
      id: `openstax-${key.replace("/", "-")}`,
      title: `${title}, ${section}${map.openstaxSections[key] ?? slug}`,
      url,
      publisher: "OpenStax",
      kind: "textbook",
      license: "CC BY 4.0",
    };
  });
  const wikipedia: Source[] = entry.wikipedia.map((title) => ({
    id: `wikipedia-${slugify(title)}`,
    title,
    url: wikipediaUrl(title),
    publisher: "Wikipedia",
    kind: "encyclopedia",
    license: "CC BY-SA 4.0",
  }));
  return [...openstax, ...wikipedia];
}

/** Every topic id that has a source entry (used by tests to check coverage). */
export function topicsWithSources(subjectId: string): string[] {
  return Object.keys(sourceMaps[subjectId]?.topics ?? {});
}
