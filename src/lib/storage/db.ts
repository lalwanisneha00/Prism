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

/**
 * An uploaded PDF's extracted text, split into passages. Local only: the file's contents
 * never leave this device (SPEC: V2 · Step 4). Only a short summary syncs.
 */
export type StoredNote = {
  id: string;
  name: string;
  size: number;
  pages: number;
  addedAt: number;
  chunks: { id: string; page: number; text: string }[];
};

/** What syncs about an uploaded note: its name and a short summary, never the text. */
export type NoteSummary = SyncFields & { name: string; pages: number; summary: string };

/** A flashcard with its spaced-repetition state (V2 · Step 11). */
export type Flashcard = SyncFields & {
  /** Markdown with KaTeX. */
  front: string;
  back: string;
  subject: string;
  chapter: string;
  topic: string;
  /** What made it: a lesson's glossary/quiz/mistakes, a text selection, or the student. */
  origin: "glossary" | "quiz" | "misconception" | "selection" | "manual" | "highlight";
  createdAt: number;
  srs: {
    due: number;
    interval: number;
    ease: number;
    reps: number;
    lapses: number;
    lastReviewed?: number;
  };
};

export type HighlightColor = "important" | "confused" | "formula" | "exam";

/**
 * A student's highlight and/or comment on a lesson (V2 · Step 12). Stored apart from the
 * lesson (lessons can be shared and read-only), so it survives the lesson being rewritten.
 */
export type Annotation = SyncFields & {
  lessonId: string;
  /** The lesson's createdAt when annotated: tells us if it was rewritten since. */
  lessonVersion: string;
  subject: string;
  chapter: string;
  topic: string;
  level: string;
  duration: number;
  title: string;
  fromNotes?: boolean;
  /** Which part of the lesson: "section:<id>", "example:<n>", "quiz:<n>", "visual:<id>", … */
  block: string;
  /** The section it belongs to, for listing unanchored notes in the right place. */
  sectionId?: string;
  /** Missing for a comment on a whole block (a formula, a chart, a quiz question). */
  color?: HighlightColor;
  anchor?: { start: number; end: number; quote: string; prefix: string; suffix: string };
  /** Plain text, up to about 1,000 characters. */
  comment: string;
  createdAt: number;
};

/** Every collection that syncs to users/{uid}/{collection}/{id}. */
export type SyncedRecords = {
  savedLessons: SavedLesson;
  recentTopics: RecentTopic;
  quizAttempts: QuizAttempt;
  audioPositions: AudioPosition;
  settings: AppSettings;
  noteSummaries: NoteSummary;
  flashcards: Flashcard;
  annotations: Annotation;
};
export type SyncedCollection = keyof SyncedRecords;
export const SYNCED_COLLECTIONS: SyncedCollection[] = [
  "savedLessons",
  "recentTopics",
  "quizAttempts",
  "audioPositions",
  "settings",
  "noteSummaries",
  "flashcards",
  "annotations",
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
  noteSummaries: { key: string; value: NoteSummary };
  notes: { key: string; value: StoredNote };
  flashcards: { key: string; value: Flashcard };
  annotations: { key: string; value: Annotation; indexes: { byLesson: string } };
  outbox: { key: string; value: OutboxEntry };
  meta: { key: string; value: { key: string; value: unknown } };
}

const DB_NAME = "prism";
const DB_VERSION = 5;
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
      // Version 3 (uploaded notes): the text stays local; summaries sync.
      if (oldVersion < 3) {
        db.createObjectStore("notes", { keyPath: "id" });
        db.createObjectStore("noteSummaries", { keyPath: "id" });
      }
      // Version 4 (flashcards): synced like the rest.
      if (oldVersion < 4) {
        db.createObjectStore("flashcards", { keyPath: "id" });
      }
      // Version 5 (highlights and comments): synced, indexed by lesson.
      if (oldVersion < 5) {
        db.createObjectStore("annotations", { keyPath: "id" }).createIndex("byLesson", "lessonId");
      }
    },
  });
  return dbPromise;
}

/** For tests: forget the open connection so the next call opens a fresh database. */
export function resetDbForTests() {
  dbPromise = null;
}
