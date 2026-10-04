import type { Lesson } from "@/lib/schema";

/*
 * A chart marked "sourced" claims its numbers come from a source (SPEC §4.1). This checks
 * the claim: every number it shows must appear in the cited source's excerpt or in the
 * lesson's own text. Like a teacher asking "where did you get 26 from?". Used while a
 * lesson is generated (fix it or drop the chart) and by the eval.
 */

/** Every number written in a text (plain decimals and 1.5e3 / 1.5 × 10^3 forms). */
export function numbersInText(text: string): number[] {
  const t = text.replace(/\\times|×/g, "x").replace(/[{}$\\]/g, "");
  return [...t.matchAll(/(-?\d+(?:\.\d+)?)(?:\s*x\s*10\^\s*\(?(-?\d+)\)?|e(-?\d+))?/gi)].map(
    (m) => Number(m[1]) * 10 ** Number(m[2] ?? m[3] ?? 0),
  );
}

/** All the words of a lesson, without its visuals (so a chart can't vouch for itself). */
function lessonWords(lesson: Lesson): string {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) if (k !== "visual" && k !== "meta") walk(x);
    }
  };
  walk(lesson);
  return out.join("\n");
}

export type UnsupportedChart = { sectionIndex: number; sectionId: string; numbers: number[] };

/** Sourced charts (and stats panels) whose numbers appear neither in the source nor the text. */
export function unsupportedSourcedNumbers(
  lesson: Lesson,
  excerpts: Record<string, string>,
): UnsupportedChart[] {
  const text = numbersInText(lessonWords(lesson));
  const result: UnsupportedChart[] = [];
  lesson.sections.forEach((section, sectionIndex) => {
    const v = section.visual;
    if (!v || (v.type !== "chart" && v.type !== "stats") || v.data !== "sourced") return;
    const source = numbersInText(excerpts[v.sourceId ?? ""] ?? "");
    const shown =
      v.type === "chart"
        ? [
            ...(v.series ?? []).flatMap((s) => s.values),
            ...(v.scatter ?? []).flatMap((s) => s.points.flatMap((p) => [p.x, p.y])),
            ...(v.bins ?? []).map((b) => b.count),
          ]
        : (v.points ?? []).flatMap((p) => [p.x, p.y]);
    const close = (n: number) => (m: number) => Math.abs(m - n) <= 1e-6 + Math.abs(n) * 0.005;
    const missing = shown.filter((n) => !text.some(close(n)) && !source.some(close(n)));
    if (missing.length) result.push({ sectionIndex, sectionId: section.id, numbers: missing });
  });
  return result;
}

/** Repair-prompt lines for the AI. */
export function sourcedNumberProblems(lesson: Lesson, excerpts: Record<string, string>): string[] {
  return unsupportedSourcedNumbers(lesson, excerpts).map(
    (u) =>
      `sections.${u.sectionIndex}.visual: a "sourced" chart shows ${u.numbers.slice(0, 5).join(", ")}, which are not in its source excerpt. Use only numbers from that excerpt, or set "data": "illustrative" and say the numbers are made up for teaching.`,
  );
}

/** The lesson without sourced charts whose numbers can't be traced (used on the last try). */
export function dropUnsupportedCharts(lesson: Lesson, excerpts: Record<string, string>): Lesson {
  const bad = new Set(unsupportedSourcedNumbers(lesson, excerpts).map((u) => u.sectionIndex));
  if (bad.size === 0) return lesson;
  return {
    ...lesson,
    sections: lesson.sections.map((s, i) => {
      if (!bad.has(i)) return s;
      const copy = { ...s };
      delete copy.visual;
      return copy;
    }),
  };
}
