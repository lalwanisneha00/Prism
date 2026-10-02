import type { Lesson } from "@/lib/schema";
import { getDb, type RecentTopic, type SavedLesson } from "@/lib/storage/db";

/** One saved copy per (subject, topic, level, duration). */
export function lessonId(
  meta: Pick<Lesson["meta"], "subject" | "topic" | "level" | "durationMin">,
) {
  return `${meta.subject}:${meta.topic}:${meta.level}:${meta.durationMin}`;
}

export async function saveLesson(lesson: Lesson, now = Date.now()): Promise<SavedLesson> {
  const db = await getDb();
  const record: SavedLesson = {
    id: lessonId(lesson.meta),
    lesson,
    savedAt: now,
    updatedAt: now,
    deleted: false,
  };
  await db.put("savedLessons", record);
  return record;
}

/** Soft delete: the tombstone lets a future cloud sync remove it everywhere. */
export async function unsaveLesson(id: string, now = Date.now()): Promise<void> {
  const db = await getDb();
  const existing = await db.get("savedLessons", id);
  if (existing) await db.put("savedLessons", { ...existing, deleted: true, updatedAt: now });
}

export async function getSavedLesson(id: string): Promise<SavedLesson | undefined> {
  const record = await (await getDb()).get("savedLessons", id);
  return record && !record.deleted ? record : undefined;
}

/** Saved lessons, newest first. */
export async function listSavedLessons(): Promise<SavedLesson[]> {
  const all = await (await getDb()).getAllFromIndex("savedLessons", "bySavedAt");
  return all.filter((r) => !r.deleted).reverse();
}

export type RecentInput = Omit<RecentTopic, "id" | "updatedAt" | "deleted" | "viewedAt">;

/** Remembers that a topic was studied; opening it again moves it to the top. */
export async function recordRecent(entry: RecentInput, now = Date.now()): Promise<void> {
  const db = await getDb();
  const record: RecentTopic = {
    ...entry,
    id: `${entry.subject}:${entry.topic}`,
    viewedAt: now,
    updatedAt: now,
    deleted: false,
  };
  await db.put("recentTopics", record);
}

export async function listRecent(limit = 6): Promise<RecentTopic[]> {
  const all = await (await getDb()).getAllFromIndex("recentTopics", "byViewedAt");
  return all
    .filter((r) => !r.deleted)
    .reverse()
    .slice(0, limit);
}

export async function clearRecent(now = Date.now()): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("recentTopics", "readwrite");
  for (const r of await tx.store.getAll()) {
    if (!r.deleted) await tx.store.put({ ...r, deleted: true, updatedAt: now });
  }
  await tx.done;
}
