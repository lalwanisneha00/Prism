import type { LevelSlug } from "@/data/levels";

/*
 * The visual planner (SPEC §4.1): before writing, the AI decides for each section whether a
 * visual would really help and which kind. These rules steer that choice by subject type and
 * level, like a teacher who knows a maths class wants graphs and a law class wants timelines.
 */

export type SubjectType = "maths" | "physics" | "general";

export function subjectType(field: string): SubjectType {
  if (/math/i.test(field)) return "maths";
  if (/physic/i.test(field)) return "physics";
  return "general";
}

/** Preferred visual kinds per subject type, best first. */
export const preferredVisuals: Record<SubjectType, string[]> = {
  maths: ["graph", "formula", "steps", "derivation", "stats", "chart"],
  physics: ["widget", "phet", "formula", "graph", "steps", "chart"],
  general: ["chart", "compare", "steps", "mermaid", "formula"],
};

const levelStyle: Record<LevelSlug, string> = {
  "first-encounter": "simple, friendly visuals with ONE idea each; few labels",
  "building-blocks": "one visual per building block, each showing a single step clearly",
  "second-chance": "a fresh angle: comparisons of the wrong vs right idea, step-throughs",
  "deep-dive":
    "detailed interactive visuals: formula explorers, graphs with tangents or areas, stats explorers",
  "exam-prep":
    "exam-useful visuals: step-throughs of solution methods, comparison tables of formulas and cases",
  "last-minute":
    "compact summary visuals: a comparison table or a mind map, nothing that needs exploring",
};

export function plannerRules(field: string, level: LevelSlug): string {
  const type = subjectType(field);
  return `VISUAL PLAN (do this first, in "visualPlan"): for each section decide whether a visual would genuinely help understanding. If yes, pick the best kind; if it would only decorate, choose "none".
- Preferred kinds for this subject, best first: ${preferredVisuals[type].join(", ")}.
- For this level: ${levelStyle[level]}.
- Every caption says WHAT TO NOTICE, e.g. "Notice how the curve flattens as n grows."
- When a section has a visual, its audioScript chapter refers to it in words ("look at the graph: see how…").`;
}
