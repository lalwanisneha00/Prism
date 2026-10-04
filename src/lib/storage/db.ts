import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Lesson } from "@/lib/schema";
import type { ExtractedSection, FileFormat } from "@/lib/extract/types";
import type { MaterialKind } from "@/lib/notes/kinds";

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

/** A finished mock test (V2.5 · Step 5): the score per topic, synced like quiz attempts. */
export type MockResult = SyncFields & {
  subject: string;
  chapter: string;
  level: string;
  minutes: number;
  title: string;
  score: number;
  total: number;
  /** Marks per topic id, so weak topics can be spotted. */
  byTopic: { topic: string; score: number; total: number }[];
  at: number;
};

/** A subject the student set up themselves ("Other subjects", V3 · Step 4). Synced. */
export type CustomSubjectRecord = SyncFields & {
  name: string;
  teaching: "theory" | "skill";
  chapters: {
    id: string;
    name: string;
    hours?: number;
    topics: { id: string; name: string }[];
  }[];
  details: {
    examDate?: string;
    marksPattern?: string;
    examStyle?: "theory" | "mcq" | "mixed";
    examKind?: "internal" | "end-sem";
    nextExam?: string[];
    semester?: number;
    language?: string;
  };
  /** Where the outline came from: typed, read from a syllabus, or built from their material. */
  outlineFrom: "typed" | "syllabus" | "material";
  createdAt: number;
};

/** Where the student stopped in an audio lesson, in seconds at normal speed. */
export type AudioPosition = SyncFields & { title: string; seconds: number };

export type AppSettings = SyncFields & {
  theme?: "light" | "dark";
  audioRate?: number;
  /** "My branch and semester" (V3 · Step 3): the student's subjects are shown first. */
  branch?: string;
  semester?: number;
};

/**
 * An uploaded file's extracted text, split into passages. Local only: the file's contents
 * never leave this device (SPEC: V2 · Step 4, V2.5 · Step 1). Only a short summary syncs.
 */
export type StoredNote = {
  id: string;
  name: string;
  size: number;
  /** Number of sections (pages, slides, headings' parts, sheets). */
  pages: number;
  addedAt: number;
  chunks: { id: string; page: number; where?: string; text: string }[];
  /** Missing on notes from before V2.5, which were all PDFs. */
  format?: FileFormat;
  /** The file as read, section by section, for the preview. */
  sections?: ExtractedSection[];
  warnings?: string[];
  /** Notes, slides, previous-year paper… (V2.5 · Step 2; older notes have none). */
  kind?: MaterialKind;
  /** The subject (and optionally chapter) it belongs to; missing means "any subject". */
  subject?: string;
  chapter?: string;
  /** Section indexes the student removed in the preview: not used in lessons. */
  excluded?: number[];
};

/** The original uploaded file, kept on this device so pictures can be read (OCR) later. */
export type NoteFile = { id: string; bytes: ArrayBuffer; mime: string };

/**
 * A whole-chapter (or several-topic) lesson as it is built, topic by topic (V2.5 · Step 4).
 * Local only: closing the tab keeps what is done, and the rest continues next time.
 */
export type ChapterLessonRecord = {
  id: string;
  subject: string;
  chapter: string;
  level: string;
  minutes: number;
  /** Topics in lesson order with their minutes (skipped topics left out). */
  order: { id: string; minutes: number }[];
  notes: boolean;
  parts?: unknown;
  /** Finished topic lessons by topic id. */
  lessons: Record<string, { lesson: Lesson; libraryKey?: string }>;
  /** Where the student was reading, and the topics they finished (V2.5 · Step 5). */
  position?: string;
  done?: string[];
  createdAt: number;
  updatedAt: number;
};

/** What syncs about an uploaded note: its name and a short summary, never the text. */
export type NoteSummary = SyncFields & {
  name: string;
  pages: number;
  summary: string;
  kind?: MaterialKind;
  subject?: string;
  chapter?: string;
};

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

/** A backlog study plan for one subject (V2 · Step 13). */
export type StudyPlan = SyncFields & {
  subject: string;
  level: string;
  lessonMinutes: number;
  minutesPerDay: number;
  startDate: string;
  examDate?: string;
  days: {
    date: string;
    items: {
      id: string;
      kind: "learn" | "revise" | "flashcards";
      topicId?: string;
      minutes: number;
      done: boolean;
      doneAt?: number;
    }[];
  }[];
  /** Topics that didn't fit in the plan. */
  overflow: string[];
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
  plans: StudyPlan;
  mockResults: MockResult;
  customSubjects: CustomSubjectRecord;
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
  "plans",
  "mockResults",
  "customSubjects",
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
  noteFiles: { key: string; value: NoteFile };
  chapterLessons: { key: string; value: ChapterLessonRecord };
  flashcards: { key: string; value: Flashcard };
  annotations: { key: string; value: Annotation; indexes: { byLesson: string } };
  plans: { key: string; value: StudyPlan };
  mockResults: { key: string; value: MockResult; indexes: { byAt: number } };
  customSubjects: { key: string; value: CustomSubjectRecord };
  outbox: { key: string; value: OutboxEntry };
  meta: { key: string; value: { key: string; value: unknown } };
}

const DB_NAME = "prism";
const DB_VERSION = 10;
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
      // Version 6 (backlog planner): one plan per subject, synced.
      if (oldVersion < 6) {
        db.createObjectStore("plans", { keyPath: "id" });
      }
      // Version 7 (uploads in any format): original files, local only. Nothing else changes.
      if (oldVersion < 7) {
        db.createObjectStore("noteFiles", { keyPath: "id" });
      }
      // Version 8 (whole-chapter lessons): built chapter lessons, local only.
      if (oldVersion < 8) {
        db.createObjectStore("chapterLessons", { keyPath: "id" });
      }
      // Version 9 (mock tests): results, synced like quiz attempts.
      if (oldVersion < 9) {
        db.createObjectStore("mockResults", { keyPath: "id" }).createIndex("byAt", "at");
      }
      // Version 10 (other subjects): the student's own subjects, synced.
      if (oldVersion < 10) {
        db.createObjectStore("customSubjects", { keyPath: "id" });
      }
    },
  });
  return dbPromise;
}

/** For tests: forget the open connection so the next call opens a fresh database. */
export function resetDbForTests() {
  dbPromise = null;
}
