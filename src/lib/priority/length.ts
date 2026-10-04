import { durations, type DurationMinutes } from "@/data/durations";
import { BASE_LENGTH, LENGTH_LIMITS, REVISION_LEVELS, STUDENT_FACTOR } from "@/lib/priority/config";
import { bandLabel, type Importance } from "@/lib/priority/importance";

/*
 * How long a lesson on one topic should be — SPEC §12.9 part 3. Like a recipe's cooking time:
 * it depends on the dish (level), how much it matters (importance), how tough it is
 * (difficulty) and the cook (the student). One length is marked Recommended, with neighbours
 * either side, and "Other length" for the full list.
 */

export type StudentState = "new" | "tried" | "weak" | "tough" | "done-well";

export type LengthInput = {
  level: string;
  importance: Importance;
  /** 0 (easy) … 1 (hard): prerequisite depth, derivations, numericals. */
  difficulty: number;
  student: StudentState;
};

export type LengthAdvice = {
  recommended: DurationMinutes;
  /** Three or four choices around the recommendation, shortest first. */
  options: DurationMinutes[];
  /** "Recommended 20 min: High return · first time learning it · …" */
  why: string;
  /** False when importance is not known yet: the advice is a starting point, not certain. */
  certain: boolean;
};

const STEPS = durations.map((d) => d.minutes);

export function nearestDuration(minutes: number): DurationMinutes {
  return STEPS.reduce((best, m) => (Math.abs(m - minutes) < Math.abs(best - minutes) ? m : best));
}

/** 0–1 difficulty from how many earlier topics it rests on and whether it is numerical. */
export function difficultyOf(prerequisiteDepth: number, numericalHeavy: boolean): number {
  return Math.min(1, Math.min(prerequisiteDepth, 8) / 10 + (numericalHeavy ? 0.25 : 0));
}

export function recommendLength(input: LengthInput): LengthAdvice {
  const base = BASE_LENGTH[input.level] ?? 15;
  const [lo, hi] = LENGTH_LIMITS[input.level] ?? [5, 60];
  const imp = input.importance.score - 0.5; // −0.5 … 0.5
  const diff = input.difficulty - 0.5;
  // Revision levels lean on importance; learning levels on difficulty and prerequisites.
  const factor = REVISION_LEVELS.has(input.level)
    ? 1 + 1.0 * imp + 0.3 * diff
    : 1 + 0.5 * imp + 0.8 * diff;
  const studentFactor =
    input.student === "weak"
      ? STUDENT_FACTOR.weak
      : input.student === "tough"
        ? STUDENT_FACTOR.tough
        : input.student === "done-well"
          ? STUDENT_FACTOR.doneWell
          : 1;
  const raw = Math.max(lo, Math.min(hi, base * factor * studentFactor));
  let recommended = nearestDuration(raw);
  if (recommended < lo) recommended = nearestDuration(lo);
  if (recommended > hi) recommended = STEPS.filter((m) => m <= hi).at(-1) ?? recommended;

  const i = STEPS.indexOf(recommended);
  const around = [STEPS[i - 1], recommended, STEPS[i + 1], STEPS[i + 2]].filter(
    (m): m is DurationMinutes => m !== undefined,
  );
  const options = around.slice(0, 4);

  const why: string[] = [];
  why.push(input.importance.known ? bandLabel(input.importance.band) : "importance not known yet");
  const levelWords: Record<string, string> = {
    "first-encounter": "first time learning it",
    "building-blocks": "rebuilding the basics",
    "second-chance": "a fresh angle on it",
    "deep-dive": "going deep",
    "exam-prep": "exam practice",
    "last-minute": "quick revision",
  };
  why.push(levelWords[input.level] ?? "your level");
  if (input.difficulty >= 0.6) why.push("builds on many earlier topics");
  if (input.student === "weak") why.push("you found it hard before");
  if (input.student === "tough") why.push("you found its prerequisite hard");
  if (input.student === "done-well") why.push("you've already done well in it");

  return {
    recommended,
    options,
    why: `Recommended ${recommended} min: ${why.join(" · ")}`,
    certain: input.importance.known,
  };
}
