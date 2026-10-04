/*
 * npx tsx --tsconfig tsconfig.json eval/find-quotes.ts <plan.json> [out.txt]
 * Helps write golden facts FROM fetched text (SPEC §12.3 rule 4): for each planned topic it
 * fetches the source page (same cache as `golden:check`) and prints the sentences that match
 * the given search terms, word for word. Facts and quotes are then chosen from those
 * sentences only; the search terms are just where to look, never the facts themselves.
 *
 * plan.json: [{ "subject": "...", "topic": "...", "url": "https://en.wikipedia.org/wiki/...",
 *               "terms": ["regex", ...] }]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fetchPageText } from "./quotes";

type PlanItem = { subject: string; topic: string; url: string; terms: string[] };

/** Sentences of a page (split on full stops followed by a space and a capital, or newlines). */
export function sentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z(])/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 25 && s.length <= 400);
}

async function main() {
  const [planPath, outPath] = process.argv.slice(2);
  const plan = JSON.parse(readFileSync(planPath, "utf8")) as PlanItem[];
  const out: string[] = [];
  for (const item of plan) {
    const page = await fetchPageText(item.url);
    out.push(`\n### ${item.subject}/${item.topic}  ${item.url}`);
    if (!page) {
      out.push("  (page could not be fetched)");
      continue;
    }
    const all = sentences(page);
    for (const term of item.terms) {
      const re = new RegExp(term, "i");
      const hits = all.filter((s) => re.test(s)).slice(0, 3);
      out.push(`  [${term}]`);
      for (const h of hits) out.push(`    - ${h}`);
      if (!hits.length) out.push("    (no sentence)");
    }
    // Be gentle with Wikipedia when pages aren't cached yet.
    await new Promise((r) => setTimeout(r, 1500));
  }
  const text = out.join("\n");
  if (outPath) writeFileSync(outPath, text);
  else console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
