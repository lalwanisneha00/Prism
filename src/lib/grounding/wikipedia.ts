/** Identifies the app to Wikipedia, as its API etiquette asks. */
export const USER_AGENT = "PrismStudyApp/0.1 (https://github.com/lalwanisneha00/Prism)";

const MAX_CHARS = 5000;
const cache = new Map<string, string>();

type ExtractReply = {
  query?: { pages?: { title: string; extract?: string; missing?: boolean }[] };
};

/** Shortens an article to its opening part, cutting at a paragraph or sentence boundary. */
export function trimExtract(text: string, max = MAX_CHARS): string {
  const clean = text.replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf("\n\n"), cut.lastIndexOf(". "));
  return `${cut.slice(0, end > max * 0.6 ? end + 1 : max).trim()} …`;
}

/**
 * Plain text of a Wikipedia article's opening sections, or null if it can't be fetched.
 * Grounding is best-effort: a lesson still works (with fewer facts to check against) without it.
 */
export async function fetchWikipediaExtract(
  title: string,
  { signal, fetchImpl = fetch }: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<string | null | false> {
  const cached = cache.get(title);
  if (cached) return cached;

  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    redirects: "1",
    format: "json",
    formatversion: "2",
    titles: title,
  });
  try {
    const timeout = AbortSignal.timeout(8000);
    const res = await fetchImpl(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { "user-agent": USER_AGENT, "api-user-agent": USER_AGENT },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!res.ok) return null;
    const page = ((await res.json()) as ExtractReply).query?.pages?.[0];
    // `false` means Wikipedia says the article doesn't exist: the link is broken.
    if (page?.missing) return false;
    if (!page?.extract) return null;
    const excerpt = trimExtract(page.extract);
    cache.set(title, excerpt);
    return excerpt;
  } catch {
    return null;
  }
}
