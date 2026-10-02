import type { Lesson } from "@/lib/schema";
import { getDb, type RecentTopic, type SavedLesson } from "@/lib/storage/db";
import { getRecord, putRecord } from "@/lib/storage/records";

/** One saved copy per (subject, topic, level, duration). */
export function lessonId(
  meta: Pick<Lesson["meta"], "subject" | "topic" | "level" | "durationMin">,
) {
  return `${meta.subject}:${meta.topic}:${meta.level}:${meta.durationMin}`;
}

export async function saveLesson(
  lesson: Lesson,
  now = Date.now(),
  libraryKey?: string,
): Promise<SavedLesson> {
  const record: SavedLesson = {
    id: lessonId(lesson.meta),
    lesson,
    savedAt: now,
    updatedAt: now,
    deleted: false,
    ...(libraryKey ? { libraryKey } : {}),
  };
  await putRecord("savedLessons", record);
  return record;
}

/** Soft delete: the tombstone lets the cloud sync remove it everywhere. */
export async function unsaveLesson(id: string, now = Date.now()): Promise<void> {
  const existing = await getRecord("savedLessons", id);
  if (existing) await putRecord("savedLessons", { ...existing, deleted: true, updatedAt: now });
}

export async function getSavedLesson(id: string): Promise<SavedLesson | undefined> {
  const record = await getRecord("savedLessons", id);
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
  await putRecord("recentTopics", {
    ...entry,
    id: `${entry.subject}:${entry.topic}`,
    viewedAt: now,
    updatedAt: now,
    deleted: false,
  });
}

export async function listRecent(limit = 6): Promise<RecentTopic[]> {
  const all = await (await getDb()).getAllFromIndex("recentTopics", "byViewedAt");
  return all
    .filter((r) => !r.deleted)
    .reverse()
    .slice(0, limit);
}

export async function clearRecent(now = Date.now()): Promise<void> {
  const all = await (await getDb()).getAll("recentTopics");
  for (const r of all) {
    if (!r.deleted) await putRecord("recentTopics", { ...r, deleted: true, updatedAt: now });
  }
}
