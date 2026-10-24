// Syllabus fix, Phase 2 step 1: read every course out of the split handouts.
// Reads handouts/_split/manifest.json (made by split-handouts.mjs) and the
// original PDFs' text, writes handouts/_parsed/<BRANCH>/sem<N>.json and
// handouts/_parsed/FAILED.md. Rule-based and free; no AI calls.
//
//   npm run handouts:import
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isPageHeader, readPdfLines } from "./lib/handout-text.mjs";
import {
  baseCourseName,
  decideCourseType,
  parseExperiments,
  parseUnits,
  tidyCaps,
  type CourseType,
  type Ltp,
  type ParsedExperiment,
  type ParsedUnit,
} from "../src/lib/syllabusFix/handoutCourse";
import { parseOutline, type OutlineRow } from "../src/lib/syllabusFix/handoutOutline";

const ROOT = path.resolve("handouts");
const OUT = path.join(ROOT, "_parsed");

type ManifestCourse = {
  code: string | null;
  title: string;
  kind: "theory" | "lab" | "other";
  ltp: Ltp | null;
  from: number;
  fromLine: number;
  to: number;
  file: string;
};
type ManifestSem = {
  folder: string;
  branch: string;
  sem: number;
  source: string;
  frontMatter: number[];
  courses: ManifestCourse[];
};

export type ParsedCourse = {
  code: string | null;
  title: string;
  /** Not a taught course: internship, seminar, project, yoga/NSS/NCC. */
  nonTeaching: boolean;
  courseType: CourseType | null;
  typeSignals: string[];
  /** Why this course needs a human look (type disagreement, nothing parsed, ...). */
  review: string[];
  ltp: Ltp | null;
  pages: string;
  splitFile: string;
  units: ParsedUnit[];
  experiments: ParsedExperiment[];
  /** Title of the theory/lab partner in the same semester. */
  related: string[];
};

export type ParsedSemester = {
  folder: string;
  branch: string;
  sem: number;
  source: string;
  courses: ParsedCourse[];
  outline: OutlineRow[];
};

function courseText(pages: string[][], course: ManifestCourse, next?: ManifestCourse): string[] {
  const out: string[] = [];
  for (let p = course.from; p <= pages.length; p++) {
    const lines = pages[p - 1];
    const start = p === course.from ? course.fromLine : 0;
    let end = lines.length;
    if (next && p === next.from) end = next.fromLine;
    if (next && p > next.from) break;
    out.push(...lines.slice(start, end).filter((l) => !isPageHeader(l)));
    if (next && p === next.from) break;
    if (!next && p >= course.to) break;
  }
  return out;
}

function parseSemester(sem: ManifestSem, pages: string[][]): ParsedSemester {
  const labNames = new Set(
    sem.courses.filter((c) => c.kind === "lab").map((c) => baseCourseName(c.title)),
  );
  const courses = sem.courses.map((c, k): ParsedCourse => {
    const text = courseText(pages, c, sem.courses[k + 1]);
    const nonTeaching = c.kind === "other";
    const units = nonTeaching ? [] : parseUnits(text);
    const experiments = nonTeaching ? [] : parseExperiments(text);
    const isLabByName = c.kind === "lab";
    const decision = nonTeaching
      ? { courseType: null, signals: ["internship / seminar / project / activity"] }
      : decideCourseType({
          code: c.code,
          title: c.title,
          ltp: c.ltp,
          unitCount: units.length,
          experimentCount: experiments.length,
          hasLabTwin: !isLabByName && labNames.has(baseCourseName(c.title)),
        });
    const review: string[] = [];
    if ("review" in decision && decision.review) review.push(decision.review);
    if (!nonTeaching && decision.courseType === null) review.push("course type not detected");
    if (decision.courseType === "practical" && experiments.length === 0) {
      if (units.length > 0) {
        // Some labs are written as units (e.g. Industry 4.0 Lab): each unit is one session.
        experiments.push(...units.map((u) => ({ number: u.order, title: u.name })));
        review.push("lab written as units: each unit kept as one experiment");
      } else review.push("practical course, no experiment list found");
    }
    if (decision.courseType && decision.courseType !== "practical") {
      if (units.length === 0) review.push("no units found");
      else if (units.every((u) => u.topics.length === 0)) review.push("units have no topics");
    }
    return {
      code: c.code,
      title: tidyCaps(c.title),
      nonTeaching,
      courseType: decision.courseType,
      typeSignals: decision.signals,
      review,
      ltp: c.ltp,
      pages: c.from === c.to ? `${c.from}` : `${c.from}-${c.to}`,
      splitFile: c.file,
      units,
      experiments,
      related: [],
    };
  });
  // Link each theory course with its lab (same name without "Laboratory").
  for (const a of courses) {
    if (a.nonTeaching) continue;
    for (const b of courses) {
      if (a === b || b.nonTeaching || a.courseType === b.courseType) continue;
      const pair = [a, b].some((x) => x.courseType === "practical");
      if (pair && baseCourseName(a.title) === baseCourseName(b.title)) a.related.push(b.title);
    }
  }
  const front = sem.frontMatter.flatMap((p) => pages[p - 1] ?? []);
  return {
    folder: sem.folder,
    branch: sem.branch,
    sem: sem.sem,
    source: sem.source,
    courses,
    outline: parseOutline(front),
  };
}

function failedReport(all: ParsedSemester[]): string {
  const L = ["# Handouts that need a human look", ""];
  L.push(
    "Made by `npm run handouts:import`. Rule-based parsing only (no AI). Each line is one course and why it needs checking. Types: theory, practice (lectures plus practical hours in one course), practical (lab).",
    "",
  );
  let n = 0;
  for (const s of all) {
    const bad = s.courses.filter((c) => c.review.length > 0);
    if (!bad.length) continue;
    L.push(`## ${s.folder} sem ${s.sem}`, "");
    for (const c of bad) {
      n++;
      L.push(`- p${c.pages} ${c.code ?? "no code"} ${c.title}: ${c.review.join("; ")}`);
    }
    L.push("");
  }
  if (n === 0) L.push("Nothing failed.");
  return L.join("\n") + "\n";
}

async function main() {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, "_split", "manifest.json"), "utf8")) as {
    semesters: ManifestSem[];
  };
  const all: ParsedSemester[] = [];
  for (const sem of manifest.semesters) {
    const pages = (await readPdfLines(path.join(ROOT, sem.source))) as string[][];
    const parsed = parseSemester(sem, pages);
    all.push(parsed);
    const dir = path.join(OUT, sem.folder);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `sem${sem.sem}.json`), JSON.stringify(parsed, null, 2) + "\n");
  }
  writeFileSync(path.join(OUT, "FAILED.md"), failedReport(all));
  const courses = all.flatMap((s) => s.courses);
  const count = (t: CourseType | null) =>
    courses.filter((c) => !c.nonTeaching && c.courseType === t).length;
  console.log(
    `${courses.length} courses: theory ${count("theory")}, practice ${count("practice")}, practical ${count("practical")}, undetected ${count(null)}, non-teaching ${courses.filter((c) => c.nonTeaching).length}; needs a look: ${courses.filter((c) => c.review.length).length}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
