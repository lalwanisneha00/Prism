// Syllabus fix, Phase 2 step 2: dry run. Compares handouts/_parsed/**.json
// (from import-handouts.ts) with Prism's PDEU subjects and writes
// handouts/_parsed/REARRANGE_REPORT.md and rearrange-plan.json.
// Changes nothing in Prism's data.
//
//   npm run handouts:match
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  matchHandouts,
  outlineKey,
  type Change,
  type ChangeType,
  type HandoutCourse,
  type OutlineCourse,
  type PrismCourse,
  type ReviewItem,
} from "../src/lib/syllabusFix/handoutMatch";
import type { ParsedSemester } from "./import-handouts";

const PARSED = path.resolve("handouts/_parsed");
const SUBJECTS = path.resolve("src/data/subjects");
const BRANCHES = ["ce", "ict", "ece", "me", "civil", "petro", "biotech", "elec", "chem"];

/** Handouts that only hold part of a semester (see SPLIT_REPORT.md): never retire there. */
function incomplete(branch: string, sem: number): boolean {
  return sem === 8 || ((branch === "ict" || branch === "elec") && sem <= 2);
}

function loadParsed(): ParsedSemester[] {
  return readdirSync(PARSED, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(path.join(PARSED, d.name))
        .filter((f) => f.endsWith(".json"))
        .map(
          (f) => JSON.parse(readFileSync(path.join(PARSED, d.name, f), "utf8")) as ParsedSemester,
        ),
    )
    .sort((a, b) => a.folder.localeCompare(b.folder) || a.sem - b.sem);
}

type Retirable = { status?: string };

/**
 * `activeOnly` (Phase 8 re-check) also leaves out retired chapters and topics, which did not
 * exist when Phase 2 ran; without it a re-run would move topics into hidden chapters.
 */
function loadPrism(activeOnly = false): PrismCourse[] {
  return readdirSync(SUBJECTS)
    .filter((f) => /^pdeu-.*\.json$/.test(f) && !f.endsWith("-sources.json"))
    .map((f) => JSON.parse(readFileSync(path.join(SUBJECTS, f), "utf8")) as PrismCourse & Retirable)
    .filter((s) => s.status !== "retired")
    .map((s) =>
      activeOnly
        ? {
            ...s,
            chapters: s.chapters
              .filter((c) => (c as Retirable).status !== "retired")
              .map((c) => ({
                ...c,
                topics: c.topics.filter((t) => (t as Retirable).status !== "retired"),
              })),
          }
        : s,
    );
}

const TYPE_ORDER: ChangeType[] = [
  "course missing from branch/semester",
  "course in wrong semester",
  "course in wrong branch",
  "new course",
  "new practical course",
  "unit under wrong course",
  "unit wrong order",
  "unit missing",
  "unit rename",
  "topic under wrong unit",
  "topic missing",
  "topic split",
  "extra item not in any handout",
];

function report(sems: ParsedSemester[], changes: Change[], review: ReviewItem[]): string {
  const L: string[] = ["# Rearrange report (dry run)", ""];
  L.push(
    "Made by `npm run handouts:match`. **Nothing has been changed yet.** This lists what would change if approved. Moves keep ids (so student progress stays linked), additions are only for things genuinely missing, and retirements are soft (hidden, never deleted).",
    "",
    "CSBS and CSSE are skipped (no handouts). ELEC (`elec`) and CHEM (`chem`) are new branches, so all their courses show as links or new courses.",
    "",
  );

  // Course types.
  const courses = sems.flatMap((s) =>
    s.courses.map((c) => ({ ...c, folder: s.folder, sem: s.sem })),
  );
  const t = (type: string | null, list = courses) =>
    list.filter((c) => !c.nonTeaching && c.courseType === type).length;
  L.push("## Course types", "");
  L.push(
    "Theory = lectures only. Practice = lectures plus practical hours in one course. Practical = lab (its units are its experiments). The handouts print no course type field, so the type comes from the title, the L-T-P hours and whether the course lists units or experiments, checked against the code's T/P letter.",
    "",
  );
  L.push("| Branch | Theory | Practice | Practical | Not taught (internship etc.) | Undetected |");
  L.push("| ------ | ------ | -------- | --------- | ---------------------------- | ---------- |");
  for (const folder of [...new Set(sems.map((s) => s.folder))]) {
    const list = courses.filter((c) => c.folder === folder);
    L.push(
      `| ${folder} | ${t("theory", list)} | ${t("practice", list)} | ${t("practical", list)} | ${list.filter((c) => c.nonTeaching).length} | ${t(null, list)} |`,
    );
  }
  L.push(
    `| **All** | ${t("theory")} | ${t("practice")} | ${t("practical")} | ${courses.filter((c) => c.nonTeaching).length} | ${t(null)} |`,
    "",
  );
  const undetected = courses.filter((c) => !c.nonTeaching && c.courseType === null);
  L.push(
    undetected.length
      ? `Type not detected: ${undetected.map((c) => `${c.folder} sem ${c.sem} ${c.title}`).join("; ")}`
      : "Type detected for every taught course. Disagreements (code vs handout, L-T-P vs title) are in needs_review below.",
    "",
  );

  // Counts per branch.
  const branches = [...new Set([...changes.map((c) => c.branch), ...review.map((r) => r.branch)])];
  L.push("## Counts per branch", "");
  L.push(`| Change | ${branches.join(" | ")} | All |`);
  L.push(`| --- | ${branches.map(() => "---").join(" | ")} | --- |`);
  for (const type of TYPE_ORDER) {
    const row = branches.map(
      (b) => changes.filter((c) => c.type === type && c.branch === b).length,
    );
    L.push(`| ${type} | ${row.join(" | ")} | ${row.reduce((a, b) => a + b, 0)} |`);
  }
  const rv = branches.map((b) => review.filter((r) => r.branch === b).length);
  L.push(`| **needs_review** | ${rv.join(" | ")} | ${rv.reduce((a, b) => a + b, 0)} |`, "");

  // Full list.
  L.push("## Planned changes", "");
  for (const b of branches) {
    const mine = changes.filter((c) => c.branch === b);
    if (!mine.length) continue;
    L.push(`### ${b}`, "");
    for (const type of TYPE_ORDER) {
      const list = mine.filter((c) => c.type === type).sort((x, y) => x.sem - y.sem);
      if (!list.length) continue;
      L.push(`<details><summary>${type} (${list.length})</summary>`, "");
      for (const c of list) L.push(`- sem ${c.sem}: ${c.detail}`);
      L.push("", "</details>", "");
    }
  }

  L.push("## needs_review", "");
  L.push("Not changed automatically. Each needs a person to decide.", "");
  const reasons = [...new Set(review.map((r) => r.reason))];
  for (const reason of reasons) {
    const list = review.filter((r) => r.reason === reason);
    L.push(`<details><summary>${reason} (${list.length})</summary>`, "");
    for (const r of list.sort((a, b) => a.branch.localeCompare(b.branch) || a.sem - b.sem))
      L.push(`- ${r.branch} sem ${r.sem}: ${r.detail}`);
    L.push("", "</details>", "");
  }
  return L.join("\n") + "\n";
}

/** The whole dry run, from the parsed handouts and today's subject files. */
export function buildPlan({ activeOnly = false }: { activeOnly?: boolean } = {}) {
  const sems = loadParsed();
  const prism = loadPrism(activeOnly);
  const handouts: HandoutCourse[] = sems.flatMap((s) =>
    s.courses
      .filter((c) => !c.nonTeaching && c.courseType !== null)
      .map((c) => ({
        branch: s.branch,
        sem: s.sem,
        code: c.code,
        title: c.title,
        courseType: c.courseType!,
        units: c.units,
        experiments: c.experiments,
        related: c.related,
        pages: c.pages,
        source: s.source,
      })),
  );
  const seen = new Set<string>();
  const outline: OutlineCourse[] = [];
  for (const s of sems)
    for (const r of s.outline) {
      const row = { branch: s.branch, sem: r.sem, name: r.name, fileSem: s.sem };
      if (seen.has(outlineKey(row))) continue;
      seen.add(outlineKey(row));
      outline.push(row);
    }
  const result = matchHandouts(handouts, prism, outline, { incomplete, branches: BRANCHES });
  // Parse problems (type disagreements, missing experiment lists) are review items too.
  const parseReview: ReviewItem[] = sems.flatMap((s) =>
    s.courses
      .filter((c) => c.review.length)
      .map((c) => ({
        branch: s.branch,
        sem: s.sem,
        reason: "handout parsing / course type",
        detail: `${c.code ?? "no code"} ${c.title} (p${c.pages}): ${c.review.join("; ")}`,
      })),
  );
  const review = [...parseReview, ...result.needsReview];
  return { sems, handouts, result, review };
}

function main() {
  const { sems, result, review } = buildPlan();
  writeFileSync(path.join(PARSED, "REARRANGE_REPORT.md"), report(sems, result.changes, review));
  writeFileSync(
    path.join(PARSED, "rearrange-plan.json"),
    JSON.stringify(
      { changes: result.changes, needsReview: review, matched: result.matched },
      null,
      2,
    ) + "\n",
  );
  const by = (type: ChangeType) => result.changes.filter((c) => c.type === type).length;
  console.log(TYPE_ORDER.map((t) => `${t}: ${by(t)}`).join("\n"));
  console.log(`needs_review: ${review.length}; matched courses: ${result.matched.length}`);
}

// Run only when called directly (the apply migration imports buildPlan).
if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/match-handouts.ts")) main();
