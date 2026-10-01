import { z } from "zod";
import emSources from "@/data/subjects/em-sources.json";
import type { Source } from "@/lib/schema";

/*
 * Which trusted sources back each topic. We choose the sources, never the AI:
 * the AI may only cite these by id, so every citation points at a real page.
 */

const SourceMapSchema = z.object({
  openstaxBook: z.url(),
  openstaxBookTitle: z.string().min(1),
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
};

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

  const openstax: Source[] = entry.openstax.map((slug) => {
    const number = slug.match(/^(\d+)-(\d+)-/);
    const section = number ? `§${number[1]}.${number[2]} ` : "";
    return {
      id: `openstax-${slug}`,
      title: `${map.openstaxBookTitle}, ${section}${map.openstaxSections[slug] ?? slug}`,
      url: `${map.openstaxBook}${slug}`,
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
