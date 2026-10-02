import type { LevelSlug } from "@/data/levels";

/** The building blocks of a lesson page, in the order a level wants them. */
export type LessonBlock =
  | "prerequisites"
  | "sections"
  | "analogies"
  | "workedExamples"
  | "misconceptions"
  | "quiz"
  | "revisionSheet"
  | "furtherLearning"
  /** Exam worksheet and past-paper (PYQ) solver, generated on request. */
  | "worksheet";

export type LevelLayout = {
  blocks: LessonBlock[];
  /** Headings that differ from the defaults for this level. */
  titles?: Partial<Record<LessonBlock, string>>;
  /** Tuck the long explanations into a collapsible box (for students short on time). */
  collapseSections?: boolean;
};

export const defaultBlockTitles: Record<LessonBlock, string> = {
  prerequisites: "Before you start",
  sections: "The lesson",
  analogies: "Analogies that help",
  workedExamples: "Worked examples",
  misconceptions: "Common mistakes",
  quiz: "Check yourself",
  revisionSheet: "Revision sheet",
  furtherLearning: "Keep learning",
  worksheet: "Worksheet & past papers",
};

/** Each level gets a different page layout (SPEC §2). */
export const levelLayouts: Record<LevelSlug, LevelLayout> = {
  "first-encounter": {
    blocks: [
      "prerequisites",
      "sections",
      "analogies",
      "workedExamples",
      "misconceptions",
      "quiz",
      "revisionSheet",
      "furtherLearning",
    ],
  },
  "building-blocks": {
    blocks: [
      "prerequisites",
      "sections",
      "analogies",
      "workedExamples",
      "misconceptions",
      "quiz",
      "revisionSheet",
      "furtherLearning",
    ],
    titles: { prerequisites: "The pieces you need first" },
  },
  "second-chance": {
    blocks: [
      "misconceptions",
      "sections",
      "analogies",
      "workedExamples",
      "quiz",
      "revisionSheet",
      "prerequisites",
      "furtherLearning",
    ],
    titles: {
      misconceptions: "What's probably tripping you up",
      sections: "A fresh way to see it",
      prerequisites: "Quick refresher",
    },
  },
  "deep-dive": {
    blocks: [
      "prerequisites",
      "sections",
      "workedExamples",
      "misconceptions",
      "analogies",
      "quiz",
      "furtherLearning",
      "revisionSheet",
    ],
    titles: { furtherLearning: "Papers and deeper reading" },
  },
  "exam-prep": {
    blocks: [
      "workedExamples",
      "quiz",
      "worksheet",
      "misconceptions",
      "revisionSheet",
      "sections",
      "furtherLearning",
    ],
    titles: { workedExamples: "Solved exam-style problems", misconceptions: "Common traps" },
  },
  "last-minute": {
    blocks: ["revisionSheet", "quiz", "misconceptions", "sections", "workedExamples"],
    titles: {
      revisionSheet: "Your cheat sheet",
      quiz: "Rapid recall",
      misconceptions: "Don't lose marks on these",
      sections: "Full explanation (if you have time)",
    },
    collapseSections: true,
  },
};

export function blockTitle(level: LevelSlug, block: LessonBlock): string {
  return levelLayouts[level].titles?.[block] ?? defaultBlockTitles[block];
}
