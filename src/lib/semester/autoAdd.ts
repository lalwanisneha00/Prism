import type { Subject } from "@/lib/subjects";
import type { ReviewEntry } from "@/lib/university/apply";
import { matchSubject } from "@/lib/university/match";
import type { UniSyllabus } from "@/lib/university/parse";

/*
 * "Upload my semester syllabus" (Subjects page): turns a whole semester's syllabus into the
 * subjects for that semester without a review wall. Each subject goes to Prism's own subject
 * when the names clearly match, otherwise it becomes a subject of the student's own, built from
 * the syllabus's units. The student can still review or change everything afterwards.
 */

export type AutoPlan = {
  entries: ReviewEntry[];
  /** The semester the subjects were placed in (the one chosen, or the one found in the file). */
  semester?: number;
  /** Subjects left out because the file also covers other semesters. */
  otherSemesters: number;
};

/** `target` is the semester the student chose; undefined = use what the file says. */
export function planSemesterUpload(
  syllabus: UniSyllabus,
  catalogue: readonly Subject[],
  target?: number,
): AutoPlan {
  const found = [...new Set(syllabus.subjects.map((s) => s.semester).filter(Boolean))] as number[];
  let otherSemesters = 0;
  const entries: ReviewEntry[] = [];
  for (const uni of syllabus.subjects) {
    // A file for several semesters: keep only the chosen semester's subjects.
    if (target && uni.semester && found.length > 1 && uni.semester !== target) {
      otherSemesters++;
      continue;
    }
    const semester = target ?? uni.semester;
    const match = matchSubject(uni, catalogue);
    entries.push({
      uni,
      semester,
      choice: match.best ? { kind: "built-in", subjectId: match.best.subject.id } : { kind: "own" },
    });
  }
  const semesters = [...new Set(entries.map((e) => e.semester).filter(Boolean))] as number[];
  return {
    entries,
    semester: target ?? (semesters.length === 1 ? semesters[0] : undefined),
    otherSemesters,
  };
}
