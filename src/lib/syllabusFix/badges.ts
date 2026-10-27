import { activeChanges, type Overlay } from "@/lib/syllabusFix/overlay";
import type { ResolvedMeta } from "@/lib/syllabusFix/tree";

/*
 * Trust badges (syllabus fix, Phase 7), pure. Like the stamp on a photocopied timetable: "checked
 * by 3 students of Computer Engineering" means more than "copied from the website". The words
 * come from where a course or chapter came from (`source`), how sure we are (`confidence`) and,
 * for live fixes, who voted them through.
 */

export type BadgeTone = "verified" | "pending" | "unverified";

export type Badge = {
  tone: BadgeTone;
  text: string;
  /** Show "Help verify?" (the course could use a student's handout). */
  helpVerify: boolean;
};

/** Who voted a live fix through. */
export type Support = { students: number; branch: string; batchYear?: number };

/**
 * The strongest live fix about this course (no chapter given: course-level fixes only, such as its
 * semester) or about one of its chapters (any fix to the chapter or a topic in it).
 */
export function liveSupport(
  overlay: Overlay,
  subjectId: string,
  chapterId?: string,
): Support | undefined {
  let best: Support | undefined;
  for (const a of activeChanges(overlay)) {
    const c = a.change;
    if (c.prism?.subject !== subjectId && c.to?.subject !== subjectId) continue;
    const chapters = [c.prism?.chapter, c.to?.chapter].filter(Boolean);
    const here = chapterId ? chapters.includes(chapterId) : chapters.length === 0;
    if (!here || a.supporters <= 0) continue;
    if (best && best.students >= a.supporters) continue;
    best = {
      students: a.supporters,
      branch: c.to?.branch ?? c.branch,
      ...(a.batchYear ? { batchYear: a.batchYear } : {}),
    };
  }
  return best;
}

const students = (n: number) => `${n} student${n === 1 ? "" : "s"}`;

/**
 * The badge for a course or chapter. `support` = a live fix's voters (with the branch's display
 * name looked up by the caller); a fix already copied into the data keeps only its count.
 */
export function badgeFor(
  meta: ResolvedMeta,
  support?: Omit<Support, "branch"> & { branchName?: string },
): Badge {
  const count = support?.students ?? (meta.source === "student_fix" ? meta.verifiedByCount : 0);
  if (count > 0) {
    const from = support?.branchName ? ` from ${support.branchName}` : "";
    const batch = support?.batchYear ? `, ${support.batchYear} batch` : "";
    return {
      tone: "verified",
      text: `Verified by ${students(count)}${from}${batch}`,
      helpVerify: false,
    };
  }
  if (meta.confidence === "verified")
    return {
      tone: "verified",
      text:
        meta.source === "student_handout"
          ? "Verified: matches a student's course handout"
          : "Verified: matches the current course handout",
      helpVerify: false,
    };
  if (meta.confidence === "pending")
    return { tone: "pending", text: "Being checked by students", helpVerify: true };
  return {
    tone: "unverified",
    text:
      meta.source === "official_site"
        ? "From official website, may be outdated"
        : "Not verified yet, may be outdated",
    helpVerify: true,
  };
}

/**
 * Whether a chapter needs its own badge: only when students fixed it, or when it is less sure than
 * its course (a badge on every chapter would repeat the course's).
 */
export function chapterBadgeWanted(course: Badge, chapter: Badge): boolean {
  if (chapter.text.startsWith("Verified by")) return true;
  return chapter.tone !== course.tone && chapter.tone !== "verified";
}
