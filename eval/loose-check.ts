// Prints golden facts whose pattern already matches an unrelated lesson (Gauss's law), with the
// matched text, so loose patterns can be tightened. Usage: npx tsx eval/loose-check.ts
import { sampleLessons } from "@/data/sampleLessons";
import { loadGoldenSets } from "./golden";
import { lessonText, normalizeForMatch } from "./score";

const text = normalizeForMatch(lessonText(sampleLessons[0]));
for (const set of loadGoldenSets()) {
  for (const t of set.topics) {
    for (const f of t.facts) {
      const m = new RegExp(f.pattern, "i").exec(text);
      if (m) console.log(`${set.subject}/${t.topic}/${f.id}: "${m[0]}"`);
    }
  }
}
