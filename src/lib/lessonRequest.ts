import { durations, isDuration, type DurationMinutes } from "@/data/durations";
import { findLevel, type Level } from "@/data/levels";
import {
  findChapter,
  findSubject,
  findTopic,
  type Chapter,
  type Subject,
  type Topic,
} from "@/lib/subjects";

/** What the student picked, as plain strings (form state or URL search params). */
export type RawLessonRequest = Partial<
  Record<"subject" | "chapter" | "topic" | "level" | "duration", string | string[] | undefined>
>;

/** A request that has been checked against the data files. */
export type LessonRequest = {
  subject: Subject;
  chapter: Chapter;
  topic: Topic;
  level: Level;
  duration: DurationMinutes;
};

export type LessonRequestField = keyof RawLessonRequest;
export type LessonRequestErrors = Partial<Record<LessonRequestField, string>>;

export type ValidationResult =
  { ok: true; request: LessonRequest } | { ok: false; errors: LessonRequestErrors };

function first(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return (v ?? "").trim();
}

const durationList = durations.map((d) => d.minutes).join(", ");

/**
 * Checks a request against the data files. `extra` adds subjects that aren't built in (a
 * student's own subject, V3 · Step 4), checked the same way.
 */
export function validateLessonRequest(
  raw: RawLessonRequest,
  extra: readonly Subject[] = [],
): ValidationResult {
  const errors: LessonRequestErrors = {};

  const subjectId = first(raw.subject);
  const subject = extra.find((s) => s.id === subjectId) ?? findSubject(subjectId);
  if (!subject) errors.subject = "That subject isn't available yet.";

  const chapterId = first(raw.chapter);
  const chapter = subject && chapterId ? findChapter(subject, chapterId) : undefined;
  if (!chapterId) errors.chapter = "Choose a chapter.";
  else if (subject && !chapter) errors.chapter = "That chapter isn't part of this subject.";

  const topicId = first(raw.topic);
  const topic = chapter && topicId ? findTopic(chapter, topicId) : undefined;
  if (!topicId) errors.topic = "Choose a topic.";
  else if (chapter && !topic) errors.topic = "That topic isn't in the chosen chapter.";

  const levelSlug = first(raw.level);
  const level = findLevel(levelSlug);
  if (!levelSlug) errors.level = "Choose how well you know this topic.";
  else if (!level || !level.available) errors.level = "That level isn't available yet.";

  const durationText = first(raw.duration);
  const minutes = Number(durationText);
  if (!durationText) errors.duration = "Choose how much time you have.";
  else if (!isDuration(minutes)) errors.duration = `Choose one of: ${durationList} minutes.`;

  if (subject && chapter && topic && level?.available && isDuration(minutes)) {
    return { ok: true, request: { subject, chapter, topic, level, duration: minutes } };
  }
  return { ok: false, errors };
}

/** The /lesson URL for a valid request, so a lesson link can be bookmarked or shared. */
export function lessonHref(request: LessonRequest, options: { notes?: boolean } = {}): string {
  const params = new URLSearchParams({
    subject: request.subject.id,
    chapter: request.chapter.id,
    topic: request.topic.id,
    level: request.level.slug,
    duration: String(request.duration),
  });
  if (options.notes) params.set("notes", "1");
  return `/lesson?${params.toString()}`;
}
