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
 * fetched in parallel; textbook sections are cited by link only.
 */
export async function groundSources(
  sources: Source[],
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<GroundingSource[]> {
  return Promise.all(
    sources.map(async (source) => {
      const title = wikipediaTitleFromUrl(source.url);
      if (!title) return source;
      const excerpt = await fetchWikipediaExtract(title, options);
      return excerpt ? { ...source, excerpt } : source;
    }),
  );
}
