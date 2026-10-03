/*
 * Prints, for each fact a lesson missed in the last eval, the lines of that lesson (as the
 * scorer sees them) that mention the fact's key words, so a person can decide: did the lesson
 * really leave the fact out, or is the pattern too strict?   npx tsx eval/inspect-misses.ts
 */
import { existsSync, readFileSync } from "node:fs";
import emGolden from "./golden/em.json";
import mathGolden from "./golden/engg-math.json";
import { GoldenSchema, normalizeForMatch } from "./score";

for (const set of [GoldenSchema.parse(emGolden), GoldenSchema.parse(mathGolden)]) {
  const path = `eval/results/${set.subject}.json`;
  if (!existsSync(path)) continue;
  const results = JSON.parse(readFileSync(path, "utf8")) as {
    rows: { topic: string; missing: string[] }[];
  };
  for (const row of results.rows) {
    if (!row.missing.length) continue;
    const textPath = `eval/results/lessons/${set.subject}/${row.topic}.txt`;
    if (!existsSync(textPath)) continue;
    const lines = normalizeForMatch(readFileSync(textPath, "utf8")).split("\n");
    const entry = set.topics.find((t) => t.topic === row.topic)!;
    for (const id of row.missing) {
      const fact = entry.facts.find((f) => f.id === id)!;
      // Key words: the claim's longer words and symbols.
      const words = fact.claim
        .toLowerCase()
        .split(/[^a-z0-9εσλπ]+/)
        .filter((w) => w.length >= 4);
      const hits = lines.filter((l) => words.some((w) => l.includes(w))).slice(0, 3);
      console.log(`\n### ${set.subject}/${row.topic} · ${id}: ${fact.claim}`);
      for (const h of hits) console.log(`   ${h.slice(0, 220)}`);
    }
  }
}
