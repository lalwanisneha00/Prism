/*
 * Re-scores the lessons saved by the last eval run with the current scorer, without asking
 * the AI again (for fixes to the scorer itself; prompt changes need a new run).
 *   npx tsx --tsconfig tsconfig.json eval/rescore.ts                    every subject, summary
 *   npx tsx --tsconfig tsconfig.json eval/rescore.ts dsa [topic ...]    one subject, per fact
 */
import { existsSync, readFileSync } from "node:fs";
import { loadGoldenSets } from "./golden";
import { normalizeForMatch } from "./score";

const [subject, ...only] = process.argv.slice(2);
const sets = loadGoldenSets().filter((s) => !subject || s.subject === subject);
if (subject && sets.length === 0) throw new Error(`No golden set for "${subject}"`);

for (const set of sets) {
  let found = 0;
  let total = 0;
  const misses: string[] = [];
  for (const entry of set.topics) {
    if (only.length && !only.includes(entry.topic)) continue;
    const path = `eval/results/lessons/${set.subject}/${entry.topic}.txt`;
    if (!existsSync(path)) continue;
    const text = normalizeForMatch(readFileSync(path, "utf8"));
    for (const fact of entry.facts) {
      total++;
      const m = new RegExp(fact.pattern, "i").exec(text);
      if (m) found++;
      else misses.push(`${entry.topic}.${fact.id}`);
      if (subject)
        console.log(`  ${entry.topic}.${fact.id}: ${m ? `"${m[0].slice(0, 60)}"` : "MISSING"}`);
    }
  }
  if (total === 0) continue;
  console.log(`${set.subject}: ${Math.round((found / total) * 1000) / 10}% (${found}/${total})`);
  if (misses.length) console.log(`  missing: ${misses.join(", ")}`);
}
