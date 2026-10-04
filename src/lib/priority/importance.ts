import { BAND_THRESHOLDS, IMPORTANCE_WEIGHTS } from "@/lib/priority/config";

/*
 * How much a topic is worth ("return") — SPEC §12.9 part 1. Like deciding which shops to visit
 * on a short trip: the ones your friends keep mentioning (previous-year papers) come first,
 * then the guidebook (syllabus marks or hours), then the ones every other shop depends on.
 * Weightage is never invented: with no evidence the band is Medium and "not known yet".
 */

export type Band = "high" | "medium" | "low";

export type ImportanceEvidence = {
  /** The topic in the student's uploaded previous-year papers. */
  papers?: { inPapers: number; totalPapers: number; marks?: number };
  /** The topic's unit compared with the whole syllabus (teaching hours and/or marks). */
  unit?: {
    hours?: number;
    totalHours?: number;
    marks?: number;
    totalMarks?: number;
    /** How many units the syllabus has (an equal share is 1/units). */
    units: number;
  };
  /** Later topics that build on it (directly or further on), and the most any topic has. */
  dependents?: { count: number; max: number };
  /** Passages of the faculty's uploaded material matching it, and the most for any topic. */
  material?: { passages: number; max: number };
  /** The student's own choice ("my professor said this is important"). It always wins. */
  override?: Band;
};

export type Importance = {
  /** 0 (least) … 1 (most). */
  score: number;
  band: Band;
  /** False when there was no evidence at all: shown as "importance not known yet". */
  known: boolean;
  setByYou: boolean;
  /** Plain-words reasons for the "Why?" note, real factors only. */
  reasons: string[];
};

const BAND_SCORE: Record<Band, number> = { high: 0.85, medium: 0.5, low: 0.15 };

export const bandLabel = (b: Band) =>
  b === "high" ? "High return" : b === "low" ? "Low return" : "Medium return";

export function bandOf(score: number): Band {
  if (score >= BAND_THRESHOLDS.high) return "high";
  if (score <= BAND_THRESHOLDS.low) return "low";
  return "medium";
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function topicImportance(e: ImportanceEvidence): Importance {
  const parts: { weight: number; score: number }[] = [];
  const reasons: string[] = [];

  const p = e.papers;
  if (p && p.totalPapers > 0) {
    const share = p.inPapers / p.totalPapers;
    parts.push({ weight: IMPORTANCE_WEIGHTS.papers, score: share });
    reasons.push(
      p.inPapers > 0
        ? `appeared in ${p.inPapers} of your ${plural(p.totalPapers, "paper")}${p.marks ? ` (${p.marks} marks)` : ""}`
        : `not in any of your ${plural(p.totalPapers, "paper")}`,
    );
  }

  const u = e.unit;
  const hourShare = u?.hours && u.totalHours ? u.hours / u.totalHours : undefined;
  const markShare = u?.marks && u.totalMarks ? u.marks / u.totalMarks : undefined;
  const unitShare = markShare ?? hourShare;
  if (u && unitShare !== undefined && u.units > 1) {
    // Compared with an equal share of the syllabus: a fair share scores 0.5 (Medium), twice
    // the fair share (or more) scores 1, nothing scores 0.
    const relative = unitShare * u.units;
    parts.push({
      weight: IMPORTANCE_WEIGHTS.syllabus,
      score: Math.max(0, Math.min(1, 0.5 + (relative - 1) * 0.5)),
    });
    reasons.push(
      markShare !== undefined
        ? `its unit carries ${u!.marks} of ${u!.totalMarks} syllabus marks`
        : `its unit has ${plural(u!.hours!, "teaching hour")} of ${u!.totalHours}`,
    );
  }

  const d = e.dependents;
  if (d && d.count > 0) {
    // Structure can only raise importance: a topic nothing builds on isn't thereby low.
    parts.push({
      weight: IMPORTANCE_WEIGHTS.dependents,
      score: 0.5 + 0.5 * Math.min(1, d.count / Math.max(d.max, 1)),
    });
    reasons.push(`${plural(d.count, "later topic")} build${d.count === 1 ? "s" : ""} on it`);
  }

  const m = e.material;
  if (m && m.passages > 0) {
    parts.push({
      weight: IMPORTANCE_WEIGHTS.material,
      score: Math.min(1, m.passages / Math.max(m.max, 1)),
    });
    reasons.push(`your faculty's material covers it (${plural(m.passages, "passage")})`);
  }

  if (e.override) {
    return {
      score: BAND_SCORE[e.override],
      band: e.override,
      known: true,
      setByYou: true,
      reasons: ["set by you", ...reasons],
    };
  }
  if (parts.length === 0) {
    return {
      score: 0.5,
      band: "medium",
      known: false,
      setByYou: false,
      reasons: ["importance not known yet"],
    };
  }
  const total = parts.reduce((s, x) => s + x.weight, 0);
  const score = parts.reduce((s, x) => s + x.weight * x.score, 0) / total;
  return { score, band: bandOf(score), known: true, setByYou: false, reasons };
}

/** "High return: appeared in 4 of your 5 papers · 6 later topics build on it". */
export function whyImportance(i: Importance): string {
  if (!i.known) {
    return "Importance not known yet. Upload previous-year papers for a better estimate.";
  }
  return `${bandLabel(i.band)}: ${i.reasons.join(" · ")}`;
}

/** A chapter's (or subject's) importance from its topics: the average, with a summary reason. */
export function rollUpImportance(items: readonly Importance[], override?: Band): Importance {
  if (override) {
    return {
      score: BAND_SCORE[override],
      band: override,
      known: true,
      setByYou: true,
      reasons: ["set by you"],
    };
  }
  const known = items.filter((i) => i.known);
  if (known.length === 0) {
    return {
      score: 0.5,
      band: "medium",
      known: false,
      setByYou: false,
      reasons: ["importance not known yet"],
    };
  }
  const score = known.reduce((s, i) => s + i.score, 0) / known.length;
  const high = known.filter((i) => i.band === "high").length;
  const reasons = [
    `${high} of ${plural(items.length, "topic")} high return`,
    ...(known.length < items.length ? [`${items.length - known.length} not known yet`] : []),
  ];
  return { score, band: bandOf(score), known: true, setByYou: false, reasons };
}

/** For each topic id: how many topics build on it, directly or further on (within one subject). */
export function dependentCounts(
  topics: readonly { id: string; requires?: readonly string[] }[],
): Map<string, number> {
  const children = new Map<string, string[]>();
  for (const t of topics) {
    for (const r of t.requires ?? []) children.set(r, [...(children.get(r) ?? []), t.id]);
  }
  const counts = new Map<string, number>();
  for (const t of topics) {
    const seen = new Set<string>();
    const stack = [...(children.get(t.id) ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...(children.get(id) ?? []));
    }
    counts.set(t.id, seen.size);
  }
  return counts;
}
