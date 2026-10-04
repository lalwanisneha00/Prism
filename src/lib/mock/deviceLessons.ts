import type { TopicLesson } from "@/lib/chapter/extras";
import { listChapterLessons } from "@/lib/chapter/store";
import { listSavedLessons } from "@/lib/storage/library";
import type { Lesson } from "@/lib/schema";

/*
 * The fact-checked lessons on this device for one subject, grouped by chapter: saved lessons
 * and the topics of built chapter lessons. A multi-chapter mock test (V3 · Step 3) is
 * written only from these, so it never asks about something the student hasn't got checked
 * material for, and it costs no extra AI calls to gather.
 */
export async function lessonsByChapter(subjectId: string): Promise<Map<string, TopicLesson[]>> {
  const [saved, chapters] = await Promise.all([
    listSavedLessons().catch(() => []),
    listChapterLessons().catch(() => []),
  ]);
  const lessons: Lesson[] = [
    ...saved.flatMap((s) => (s.lesson ? [s.lesson] : [])),
    ...chapters
      .filter((c) => c.subject === subjectId)
      .flatMap((c) => Object.values(c.lessons).map((l) => l.lesson)),
  ];
  return groupLessons(lessons, subjectId);
}

/** One lesson per topic (the newest), grouped by chapter. */
export function groupLessons(
  lessons: readonly Lesson[],
  subjectId: string,
): Map<string, TopicLesson[]> {
  const byTopic = new Map<string, Lesson>();
  for (const l of lessons) {
    if (l.meta.subject !== subjectId) continue;
    const prev = byTopic.get(l.meta.topic);
    if (!prev || l.meta.createdAt > prev.meta.createdAt) byTopic.set(l.meta.topic, l);
  }
  const out = new Map<string, TopicLesson[]>();
  for (const l of byTopic.values()) {
    const list = out.get(l.meta.chapter) ?? [];
    list.push({
      topicId: l.meta.topic,
      name: l.meta.title,
      minutes: l.meta.durationMin,
      lesson: l,
    });
    out.set(l.meta.chapter, list);
  }
  return out;
}
