import { gunzipJson, gzipJson } from "@/lib/compress";
import { parseLesson, type Lesson } from "@/lib/schema";

/*
 * The shared lesson library (SPEC §9.4): each fact-checked lesson is stored once in
 * lessons/{subject_topic_level_duration}, compressed. Only the server writes it.
 */

/** Firestore keeps documents under 1 MiB; stay well clear of it. */
export const MAX_LESSON_BYTES = 900_000;

export function libraryKey(
  meta: Pick<Lesson["meta"], "subject" | "topic" | "level" | "durationMin">,
) {
  return `${meta.subject}_${meta.topic}_${meta.level}_${meta.durationMin}`;
}

export type LibraryDoc = {
  lessonGz: Uint8Array;
  subject: string;
  topic: string;
  level: string;
  durationMin: number;
  title: string;
  createdAt: string;
  schemaVersion: number;
};

/** The storage the library needs: one get and one set by key (Firestore in the app, a Map in tests). */
export type LibraryStore = {
  get(key: string): Promise<Pick<LibraryDoc, "lessonGz"> | null>;
  set(key: string, doc: LibraryDoc): Promise<void>;
};

/** Reads and writes made by this server since it started, for the usage page. */
export const libraryUsage = { reads: 0, writes: 0, since: new Date().toISOString() };

/** A lesson from the library, or null if there is none (or it no longer passes the schema). */
export async function readFromLibrary(store: LibraryStore, key: string): Promise<Lesson | null> {
  libraryUsage.reads++;
  const doc = await store.get(key);
  if (!doc?.lessonGz) return null;
  const parsed = parseLesson(await gunzipJson(doc.lessonGz));
  return parsed.ok ? parsed.lesson : null;
}

/** Stores a lesson in the library. Returns false if it is too big to store. */
export async function writeToLibrary(store: LibraryStore, lesson: Lesson): Promise<boolean> {
  const lessonGz = await gzipJson(lesson);
  if (lessonGz.byteLength > MAX_LESSON_BYTES) return false;
  const { subject, topic, level, durationMin, title } = lesson.meta;
  await store.set(libraryKey(lesson.meta), {
    lessonGz,
    subject,
    topic,
    level,
    durationMin,
    title,
    createdAt: new Date().toISOString(),
    schemaVersion: 1,
  });
  libraryUsage.writes++;
  return true;
}
