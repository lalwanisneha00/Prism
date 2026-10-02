/**
 * The six learning levels (SPEC §2). `available` controls what the picker shows:
 * All six are switched on (V2 · Step 2). Set one to false to hide it from the picker.
 */
export const levels = [
  {
    id: 1,
    slug: "first-encounter",
    name: "First Encounter",
    forWho: "I've never seen this before",
    style: "Everyday analogy first, zero jargon, one idea at a time.",
    available: true,
  },
  {
    id: 2,
    slug: "building-blocks",
    name: "Building Blocks",
    forWho: "I've seen it, but my basics are shaky",
    style: "Recaps the prerequisites, then connects the pieces.",
    available: true,
  },
  {
    id: 3,
    slug: "second-chance",
    name: "Second Chance",
    forWho: "I've studied it 2–3 times and I'm still stuck",
    style: "A completely new angle, plus the common misconceptions.",
    available: true,
  },
  {
    id: 4,
    slug: "deep-dive",
    name: "Deep Dive",
    forWho: "I want to really understand why",
    style: "Step-by-step derivations, edge cases and further reading.",
    available: true,
  },
  {
    id: 5,
    slug: "exam-prep",
    name: "Exam Prep",
    forWho: "I have a test coming up",
    style: "Question patterns, solved problems and common traps.",
    available: true,
  },
  {
    id: 6,
    slug: "last-minute",
    name: "Last-Minute Revision",
    forWho: "My exam is in a few hours",
    style: "One-page cheat sheet, formulas and rapid recall questions.",
    available: true,
  },
] as const;

export type Level = (typeof levels)[number];
export type LevelSlug = Level["slug"];

export const availableLevels = levels.filter((l) => l.available);

export function findLevel(slug: string): Level | undefined {
  return levels.find((l) => l.slug === slug);
}
