import { getSettings } from "@/lib/storage/progress";
import { chaptersOf, type Subject } from "@/lib/subjects";
import { emphasisFor } from "@/lib/syllabus/coverage";
import type { Emphasis } from "@/lib/syllabus/emphasis";

/** The student's course outcomes for a topic (browser only; null when no syllabus covers it). */
export async function emphasisForRequest(
  subject: Subject,
  chapterId: string,
  topicId: string,
): Promise<Emphasis | null> {
  try {
    const syllabus = (await getSettings())?.syllabus;
    if (!syllabus) return null;
    // A linked chapter belongs to the subject that owns it.
    const owner =
      chaptersOf(subject).find((o) => o.chapter.id === chapterId)?.owner.id ?? subject.id;
    const found = emphasisFor(syllabus, subject.id, `${owner}/${topicId}`);
    return found ? { subjectName: found.subjectName, outcomes: found.outcomes } : null;
  } catch {
    return null;
  }
}
