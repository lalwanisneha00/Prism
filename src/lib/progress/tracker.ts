import type { TopicStatus } from "@/lib/conceptMap";
import type { Subject } from "@/lib/subjects";

/*
 * The progress tracker (SPEC §8, V2 · Step 13): a study streak and how far each chapter has
 * come, built from what the student already does (lessons, quizzes, flashcards, notes, plan).
 */

/** A timestamp as "YYYY-MM-DD" in the student's own time zone. */
export function localDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function previousDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return localDate(new Date(y, m - 1, d - 1, 12).getTime());
}

/**
 * Days in a row with some study, counting back from today. A streak that ended yesterday is
 * still alive today (you haven't missed today yet).
 */
export function streak(
  activeDays: Set<string>,
  today: string,
): { days: number; studiedToday: boolean } {
  const studiedToday = activeDays.has(today);
  let day = studiedToday ? today : previousDay(today);
  let days = 0;
  while (activeDays.has(day)) {
    days++;
    day = previousDay(day);
  }
  return { days, studiedToday };
}

export type ChapterProgress = {
  id: string;
  name: string;
  total: number;
  mastered: number;
  tried: number;
  weak: number;
};

/** For each chapter: how many topics are mastered, tried, weak or not started. */
export function chapterProgress(
  subject: Subject,
  statuses: Map<string, TopicStatus>,
): ChapterProgress[] {
  return subject.chapters.map((c) => {
    const s = c.topics.map((t) => statuses.get(t.id) ?? "new");
    return {
      id: c.id,
      name: c.name,
      total: c.topics.length,
      mastered: s.filter((x) => x === "mastered").length,
      tried: s.filter((x) => x === "tried").length,
      weak: s.filter((x) => x === "weak").length,
    };
  });
}
