import { applyHighlight, type TextAnchor } from "@/lib/annotations/anchor";
import type { Lesson } from "@/lib/schema";
import type { Annotation, HighlightColor } from "@/lib/storage/db";
import { getDb } from "@/lib/storage/db";
import { lessonId } from "@/lib/storage/library";
import { getAllRecords, putRecord } from "@/lib/storage/records";

/*
 * Highlights and comments (SPEC §8.1), saved through the normal storage layer: on this
 * device first, then synced to users/{uid}/annotations when the student is signed in.
 */

export const MAX_COMMENT = 1000;

export const highlightColors: { color: HighlightColor; label: string }[] = [
  { color: "important", label: "Important" },
  { color: "confused", label: "Didn't understand" },
  { color: "formula", label: "Formula / definition" },
  { color: "exam", label: "Exam-likely" },
];

const newId = () => `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** The lesson details every annotation carries, so My Notes can list and link it. */
export function lessonFields(lesson: Lesson) {
  const m = lesson.meta;
  return {
    lessonId: lessonId(m),
    lessonVersion: m.createdAt,
    subject: m.subject,
    chapter: m.chapter,
    topic: m.topic,
    level: m.level,
    duration: m.durationMin,
    title: m.title,
    ...(m.fromNotes ? { fromNotes: true } : {}),
  };
}

export async function listForLesson(id: string): Promise<Annotation[]> {
  const all = await (await getDb()).getAllFromIndex("annotations", "byLesson", id);
  return all.filter((a) => !a.deleted);
}

export async function listAllAnnotations(): Promise<Annotation[]> {
  return (await getAllRecords("annotations")).filter((a) => !a.deleted);
}

export async function saveAnnotation(a: Annotation, now = Date.now()): Promise<Annotation> {
  const next = { ...a, comment: a.comment.slice(0, MAX_COMMENT), updatedAt: now };
  await putRecord("annotations", next);
  return next;
}

export async function removeAnnotation(a: Annotation, now = Date.now()): Promise<void> {
  await putRecord("annotations", { ...a, deleted: true, updatedAt: now });
}

/**
 * Adds a highlight to a block's text. Same-colour overlaps merge (their comments are kept);
 * a different colour takes over the overlap and the older highlight is trimmed or split.
 * Returns the new (or merged) highlight.
 */
export async function addHighlight(
  lesson: Lesson,
  target: { block: string; sectionId?: string; text: string; anchor: TextAnchor },
  color: HighlightColor,
  existing: Annotation[],
  now = Date.now(),
): Promise<Annotation> {
  const inBlock = existing.filter(
    (a) => a.block === target.block && a.anchor && a.color && !a.deleted,
  );
  const spans = inBlock.map((a) => ({
    id: a.id,
    start: a.anchor!.start,
    end: a.anchor!.end,
    color: a.color!,
  }));
  const change = applyHighlight(
    spans,
    { start: target.anchor.start, end: target.anchor.end, color },
    newId,
  );
  const byId = new Map(inBlock.map((a) => [a.id, a]));
  const anchorFor = (start: number, end: number) => {
    const quote = target.text.slice(start, end);
    return {
      start,
      end,
      quote,
      prefix: target.text.slice(Math.max(0, start - 32), start),
      suffix: target.text.slice(end, end + 32),
    };
  };

  // Comments of highlights that are merged away are kept on the new one.
  const carried = change.remove
    .map((id) => byId.get(id)!)
    .filter((a) => a.color === color && a.comment.trim())
    .map((a) => a.comment.trim());

  for (const s of change.update) {
    await saveAnnotation({ ...byId.get(s.id)!, anchor: anchorFor(s.start, s.end) }, now);
  }
  for (const s of change.create) {
    const source = inBlock.find((a) => a.color === s.color)!;
    await saveAnnotation(
      { ...source, id: s.id, anchor: anchorFor(s.start, s.end), comment: "", createdAt: now },
      now,
    );
  }
  for (const id of change.remove) {
    const old = byId.get(id)!;
    // A swallowed highlight of another colour keeps its comment as its own note on the block.
    if (old.color !== color && old.comment.trim()) {
      await saveAnnotation({ ...old, color: undefined, anchor: undefined }, now);
    } else {
      await removeAnnotation(old, now);
    }
  }

  const added: Annotation = {
    id: newId(),
    ...lessonFields(lesson),
    block: target.block,
    sectionId: target.sectionId,
    color,
    anchor: anchorFor(change.added.start, change.added.end),
    comment: carried.join("\n\n").slice(0, MAX_COMMENT),
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
  return saveAnnotation(added, now);
}

/** A comment on a whole block (formula, chart, worked example, quiz question). */
export async function addBlockNote(
  lesson: Lesson,
  block: string,
  sectionId: string | undefined,
  comment: string,
  now = Date.now(),
): Promise<Annotation> {
  return saveAnnotation(
    {
      id: newId(),
      ...lessonFields(lesson),
      block,
      sectionId,
      comment,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    },
    now,
  );
}

/** Topics where the student marked something "Didn't understand", for the weak-topics list. */
export function confusedTopics(
  all: Annotation[],
): { topic: string; title: string; count: number; latest: Annotation }[] {
  const map = new Map<
    string,
    { topic: string; title: string; count: number; latest: Annotation }
  >();
  for (const a of all) {
    if (a.deleted || a.color !== "confused") continue;
    const entry = map.get(a.topic) ?? { topic: a.topic, title: a.title, count: 0, latest: a };
    entry.count++;
    if (a.updatedAt > entry.latest.updatedAt) entry.latest = a;
    map.set(a.topic, entry);
  }
  return [...map.values()].sort((x, y) => y.count - x.count);
}

/** A link that opens the lesson an annotation belongs to and scrolls to it. */
export function annotationHref(a: Annotation): string {
  const params = new URLSearchParams({
    subject: a.subject,
    chapter: a.chapter,
    topic: a.topic,
    level: a.level,
    duration: String(a.duration),
  });
  if (a.fromNotes) params.set("notes", "1");
  return `/lesson?${params}#anno-${a.id}`;
}
