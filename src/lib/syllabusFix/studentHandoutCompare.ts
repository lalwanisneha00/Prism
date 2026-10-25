import { activeChapters } from "@/lib/syllabusFix/active";
import {
  compareUnits,
  type Change,
  type HandoutCourse,
  type MatchResult,
  type PrismCourse,
} from "@/lib/syllabusFix/handoutMatch";
import type { StudentHandout } from "@/lib/syllabusFix/studentHandout";

/*
 * Compare a student's handout with the Prism course it was uploaded on (syllabus fix, Phase 3).
 * The same unit/topic comparison as the Phase 2 import, for one course. Pure: the route saves the
 * result as proposals; nothing in the syllabus changes here.
 */

type SubjectLike = {
  id: string;
  name: string;
  code?: string;
  courseCategory?: string;
  offerings?: readonly { branch: string; semester: number; code?: string; kind?: string }[];
  chapters: readonly {
    id: string;
    name: string;
    status?: "active" | "retired";
    topics: readonly { id: string; name: string; status?: "active" | "retired" }[];
  }[];
};

/** A subject in the matcher's shape, retired chapters and topics left out. */
export function toPrismCourse(s: SubjectLike): PrismCourse {
  return {
    id: s.id,
    name: s.name,
    ...(s.code ? { code: s.code } : {}),
    ...(s.courseCategory ? { courseCategory: s.courseCategory } : {}),
    offerings: (s.offerings ?? []).map((o) => ({
      branch: o.branch,
      semester: o.semester,
      ...(o.code ? { code: o.code } : {}),
      ...(o.kind ? { kind: o.kind } : {}),
    })),
    chapters: activeChapters(s).map((c) => ({
      id: c.id,
      name: c.name,
      topics: c.topics.map((t) => ({ id: t.id, name: t.name })),
    })),
  };
}

/** Where the student studies it: their profile, else the course's first offering. */
export type Place = { branch: string; sem: number; fromProfile: boolean };

export function placeFor(
  course: PrismCourse,
  profile: { branch?: string; semester?: number },
): Place | null {
  if (profile.branch && profile.semester)
    return { branch: profile.branch, sem: profile.semester, fromProfile: true };
  const own = course.offerings.find((o) => o.branch === profile.branch) ?? course.offerings[0];
  return own ? { branch: own.branch, sem: own.semester, fromProfile: false } : null;
}

/**
 * Every difference between the handout and the course. Course level first (only when the student's
 * own branch and semester are known: "not offered in my semester"), then units and topics.
 */
export function compareStudentHandout(
  handout: StudentHandout,
  course: PrismCourse,
  branchCourses: readonly PrismCourse[],
  place: Place,
): Change[] {
  const h: HandoutCourse = {
    branch: place.branch,
    sem: place.sem,
    code: handout.code,
    title: handout.title,
    courseType: handout.courseType,
    // A lab's experiments are its one chapter's topics in Prism.
    units:
      handout.courseType === "practical"
        ? [
            {
              order: 1,
              name: "Experiments",
              topics: handout.experiments.map((e) => e.title),
            },
          ]
        : handout.units,
    experiments: handout.experiments,
    related: [],
    pages: "student upload",
    source: "student handout",
  };
  const out: MatchResult = { changes: [], needsReview: [], matched: [] };
  if (place.fromProfile) {
    const here = course.offerings.filter((o) => o.branch === place.branch);
    if (here.length === 0)
      out.changes.push({
        branch: place.branch,
        sem: place.sem,
        type: "course missing from branch/semester",
        detail: `Link ${course.id} to ${place.branch} sem ${place.sem} (student handout)`,
        handout: { course: h.title, code: h.code },
        prism: { subject: course.id },
        to: { branch: place.branch, semester: place.sem },
      });
    else if (!here.some((o) => o.semester === place.sem))
      out.changes.push({
        branch: place.branch,
        sem: place.sem,
        type: "course in wrong semester",
        detail: `Move ${course.id} for ${place.branch} from sem ${here.map((o) => o.semester).join("/")} to sem ${place.sem} (student handout)`,
        handout: { course: h.title, code: h.code },
        prism: { subject: course.id },
        to: { branch: place.branch, semester: place.sem },
      });
  }
  if (h.units.some((u) => u.topics.length > 0)) compareUnits(h, course, branchCourses, out);
  return out.changes;
}

/** What the changes add up to, in a student's words (shown after the check). */
export function summarizeChanges(changes: readonly Change[]): string[] {
  const count = (pred: (c: Change) => boolean) => changes.filter(pred).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const lines: string[] = [];
  const add = (n: number, text: string) => {
    if (n > 0) lines.push(text);
  };
  const place = count(
    (c) =>
      c.type === "course missing from branch/semester" || c.type === "course in wrong semester",
  );
  add(place, "This course is listed in a different semester or branch on Prism");
  const units = count((c) => c.type === "unit missing" || c.type === "unit under wrong course");
  add(units, `${plural(units, "chapter", "chapters")} missing from this course`);
  const order = count((c) => c.type === "unit wrong order");
  add(order, `${plural(order, "chapter is", "chapters are")} in a different order`);
  const names = count((c) => c.type === "unit rename");
  add(names, plural(names, "chapter needs its real name", "chapters need their real names"));
  const missing = count((c) => c.type === "topic missing");
  add(missing, `${plural(missing, "topic", "topics")} missing`);
  const moved = count((c) => c.type === "topic under wrong unit");
  add(moved, `${plural(moved, "topic sits", "topics sit")} in the wrong chapter`);
  const split = count((c) => c.type === "topic split");
  add(split, `${plural(split, "topic", "topics")} to split into smaller ones`);
  const extra = count((c) => Boolean(c.retire));
  add(extra, `${plural(extra, "item", "items")} on Prism that your handout does not have`);
  return lines;
}
