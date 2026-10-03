import { findLevel, type Level } from "@/data/levels";
import { findChapter, findSubject, type Chapter, type Subject, type Topic } from "@/lib/subjects";

/*
 * A whole-chapter (or several-topic) lesson request, as it travels in the URL (V2.5 · Step 3):
 * /chapter?subject=em&chapter=electrostatics&topics=a,b&level=…&minutes=45&plan=a:20,b:25
 * Like the single-topic request, everything is checked against the data files first.
 */

export type ChapterRequest = {
  subject: Subject;
  chapter: Chapter;
  /** The chosen topics in chapter order (all of them for "whole chapter"). */
  topics: Topic[];
  /** True when the student picked the whole chapter. */
  whole: boolean;
  level: Level;
  minutes: number;
  /** The student's adjusted plan (topic id → minutes; 0 = skipped), when they changed it. */
  plan?: Record<string, number>;
  notes: boolean;
};

export type RawChapterRequest = Partial<
  Record<
    "subject" | "chapter" | "topics" | "level" | "minutes" | "plan" | "notes",
    string | string[] | undefined
  >
>;

export const MIN_CHAPTER_MINUTES = 5;
export const MAX_CHAPTER_MINUTES = 240;

function first(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return (v ?? "").trim();
}

export type ChapterValidation =
  { ok: true; request: ChapterRequest } | { ok: false; errors: string[] };

export function validateChapterRequest(raw: RawChapterRequest): ChapterValidation {
  const errors: string[] = [];
  const subject = findSubject(first(raw.subject));
  if (!subject) errors.push("That subject isn't available.");
  const chapter = subject ? findChapter(subject, first(raw.chapter)) : undefined;
  if (subject && !chapter) errors.push("Choose a chapter of this subject.");

  const ids = first(raw.topics)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const whole = ids.length === 0;
  const topics = chapter
    ? whole
      ? chapter.topics
      : chapter.topics.filter((t) => ids.includes(t.id))
    : [];
  if (chapter && !whole && topics.length !== new Set(ids).size) {
    errors.push("Some of those topics aren't in this chapter.");
  }
  if (chapter && topics.length === 0) errors.push("Choose at least one topic.");

  const level = findLevel(first(raw.level));
  if (!level || !level.available) errors.push("Choose a level.");

  const minutes = Number(first(raw.minutes));
  if (
    !Number.isInteger(minutes) ||
    minutes < MIN_CHAPTER_MINUTES ||
    minutes > MAX_CHAPTER_MINUTES
  ) {
    errors.push("Choose one of the time options.");
  }

  const plan = parsePlan(first(raw.plan), topics);
  if (errors.length > 0 || !subject || !chapter || !level) return { ok: false, errors };
  return {
    ok: true,
    request: {
      subject,
      chapter,
      topics,
      whole,
      level,
      minutes,
      ...(plan ? { plan } : {}),
      notes: first(raw.notes) === "1",
    },
  };
}

/** "a:20,b:0" → { a: 20, b: 0 }; anything malformed or unknown is ignored. */
export function parsePlan(
  text: string,
  topics: readonly Topic[],
): Record<string, number> | undefined {
  if (!text) return undefined;
  const known = new Set(topics.map((t) => t.id));
  const plan: Record<string, number> = {};
  for (const part of text.split(",")) {
    const [id, m] = part.split(":");
    const minutes = Number(m);
    if (
      known.has(id) &&
      Number.isInteger(minutes) &&
      minutes >= 0 &&
      minutes <= MAX_CHAPTER_MINUTES
    ) {
      plan[id] = minutes;
    }
  }
  return Object.keys(plan).length > 0 ? plan : undefined;
}

export function chapterHref(
  path: "/chapter" | "/chapter/lesson",
  r: {
    subject: string;
    chapter: string;
    topics?: readonly string[];
    level: string;
    minutes: number;
    plan?: Record<string, number>;
    notes?: boolean;
  },
): string {
  const params = new URLSearchParams({ subject: r.subject, chapter: r.chapter });
  if (r.topics && r.topics.length > 0) params.set("topics", r.topics.join(","));
  params.set("level", r.level);
  params.set("minutes", String(r.minutes));
  if (r.plan) {
    params.set(
      "plan",
      Object.entries(r.plan)
        .map(([id, m]) => `${id}:${m}`)
        .join(","),
    );
  }
  if (r.notes) params.set("notes", "1");
  return `${path}?${params}`;
}
