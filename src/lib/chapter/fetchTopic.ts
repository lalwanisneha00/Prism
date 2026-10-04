import { ChapterPartsSchema, type ChapterParts } from "@/lib/chapter/parts";
import type { CustomSubjectPayload } from "@/lib/custom/customSubject";
import type { LessonErrorKind, LessonEvent } from "@/lib/lessonEvents";
import type { NotePassage } from "@/lib/notes/notesSources";
import { readLessonStream } from "@/lib/readLessonStream";
import type { Lesson } from "@/lib/schema";

/*
 * Browser helpers for building a chapter lesson (V2.5 · Step 4): the glue (intro, bridges,
 * wrap-up) and one topic lesson at a time from the same /api/lesson stream the single-topic
 * page uses, so every topic keeps its grounding, fact-check and library reuse.
 */

export type TopicResult =
  { ok: true; lesson: Lesson; libraryKey?: string } | { ok: false; kind: LessonErrorKind };

export async function fetchTopicLesson(
  body: {
    subject: string;
    chapter: string;
    topic: string;
    level: string;
    duration: number;
    notes?: NotePassage[];
    custom?: CustomSubjectPayload;
  },
  onStage: (message: string) => void,
  signal: AbortSignal,
): Promise<TopicResult> {
  if (!navigator.onLine) return { ok: false, kind: "offline" };
  let result: TopicResult | null = null;
  const handle = (event: LessonEvent) => {
    if (event.type === "stage") onStage(event.message);
    else if (event.type === "lesson") {
      result = { ok: true, lesson: event.lesson, libraryKey: event.libraryKey };
    } else if (event.type === "error") result = { ok: false, kind: event.kind };
  };
  try {
    const res = await fetch("/api/lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...body,
        duration: String(body.duration),
        ...(body.notes?.length ? { notes: body.notes } : {}),
      }),
      signal,
    });
    if (!res.ok || !res.body) {
      const event = (await res.json().catch(() => null)) as LessonEvent | null;
      return { ok: false, kind: event?.type === "error" ? event.kind : "unavailable" };
    }
    await readLessonStream(res.body, handle);
    return result ?? { ok: false, kind: "unavailable" };
  } catch {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    return { ok: false, kind: navigator.onLine ? "unavailable" : "offline" };
  }
}

export type PartsResult = { ok: true; parts: ChapterParts } | { ok: false; kind: LessonErrorKind };

export async function fetchChapterParts(
  body: {
    subject: string;
    chapter: string;
    level: string;
    minutes: number;
    order: { id: string; minutes: number }[];
    custom?: CustomSubjectPayload;
  },
  signal: AbortSignal,
): Promise<PartsResult> {
  try {
    const res = await fetch("/api/chapter-parts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const data: unknown = await res.json().catch(() => null);
    if (data && typeof data === "object" && "ok" in data && data.ok && "parts" in data) {
      const parts = ChapterPartsSchema.safeParse(data.parts);
      if (parts.success) return { ok: true, parts: parts.data };
    }
    const kind =
      data && typeof data === "object" && "kind" in data && typeof data.kind === "string"
        ? data.kind
        : "unavailable";
    return { ok: false, kind: kind === "rate-limit" ? "rate-limit" : "unavailable" };
  } catch {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    return { ok: false, kind: navigator.onLine ? "unavailable" : "offline" };
  }
}
