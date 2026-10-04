import type { QuizQuestion, Lesson } from "@/lib/schema";

/*
 * The chapter-level extras (V2.5 · Step 5), built from the topic lessons already in the
 * chapter lesson, so they cost no AI calls: one revision sheet and formula list, a quiz that
 * mixes the topics, "take a break" points, and the time left.
 */

export type TopicLesson = { topicId: string; name: string; minutes: number; lesson: Lesson };

/** One revision sheet for the chapter: every topic's formulas and key points, without repeats. */
export function mergeRevision(topics: readonly TopicLesson[]): {
  formulas: string[];
  keyPoints: string[];
  mnemonics: string[];
} {
  const seen = new Set<string>();
  const unique = (items: string[]) =>
    items.filter((item) => {
      const key = item.replace(/\s+/g, " ").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return {
    formulas: unique(topics.flatMap((t) => t.lesson.revisionSheet.formulas)),
    keyPoints: unique(topics.flatMap((t) => t.lesson.revisionSheet.keyPoints)),
    mnemonics: unique(topics.flatMap((t) => t.lesson.revisionSheet.mnemonics ?? [])),
  };
}

export type MixedQuestion = { topicId: string; topicName: string; question: QuizQuestion };

/**
 * A quiz that mixes the topics: a few questions from each, interleaved (topic 1, 2, 3, 1, 2…)
 * so the student has to recall which idea applies, as in an exam.
 */
export function mixedQuiz(topics: readonly TopicLesson[], perTopic = 2): MixedQuestion[] {
  const pools = topics.map((t) =>
    t.lesson.quiz.slice(0, perTopic).map((question) => ({
      topicId: t.topicId,
      topicName: t.name,
      question,
    })),
  );
  const out: MixedQuestion[] = [];
  for (let round = 0; round < perTopic; round++) {
    for (const pool of pools) if (pool[round]) out.push(pool[round]);
  }
  return out;
}

/** Each topic's score in the mixed quiz, for weak-topic tracking. */
export function scoresByTopic(
  questions: readonly MixedQuestion[],
  correct: readonly boolean[],
): { topicId: string; score: number; total: number }[] {
  const map = new Map<string, { score: number; total: number }>();
  questions.forEach((q, i) => {
    const entry = map.get(q.topicId) ?? { score: 0, total: 0 };
    entry.total++;
    if (correct[i]) entry.score++;
    map.set(q.topicId, entry);
  });
  return [...map].map(([topicId, s]) => ({ topicId, ...s }));
}

/** Topic indexes after which a "take a break" marker goes: roughly every `every` minutes. */
export function breakPoints(topics: readonly { minutes: number }[], every = 25): number[] {
  const points: number[] = [];
  let run = 0;
  topics.forEach((t, i) => {
    run += t.minutes;
    if (run >= every && i < topics.length - 1) {
      points.push(i);
      run = 0;
    }
  });
  return points;
}

/** Minutes still to read: the topics not finished yet. */
export function minutesLeft(
  topics: readonly { id: string; minutes: number }[],
  done: ReadonlySet<string>,
): number {
  return topics.filter((t) => !done.has(t.id)).reduce((a, t) => a + t.minutes, 0);
}
