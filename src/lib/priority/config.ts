/*
 * Every number the priority engine uses (V3 · Step 11, SPEC §12.9), in one place so it can be
 * tuned later without touching the logic. Nothing here is invented weightage: these only say
 * how much each kind of real evidence counts.
 */

/** How much each kind of evidence counts towards a topic's importance (renormalised over the evidence present). */
export const IMPORTANCE_WEIGHTS = {
  /** The student's uploaded previous-year papers: the most trusted evidence. */
  papers: 0.45,
  /** Marks or teaching hours of the topic's unit in the syllabus data. */
  syllabus: 0.25,
  /** How many later topics build on it (a foundation topic matters more). */
  dependents: 0.2,
  /** How much of the faculty's uploaded material covers it. */
  material: 0.1,
} as const;

/** Score ≥ high → "High return"; score ≤ low → "Low return"; otherwise "Medium". */
export const BAND_THRESHOLDS = { high: 0.62, low: 0.38 } as const;

/** Weak-topic score (SPEC §12.9 part 2.1). */
export const WEAKNESS = {
  /** An event's weight halves every this many days, so recent results count more. */
  halfLifeDays: 21,
  /** A topic is weak at or above this score. */
  weakAt: 0.5,
  /** A latest quiz score at or above this means "doing well now": the topic stops being weak. */
  recoveredAt: 0.8,
  /** How much each soft signal adds (before decay). */
  confused: 0.15,
  abandoned: 0.1,
  simpler: 0.1,
  repeatedWrong: 0.08,
  /** Soft signals alone need at least this many to make a topic weak (never one tap). */
  minSoftSignals: 2,
} as const;

/** Predicted-tough topics (SPEC §12.9 part 2.2): never from one wrong answer. */
export const PREDICTION = {
  /** A weak topic needs at least this many quiz/mock questions answered before it predicts anything. */
  minQuestions: 5,
  /** Mistake-type prediction needs this many wrong answers, mostly (share) of one type. */
  minWrongForType: 4,
  typeShare: 0.7,
  /** Suggested revision length for a weak prerequisite. */
  reviseMinutes: 10,
} as const;

/** Starting lesson length (minutes) per level, before importance, difficulty and the student. */
export const BASE_LENGTH: Record<string, number> = {
  "first-encounter": 20,
  "building-blocks": 15,
  "second-chance": 20,
  "deep-dive": 30,
  "exam-prep": 15,
  "last-minute": 5,
};

/** Shortest and longest recommendation per level (sensible limits). */
export const LENGTH_LIMITS: Record<string, [number, number]> = {
  "first-encounter": [10, 60],
  "building-blocks": [10, 45],
  "second-chance": [10, 45],
  "deep-dive": [15, 90],
  "exam-prep": [10, 45],
  "last-minute": [5, 15],
};

/** Levels whose length leans on importance (revision) rather than difficulty (learning). */
export const REVISION_LEVELS = new Set(["exam-prep", "last-minute"]);

export const STUDENT_FACTOR = {
  weak: 1.35,
  tough: 1.2,
  /** Already completed with a good score: a shorter refresher. */
  doneWell: 0.7,
} as const;

/** Planner time-range presets (minutes per topic, lowest → highest priority). */
export const RANGE_PRESETS = {
  light: { label: "Light", min: 5, max: 20 },
  balanced: { label: "Balanced", min: 10, max: 30 },
  deep: { label: "Deep", min: 15, max: 60 },
} as const;
export type RangePreset = keyof typeof RANGE_PRESETS;

/** Planner days and sessions (SPEC §12.9 part 4.2). */
export const PLANNER = {
  maxMinutesPerDay: 480,
  /** Kept free each day for overruns. */
  bufferShare: 0.1,
  sessionMinutes: 50,
  shortBreak: 10,
  longBreak: 30,
  longBreakEvery: 3,
  reviseMinutes: 15,
  flashcardMinutes: 10,
  /** A second look at weak or predicted-tough topics this many days after first study. */
  revisitAfterDays: 3,
  /** Final revision + mock test before the exam, when the plan is at least this many days. */
  finalRevisionMinDays: 4,
  finalRevisionMinutes: 60,
  mockTestMinutes: 60,
  /** Unused time worth offering for extra revision. */
  spareOfferMinutes: 60,
} as const;

/** How priority is built from importance and the student, per kind of level. */
export const PRIORITY_WEIGHTS = {
  learning: { importance: 0.45, need: 0.55 },
  revision: { importance: 0.7, need: 0.3 },
} as const;
