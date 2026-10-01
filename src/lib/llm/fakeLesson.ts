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

/** A fake fact-check reply: everything supported except the last section, to show both badges. */
export function fakeVerification(body: Record<string, unknown>) {
  const sections = (body.sections as { id: string }[]).map((s, i, all) =>
    i === all.length - 1
      ? { id: s.id, status: "unsupported", note: "Fake fact-check: shown as Verify for testing." }
      : { id: s.id, status: "supported", note: "Matches the sources." },
  );
  return { sections, corrections: [] };
}
