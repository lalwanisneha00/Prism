import sample from "@/data/sample-lessons/gauss-law.first-encounter.json";
import { findPhetSim } from "@/data/phet";
import type { Source } from "@/lib/schema";
import { widgetsForTopic, type WidgetId } from "@/visuals/registry";

/**
 * A realistic AI reply for offline testing: the hand-written Gauss's law lesson body,
 * re-pointed at the given sources so its citations are valid for any topic. Topic-specific
 * visuals (widgets, PhET) that don't fit `topicId` are left out, as a real AI is told to.
 */
export function fakeLessonBody(sources: Source[], topicId = "gauss-law"): Record<string, unknown> {
  const body: Partial<typeof sample> = structuredClone(sample);
  // The app sets these itself, so a real AI reply would not need them either.
  delete body.meta;
  delete body.furtherLearning;
  const ids = sources.map((s) => s.id);
  const fits = (visual: unknown) => {
    const v = visual as { type?: string; widget?: string; sim?: string } | undefined;
    if (v?.type === "widget") return widgetsForTopic(topicId).includes(v.widget as WidgetId);
    if (v?.type === "phet") return Boolean(findPhetSim(v.sim ?? "")?.topics.includes(topicId));
    return true;
  };
  body.sections = sample.sections.map((section, i) => {
    const copy: Record<string, unknown> = { ...section, sourceIds: [ids[i % ids.length]] };
    if (!fits(section.visual)) delete copy.visual;
    return copy as (typeof sample.sections)[number];
  });
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
