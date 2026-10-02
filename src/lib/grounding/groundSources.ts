import { fetchWikipediaExtract } from "@/lib/grounding/wikipedia";
import type { GroundingSource } from "@/lib/prompts/lessonPrompt";
import type { Source } from "@/lib/schema";

/** The article title inside a Wikipedia URL, e.g. ".../wiki/Gauss's_law" → "Gauss's law". */
export function wikipediaTitleFromUrl(url: string): string | null {
  const match = /^https:\/\/en\.wikipedia\.org\/wiki\/(.+)$/.exec(url);
  return match ? decodeURIComponent(match[1]).replace(/_/g, " ") : null;
}

/**
 * Attaches source text the AI must base its facts on (SPEC §6.1). Wikipedia articles are
 * fetched in parallel; textbook sections are cited by link only. A Wikipedia source whose
 * article no longer exists is dropped, so no lesson ever links to a missing page.
 */
export async function groundSources(
  sources: Source[],
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<GroundingSource[]> {
  const grounded = await Promise.all(
    sources.map(async (source): Promise<GroundingSource | null> => {
      const title = source.url ? wikipediaTitleFromUrl(source.url) : null;
      if (!title) return source;
      const excerpt = await fetchWikipediaExtract(title, options);
      if (excerpt === false) return null;
      return excerpt ? { ...source, excerpt } : source;
    }),
  );
  return grounded.filter((s): s is GroundingSource => s !== null);
}
