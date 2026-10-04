import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { USER_AGENT } from "@/lib/grounding/wikipedia";
import type { Golden } from "./score";

/*
 * Checks that every golden-set fact's quote really appears on its source page (SPEC §12.3
 * rule 4). Pages are fetched once and cached in eval/cache/sources/ (git-ignored), so the
 * check can be re-run offline and never hammers a site.
 */

/** Lowercase, plain quotes and dashes, one space: so formatting differences don't matter. */
export function normalizeQuote(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\[\d+\]/g, "") // Wikipedia footnote marks
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteFound(page: string, quote: string): boolean {
  return normalizeQuote(page).includes(normalizeQuote(quote));
}

/** Visible text of an HTML page (scripts, styles and tags removed, entities decoded). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

const CACHE = "eval/cache/sources";

/** The page's text: Wikipedia through its API (full plain text), anything else as HTML → text. */
export async function fetchPageText(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const key = createHash("sha1").update(url).digest("hex");
  const file = `${CACHE}/${key}.txt`;
  if (existsSync(file)) return readFileSync(file, "utf8");
  const wiki = /^https:\/\/en\.wikipedia\.org\/wiki\/(.+)$/.exec(url);
  const target = wiki
    ? `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
        action: "query",
        prop: "extracts",
        explaintext: "1",
        redirects: "1",
        format: "json",
        formatversion: "2",
        titles: decodeURIComponent(wiki[1]).replace(/_/g, " "),
      })}`
    : url;
  try {
    const res = await fetchImpl(target, {
      headers: { "user-agent": USER_AGENT, "api-user-agent": USER_AGENT },
    });
    if (!res.ok) return null;
    let text: string;
    if (wiki) {
      const data = (await res.json()) as { query?: { pages?: { extract?: string }[] } };
      text = data.query?.pages?.[0]?.extract ?? "";
    } else {
      text = htmlToText(await res.text());
    }
    if (!text) return null;
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, text);
    return text;
  } catch {
    return null;
  }
}

export type QuoteProblem = { topic: string; fact: string; url: string; reason: string };

/** Every fact's quote checked against its page. Facts without a source are listed too. */
export async function checkQuotes(
  golden: Golden,
  fetchText: (url: string) => Promise<string | null> = (u) => fetchPageText(u),
): Promise<{ checked: number; problems: QuoteProblem[]; unsourced: number }> {
  const problems: QuoteProblem[] = [];
  let checked = 0;
  let unsourced = 0;
  for (const t of golden.topics) {
    for (const f of t.facts) {
      if (!f.source) {
        unsourced++;
        continue;
      }
      checked++;
      const page = await fetchText(f.source.url);
      if (page === null) {
        problems.push({
          topic: t.topic,
          fact: f.id,
          url: f.source.url,
          reason: "page could not be fetched",
        });
      } else if (!quoteFound(page, f.source.quote)) {
        problems.push({
          topic: t.topic,
          fact: f.id,
          url: f.source.url,
          reason: "quote not found on the page",
        });
      }
    }
  }
  return { checked, problems, unsourced };
}
