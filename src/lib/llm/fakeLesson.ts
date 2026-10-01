import sample from "@/data/sample-lessons/gauss-law.first-encounter.json";
import type { Source } from "@/lib/schema";

/**
 * A realistic AI reply for offline testing: the hand-written Gauss's law lesson body,
 * re-pointed at the given sources so its citations are valid for any topic.
 */
export function fakeLessonBody(sources: Source[]): Record<string, unknown> {
  const body: Partial<typeof sample> = structuredClone(sample);
  // The app sets these itself, so a real AI reply would not need them either.
  delete body.meta;
  delete body.furtherLearning;
  const ids = sources.map((s) => s.id);
  body.sections = sample.sections.map((section, i) => ({
    ...section,
    sourceIds: [ids[i % ids.length]],
  }));
  return body;
}
