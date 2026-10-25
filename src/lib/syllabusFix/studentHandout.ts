import { z } from "zod";
import {
  baseCourseName,
  decideCourseType,
  parseExperiments,
  parseUnits,
  tidyCaps,
} from "@/lib/syllabusFix/handoutCourse";
import { parseLtp, sliceCourses, type CourseSlice } from "@/lib/syllabusFix/handoutText";
import type { Confidence } from "@/lib/syllabusFix/tree";

/*
 * A student's course handout (syllabus fix, Phase 3). Read on the student's device with the same
 * rules the Phase 2 import used, shown to them for a check, then sent to the server, which compares
 * it with Prism's course and turns each difference into a proposal (Phase 5 votes on them).
 * Browser-safe: nothing here loads the subject catalogue.
 */

const short = z.string().trim().min(1).max(300);

/** What the student confirms and the server receives. Limits keep one upload small. */
export const StudentHandoutSchema = z.object({
  code: z.string().trim().max(30).nullable(),
  title: z.string().trim().max(200),
  courseType: z.enum(["theory", "practice", "practical"]),
  units: z
    .array(
      z.object({
        order: z.int().min(1).max(30),
        name: short,
        hours: z.number().min(0).max(200).optional(),
        topics: z.array(short).max(80),
      }),
    )
    .max(20),
  experiments: z
    .array(
      z.object({
        number: z.int().min(1).max(99),
        title: short,
        aim: z.string().trim().max(600).optional(),
      }),
    )
    .max(60),
});
export type StudentHandout = z.infer<typeof StudentHandoutSchema>;

/** The course the upload is for (the course page the student is on). */
export type TargetCourse = { name: string; codes: readonly string[] };

export type ReadResult =
  | { ok: true; handout: StudentHandout; notes: string[] }
  | { ok: false; reason: "not-found"; courses: string[] }
  | { ok: false; reason: "empty" };

const WORD_STOP = new Set("a an and of the in for to with on lab laboratory".split(" "));
const wordsOf = (s: string) =>
  baseCourseName(s)
    .split(" ")
    .filter((w) => w && !WORD_STOP.has(w));

/** Share of words two course names have in common (0 to 1). Small on purpose: browser code. */
export function titleOverlap(a: string, b: string): number {
  const x = new Set(wordsOf(a));
  const y = new Set(wordsOf(b));
  if (x.size === 0 || y.size === 0) return 0;
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / Math.max(x.size, y.size);
}

/** Which slice of the file is this course: same code first, then the closest title. */
function pickSlice(slices: readonly CourseSlice[], target: TargetCourse): CourseSlice | null {
  const codes = new Set(target.codes.map((c) => c.toUpperCase()));
  const byCode = slices.find((s) => s.code && codes.has(s.code));
  if (byCode) return byCode;
  const ranked = slices
    .map((s) => ({ s, score: s.title ? titleOverlap(s.title, target.name) : 0 }))
    .sort((a, b) => b.score - a.score);
  if (ranked[0] && ranked[0].score >= 0.5) return ranked[0].s;
  // One untitled course (a handout without a scheme table, or pasted text): take it as this one.
  return slices.length === 1 && !slices[0].title ? slices[0] : null;
}

/**
 * Read the target course out of the uploaded document (one handout, or a whole semester stacked
 * together). Rule-based, the same parser as the Phase 2 import. The student checks the result.
 */
export function readStudentHandout(
  pages: readonly (readonly string[])[],
  target: TargetCourse,
): ReadResult {
  const slices = sliceCourses(pages);
  const slice = pickSlice(slices, target);
  if (!slice) {
    return {
      ok: false,
      reason: "not-found",
      courses: slices.map((s) => tidyCaps(s.title)).filter(Boolean),
    };
  }
  const units = parseUnits(slice.lines);
  const experiments = parseExperiments(slice.lines);
  if (units.length === 0 && experiments.length === 0) return { ok: false, reason: "empty" };
  const decision = decideCourseType({
    code: slice.code,
    title: slice.title || target.name,
    ltp: parseLtp(slice.lines),
    unitCount: units.length,
    experimentCount: experiments.length,
    hasLabTwin: false,
  });
  const notes: string[] = [];
  if (slices.length > 1) notes.push(`Your file has ${slices.length} courses; this one was used.`);
  return {
    ok: true,
    handout: {
      code: slice.code,
      title: tidyCaps(slice.title || target.name),
      courseType: decision.courseType ?? (units.length > 0 ? "theory" : "practical"),
      units: units.map((u) => ({ ...u, topics: u.topics.slice(0, 80) })).slice(0, 20),
      experiments: experiments.slice(0, 60),
    },
    notes,
  };
}

/** Plain text (a Word file or pasted text) as one page of lines. */
export function textToPages(text: string): string[][] {
  return [
    text
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  ];
}

/**
 * Show the "upload your handout" banner? Yes while the course is not verified, or when it is
 * verified only for other batches than the student's (when they told us their batch).
 */
export function handoutWanted(
  confidence: Confidence,
  batchYears: readonly number[] | undefined,
  batchYear: number | undefined,
): boolean {
  if (confidence !== "verified") return true;
  if (!batchYears?.length || batchYear === undefined) return false;
  return !batchYears.includes(batchYear);
}

/** Is this a course type the parser can fill (labs list experiments, the rest units)? */
export function isEmptyHandout(h: StudentHandout): boolean {
  return h.courseType === "practical"
    ? h.experiments.length === 0
    : h.units.every((u) => u.topics.length === 0);
}
