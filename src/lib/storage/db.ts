import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Lesson } from "@/lib/schema";

/*
 * The local database (IndexedDB): the main copy of a student's data (SPEC §9.3).
 * The app reads and writes only this copy, so it is fast and works offline. When the
 * student is signed in, the sync engine copies changes to Firestore in the background.
 */

export type SyncFields = {
  id: string;
  /** Milliseconds since 1970; the newest write wins when syncing. */
  updatedAt: number;
  /** Deleted records are kept as tombstones so the deletion can sync too. */
  deleted: boolean;
};

export type SavedLesson = SyncFields & {
  lesson: Lesson;
  savedAt: number;
  /** Set when the lesson is in the shared library: then only this key syncs, not the lesson. */
  libraryKey?: string;
};

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

export type QuizAttempt = SyncFields & {
  lessonId: string;
  subject: string;
  chapter: string;
  topic: string;
  level: string;
  duration: number;
  title: string;
  score: number;
  total: number;
  at: number;
};

/** Where the student stopped in an audio lesson, in seconds at normal speed. */
export type AudioPosition = SyncFields & { title: string; seconds: number };

export type AppSettings = SyncFields & {
  theme?: "light" | "dark";
  audioRate?: number;
};

/** Every collection that syncs to users/{uid}/{collection}/{id}. */
export type SyncedRecords = {
  savedLessons: SavedLesson;
  recentTopics: RecentTopic;
  quizAttempts: QuizAttempt;
  audioPositions: AudioPosition;
  settings: AppSettings;
};
export type SyncedCollection = keyof SyncedRecords;
export const SYNCED_COLLECTIONS: SyncedCollection[] = [
  "savedLessons",
  "recentTopics",
  "quizAttempts",
  "audioPositions",
  "settings",
];

/** A local change waiting to be sent to the cloud. */
export type OutboxEntry = {
  key: string;
  collection: SyncedCollection;
  id: string;
  queuedAt: number;
};

interface PrismDB extends DBSchema {
  savedLessons: { key: string; value: SavedLesson; indexes: { bySavedAt: number } };
  recentTopics: { key: string; value: RecentTopic; indexes: { byViewedAt: number } };
  quizAttempts: { key: string; value: QuizAttempt; indexes: { byAt: number } };
  audioPositions: { key: string; value: AudioPosition };
  settings: { key: string; value: AppSettings };
  outbox: { key: string; value: OutboxEntry };
  meta: { key: string; value: { key: string; value: unknown } };
}

const DB_NAME = "prism";
const DB_VERSION = 2;
let dbPromise: Promise<IDBPDatabase<PrismDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<PrismDB>> {
  dbPromise ??= openDB<PrismDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Version 1 (V1 of the app): saved lessons and recent topics.
      if (oldVersion < 1) {
        db.createObjectStore("savedLessons", { keyPath: "id" }).createIndex("bySavedAt", "savedAt");
        db.createObjectStore("recentTopics", { keyPath: "id" }).createIndex(
          "byViewedAt",
          "viewedAt",
        );
      }
      // Version 2 (accounts and sync): existing data is kept as it is.
      if (oldVersion < 2) {
        db.createObjectStore("quizAttempts", { keyPath: "id" }).createIndex("byAt", "at");
        db.createObjectStore("audioPositions", { keyPath: "id" });
        db.createObjectStore("settings", { keyPath: "id" });
        db.createObjectStore("outbox", { keyPath: "key" });
        db.createObjectStore("meta", { keyPath: "key" });
      }
    },
  });
  return dbPromise;
}

/** For tests: forget the open connection so the next call opens a fresh database. */
export function resetDbForTests() {
  dbPromise = null;
}
