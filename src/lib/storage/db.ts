import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Lesson } from "@/lib/schema";

/*
 * The local database (IndexedDB) — the main copy of a student's data (SPEC §9.3).
 * Every record carries id, updatedAt and a deleted flag (a "tombstone") so that V2 can
 * sync it to the cloud without changing this shape.
 */

export type SyncFields = {
  id: string;
  /** Milliseconds since 1970; the newest write wins when syncing. */
  updatedAt: number;
  /** Deleted records are kept as tombstones so the deletion can sync too. */
  deleted: boolean;
};

export type SavedLesson = SyncFields & { lesson: Lesson; savedAt: number };

export type RecentTopic = SyncFields & {
  subject: string;
  chapter: string;
  topic: string;
  level: string;
  duration: number;
  title: string;
  chapterName: string;
  viewedAt: number;
};

interface PrismDB extends DBSchema {
  savedLessons: { key: string; value: SavedLesson; indexes: { bySavedAt: number } };
  recentTopics: { key: string; value: RecentTopic; indexes: { byViewedAt: number } };
}

const DB_NAME = "prism";
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<PrismDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<PrismDB>> {
  dbPromise ??= openDB<PrismDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("savedLessons", { keyPath: "id" }).createIndex("bySavedAt", "savedAt");
      db.createObjectStore("recentTopics", { keyPath: "id" }).createIndex("byViewedAt", "viewedAt");
    },
  });
  return dbPromise;
}

/** For tests: forget the open connection so the next call opens a fresh database. */
export function resetDbForTests() {
  dbPromise = null;
}
