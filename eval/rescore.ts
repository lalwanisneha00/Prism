/*
 * Re-scores the lessons saved by the last eval run with the current scorer, without asking
 * the AI again (for fixes to the scorer itself; prompt changes need a new run).
 *   npx tsx --tsconfig tsconfig.json eval/rescore.ts
 */
import { existsSync, readFileSync } from "node:fs";
import emGolden from "./golden/em.json";
import mathGolden from "./golden/engg-math.json";
import { GoldenSchema, normalizeForMatch } from "./score";

for (const set of [GoldenSchema.parse(emGolden), GoldenSchema.parse(mathGolden)]) {
  let found = 0;
  let total = 0;
  const misses: string[] = [];
  for (const entry of set.topics) {
    const path = `eval/results/lessons/${set.subject}/${entry.topic}.txt`;
    if (!existsSync(path)) continue;
    const text = normalizeForMatch(readFileSync(path, "utf8"));
    for (const fact of entry.facts) {
      total++;
      if (new RegExp(fact.pattern, "i").test(text)) found++;
      else misses.push(`${entry.topic}.${fact.id}`);
    }
  }
  console.log(`${set.subject}: ${Math.round((found / total) * 1000) / 10}% (${found}/${total})`);
  console.log(`  missing: ${misses.join(", ")}`);
}
