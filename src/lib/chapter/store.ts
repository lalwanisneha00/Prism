import { topicsHash } from "@/lib/chapter/parts";
import type { Lesson } from "@/lib/schema";
import { getDb, type ChapterLessonRecord } from "@/lib/storage/db";

/*
 * Built chapter lessons, kept on this device (V2.5 · Step 4). Like a ring binder filled one
 * handout at a time: each finished topic is saved at once, so closing the tab loses nothing
 * and the next visit continues with the topics still missing.
 */

export type ChapterKey = {
  subject: string;
  chapter: string;
  level: string;
  minutes: number;
  order: { id: string; minutes: number }[];
  notes: boolean;
};

export function chapterLessonId(k: ChapterKey): string {
  const plan = k.order.map((o) => `${o.id}:${o.minutes}`);
  return `${k.subject}_${k.chapter}_${k.level}_${k.minutes}_${topicsHash(plan)}${k.notes ? ":notes" : ""}`;
}

export async function getChapterLesson(id: string): Promise<ChapterLessonRecord | undefined> {
  return (await getDb()).get("chapterLessons", id);
}

/** The stored record for this chapter lesson, created (empty) the first time. */
export async function openChapterLesson(
  k: ChapterKey,
  now = Date.now(),
): Promise<ChapterLessonRecord> {
  const id = chapterLessonId(k);
  const existing = await getChapterLesson(id);
  if (existing) return existing;
  const record: ChapterLessonRecord = { id, ...k, lessons: {}, createdAt: now, updatedAt: now };
  await (await getDb()).put("chapterLessons", record);
  return record;
}

async function update(
  id: string,
  change: (r: ChapterLessonRecord) => ChapterLessonRecord,
  now: number,
): Promise<ChapterLessonRecord | undefined> {
  const db = await getDb();
  const record = await db.get("chapterLessons", id);
  if (!record) return undefined;
  const next = { ...change(record), updatedAt: now };
  await db.put("chapterLessons", next);
  return next;
}

export function saveChapterParts(id: string, parts: unknown, now = Date.now()) {
  return update(id, (r) => ({ ...r, parts }), now);
}

export function saveTopicLesson(
  id: string,
  topicId: string,
  lesson: Lesson,
  libraryKey?: string,
  now = Date.now(),
) {
  return update(
    id,
    (r) => ({
      ...r,
      lessons: { ...r.lessons, [topicId]: { lesson, ...(libraryKey ? { libraryKey } : {}) } },
    }),
    now,
  );
}

/** Where the student is reading, and whether they finished a topic. */
export function saveChapterProgress(
  id: string,
  change: { position?: string; done?: string },
  now = Date.now(),
) {
  return update(
    id,
    (r) => ({
      ...r,
      ...(change.position ? { position: change.position } : {}),
      ...(change.done ? { done: [...new Set([...(r.done ?? []), change.done])] } : {}),
    }),
    now,
  );
}

/** Chapter lessons on this device, most recently used first (for "Continue where you left off"). */
export async function listChapterLessons(): Promise<ChapterLessonRecord[]> {
  const all = await (await getDb()).getAll("chapterLessons");
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
