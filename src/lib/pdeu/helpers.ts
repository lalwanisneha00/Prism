import matchData from "@/data/pdeu/prism-match.json";
import type { DraftChapter } from "@/lib/custom/syllabusText";
import type { PdeuAnyCourse, PdeuBranch, PdeuCourse } from "@/lib/pdeu/types";

/** Core or not-core courses of one semester, in the handbook's order. */
export function coursesOf(branch: PdeuBranch, semester: number, core: boolean): PdeuCourse[] {
  return branch.subjects.filter((s) => s.semester === semester && s.core === core);
}

/** What the listed courses of the semester add up to (the handbook's table, less any course the owner left out). */
export function semesterCredits(
  branch: PdeuBranch,
  semester: number,
): { core: number; notCore: number; total: number } {
  const core = coursesOf(branch, semester, true).reduce((n, s) => n + s.credits, 0);
  const notCore = coursesOf(branch, semester, false).reduce((n, s) => n + s.credits, 0);
  return { core, notCore, total: core + notCore };
}

/** Lecture-tutorial-practical hours in words: "3 lecture · 1 tutorial". */
export function ltpText(ltp: string | undefined): string {
  if (!ltp) return "";
  const [l, t, p] = ltp.split("-").map(Number);
  return [l ? `${l} lecture` : "", t ? `${t} tutorial` : "", p ? `${p} practical` : ""]
    .filter(Boolean)
    .join(" · ");
}

export function topicCount(course: PdeuAnyCourse): number {
  return course.units.reduce((n, u) => n + u.topics.length, 0);
}

export function isLab(course: PdeuAnyCourse): boolean {
  return (course.experiments?.length ?? 0) > 0 && course.units.length === 0;
}

/** A course has something to study (units) or only a note ("the handbook prints no syllabus"). */
export function hasUnits(course: PdeuAnyCourse): boolean {
  return course.units.length > 0;
}

export function findCourse(branch: PdeuBranch, key: string): PdeuAnyCourse | undefined {
  for (const s of branch.subjects) {
    if (s.key === key) return s;
    const o = s.options?.find((x) => x.key === key);
    if (o) return { ...o, semester: s.semester, core: s.core };
  }
  return undefined;
}

/** Lowercase words without brackets, "&" as "and", and 1/2/3 as i/ii/iii, for name matching. */
export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => ({ "1": "i", "2": "ii", "3": "iii", "4": "iv" })[w] ?? w)
    .join(" ");
}

type MatchEntry = { subject: string; part?: boolean };
const matches = matchData as unknown as Record<string, MatchEntry>;

/** The Prism subject that teaches this PDEU course, when there is a clear one. */
export function prismMatch(name: string): MatchEntry | undefined {
  return matches[nameKey(name)];
}

/** The course as editable chapters for a subject of the student's own: units become chapters. */
export function toDraftChapters(course: PdeuAnyCourse): DraftChapter[] {
  return course.units
    .filter((u) => u.topics.length > 0)
    .map((u) => ({
      name: u.title,
      ...(u.hours ? { hours: u.hours } : {}),
      topics: u.topics.map((t) => t.replace(/\s+/g, " ").trim()),
    }));
}

/** "24PH101T" / "Code not printed yet" for the card line. */
export function codeText(course: PdeuAnyCourse): string {
  return course.code ?? "Code not printed in the handbook";
}
