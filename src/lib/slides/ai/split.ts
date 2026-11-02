import { contentSlides, SHORT_BY } from "@/lib/slides/ai/outline";
import { planProblems, type Slide, type SlidePlan } from "@/lib/slides/plan";
import { conceptFit, overflowRisks } from "@/lib/slides/pptx";
import { hasRawMath } from "@/lib/slides/text";

/*
 * Denser slides must still look clean (deck quality overhaul). A slide whose text can't fit at
 * the smallest readable size is split into two instead of being shrunk: a concept slide moves its
 * example (then half its points) to a "continued" slide, a long list is split in half. Then cheap
 * code checks (no AI): slide count, no empty slides, no text overflow.
 */

const continued = (title: string) => `${title.slice(0, 78)} (continued)`;

type Concept = Extract<Slide, { layout: "concept" }>;

function splitConcept(s: Concept): Slide[] {
  if (conceptFit(s).fits) return [s];
  if (s.example && (s.points.length > 0 || s.analogy)) {
    const first: Concept = { ...s, example: undefined };
    const second: Concept = {
      id: `${s.id}b`,
      layout: "concept",
      title: continued(s.title),
      analogy: "",
      points: [],
      example: s.example,
      takeaway: s.takeaway,
      notes: "",
    };
    return [...splitConcept(first), second];
  }
  if (s.points.length >= 2) {
    const half = Math.ceil(s.points.length / 2);
    return [
      { ...s, points: s.points.slice(0, half), example: undefined },
      {
        id: `${s.id}b`,
        layout: "concept",
        title: continued(s.title),
        analogy: "",
        points: s.points.slice(half),
        ...(s.example ? { example: s.example } : {}),
        takeaway: s.takeaway,
        notes: "",
      },
    ];
  }
  return [s];
}

/** Splits slides that would overflow into two (concept slides and long lists). */
export function splitOverflow(plan: SlidePlan): SlidePlan {
  const slides = plan.slides.flatMap((s): Slide[] => {
    if (s.layout === "concept") return splitConcept(s);
    if ((s.layout === "bullets" || s.layout === "recap") && s.points.length > 3) {
      const risky = overflowRisks({ ...plan, slides: [s] }).length > 0;
      if (!risky) return [s];
      const half = Math.ceil(s.points.length / 2);
      return [
        { ...s, points: s.points.slice(0, half) },
        {
          ...s,
          id: `${s.id}b`,
          title: continued(s.title),
          points: s.points.slice(half),
          notes: "",
        },
      ];
    }
    return [s];
  });
  return { ...plan, slides };
}

/**
 * The cheap checks every deck gets (no AI): the content slides the student asked for were
 * written, no slide is empty or invalid, and no text overflows. Empty = fine.
 */
export function deckChecks(plan: SlidePlan, asked: number, written: number): string[] {
  const out: string[] = [];
  const want = contentSlides(plan.purpose, asked);
  if (written > want || written < want - SHORT_BY)
    out.push(`${written} content slides written, ${want} asked for`);
  out.push(...planProblems(plan));
  out.push(...overflowRisks(plan));
  plan.slides.forEach((slide, i) => {
    const raw = visibleTexts(slide).find(hasRawMath);
    if (raw) out.push(`slide ${i + 1}: raw LaTeX in "${raw.slice(0, 60)}"`);
  });
  return out;
}

/** Every text a slide shows or speaks, except code (where $ and \ are real characters). */
export function visibleTexts(v: unknown, key = ""): string[] {
  if (key === "code" || key === "material" || key === "id" || key === "key") return [];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap((x) => visibleTexts(x));
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => visibleTexts(x, k));
  return [];
}
