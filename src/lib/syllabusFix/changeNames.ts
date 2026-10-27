import { findSubject } from "@/lib/subjects";
import type { LiveChange } from "@/lib/syllabusFix/overlay";
import { plainChange, type ChangeNames } from "@/lib/syllabusFix/voting";

/*
 * The course, chapter and topic names a change is about, looked up in the syllabus, so prompts
 * and the admin page can say "Introduction to AI is taught in semester 3" instead of ids.
 */

export function namesOf(change: LiveChange): ChangeNames {
  const subject = findSubject(change.prism?.subject ?? change.to?.subject ?? "");
  const chapter = subject?.chapters.find((c) => c.id === change.prism?.chapter);
  const topic = chapter?.topics.find((t) => t.id === change.prism?.topic);
  const to = subject?.chapters.find((c) => c.id === (change.to?.chapter ?? change.prism?.chapter));
  return {
    ...(subject ? { course: subject.name } : {}),
    ...(chapter ? { chapter: chapter.name } : to ? { chapter: to.name } : {}),
    ...(topic ? { topic: topic.name } : {}),
    ...(to ? { toChapter: to.name } : {}),
  };
}

/** One change as a plain sentence. */
export const describeChange = (change: LiveChange) => plainChange(change, namesOf(change));
