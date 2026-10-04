import { WEAKNESS } from "@/lib/priority/config";

/*
 * How weak the student is on a topic — SPEC §12.9 part 2.1. Like a fitness tracker: recent
 * workouts count more than old ones, and one good session after practice shows you've
 * recovered. Built only from what the student did; nothing is guessed.
 */

export type QuestionType = "numerical" | "conceptual";

export type LearningSignal =
  /** A quiz or mock-test result on the topic. */
  | { kind: "quiz" | "mock"; at: number; score: number; total: number }
  /** One wrong answer (kept to spot repeated mistakes and the kind of mistake). */
  | { kind: "wrong"; at: number; question: string; type?: QuestionType }
  /** "Didn't understand" highlight, lesson left part-way, "Explain this simpler". */
  | { kind: "confused" | "abandoned" | "simpler"; at: number };

export type Weakness = {
  /** 0 (fine) … 1 (very weak). */
  score: number;
  weak: boolean;
  /** Quiz and mock questions answered on the topic. */
  questions: number;
  /** Accuracy of the most recent quiz or mock, when there is one. */
  latestAccuracy?: number;
  reasons: string[];
};

const DAY = 86_400_000;

/** An event's weight: 1 today, ½ after a half-life, ¼ after two, … */
export const decay = (at: number, now: number) =>
  0.5 ** (Math.max(0, now - at) / (WEAKNESS.halfLifeDays * DAY));

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function weakness(signals: readonly LearningSignal[], now: number): Weakness {
  const results = signals
    .filter(
      (s): s is Extract<LearningSignal, { kind: "quiz" | "mock" }> =>
        s.kind === "quiz" || s.kind === "mock",
    )
    .filter((s) => s.total > 0)
    .sort((a, b) => a.at - b.at);
  const questions = results.reduce((n, r) => n + r.total, 0);
  const latest = results.at(-1);
  const latestAccuracy = latest ? latest.score / latest.total : undefined;
  const reasons: string[] = [];

  // Accuracy part: decayed, question-weighted share of wrong answers.
  let wrongWeight = 0;
  let allWeight = 0;
  for (const r of results) {
    const w = decay(r.at, now) * r.total;
    wrongWeight += w * (1 - r.score / r.total);
    allWeight += w;
  }
  const accuracyPart = allWeight > 0 ? wrongWeight / allWeight : 0;
  if (latest && latestAccuracy !== undefined) {
    reasons.push(
      `scored ${pct(latestAccuracy)} in your last ${latest.kind === "mock" ? "mock test" : "quiz"}`,
    );
  }

  // Soft signals: each adds a little, fading with time.
  const soft = signals.filter(
    (s) => s.kind === "confused" || s.kind === "abandoned" || s.kind === "simpler",
  );
  let softPart = 0;
  for (const s of soft)
    softPart += WEAKNESS[s.kind as "confused" | "abandoned" | "simpler"] * decay(s.at, now);
  const confused = soft.filter((s) => s.kind === "confused").length;
  const abandoned = soft.filter((s) => s.kind === "abandoned").length;
  const simpler = soft.filter((s) => s.kind === "simpler").length;
  if (confused) reasons.push(`${plural(confused, '"didn\'t understand" highlight')}`);
  if (abandoned) reasons.push(`left ${plural(abandoned, "lesson")} part-way`);
  if (simpler)
    reasons.push(`asked for a simpler explanation ${simpler === 1 ? "once" : `${simpler} times`}`);

  // The same question answered wrong more than once.
  const wrongCounts = new Map<string, number>();
  for (const s of signals)
    if (s.kind === "wrong") wrongCounts.set(s.question, (wrongCounts.get(s.question) ?? 0) + 1);
  const repeated = [...wrongCounts.values()].filter((n) => n > 1).length;
  if (repeated) {
    softPart += WEAKNESS.repeatedWrong * repeated;
    reasons.push(`${plural(repeated, "question")} answered wrong more than once`);
  }

  const score = Math.min(1, results.length > 0 ? 0.75 * accuracyPart + softPart : softPart);
  // Enough evidence: a real result, or several soft signals (never a single tap).
  const enough = results.length > 0 || soft.length + repeated >= WEAKNESS.minSoftSignals;
  // Doing well in the most recent quiz, after the last sign of trouble, means recovered.
  const lastTrouble = Math.max(0, ...soft.map((s) => s.at));
  const recovered =
    latest !== undefined &&
    latestAccuracy !== undefined &&
    latestAccuracy >= WEAKNESS.recoveredAt &&
    latest.at >= lastTrouble;
  const weak = enough && !recovered && score >= WEAKNESS.weakAt;
  return { score, weak, questions, latestAccuracy, reasons };
}

/** "Numerical" or "conceptual" when most of the student's wrong answers are of that kind. */
export function mistakeProfile(
  signals: readonly LearningSignal[],
  minWrong: number,
  share: number,
): QuestionType | undefined {
  const typed = signals.filter(
    (s): s is Extract<LearningSignal, { kind: "wrong" }> =>
      s.kind === "wrong" && s.type !== undefined,
  );
  if (typed.length < minWrong) return undefined;
  const numerical = typed.filter((s) => s.type === "numerical").length;
  if (numerical / typed.length >= share) return "numerical";
  if ((typed.length - numerical) / typed.length >= share) return "conceptual";
  return undefined;
}
