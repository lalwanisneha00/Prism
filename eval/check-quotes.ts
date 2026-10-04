/*
 * npm run golden:check [-- --subject=em]
 * Confirms that every golden-set fact's quote appears on its source page (SPEC §12.3 rule 4)
 * and prints three sample entries per subject for a person to spot-check before an eval.
 */
import { loadGoldenSets } from "./golden";
import { checkQuotes } from "./quotes";
import { quotedShare } from "./score";

const subject = process.argv.find((a) => a.startsWith("--subject="))?.split("=")[1];

async function main() {
  let failed = false;
  for (const set of loadGoldenSets().filter((s) => !subject || s.subject === subject)) {
    const share = quotedShare(set);
    console.log(
      `\n${set.subject}: ${set.topics.length} topics, ${share.total} facts, ${share.quoted} with a source quote`,
    );
    const samples = set.topics
      .flatMap((t) => t.facts.filter((f) => f.source).map((f) => ({ t, f })))
      .slice(0, 3);
    for (const { t, f } of samples) {
      console.log(
        `  sample · ${t.topic} · ${f.claim}\n    “${f.source!.quote}”\n    ${f.source!.url}`,
      );
    }
    const result = await checkQuotes(set);
    for (const p of result.problems) {
      failed = true;
      console.log(`  ✗ ${p.topic}/${p.fact}: ${p.reason} (${p.url})`);
    }
    console.log(
      `  quotes checked ${result.checked}, problems ${result.problems.length}${result.unsourced ? `, facts without a source ${result.unsourced} (not eligible for "tested")` : ""}`,
    );
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
