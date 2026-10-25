// Syllabus fix, Phase 2 follow-up (owner's decision, 2026-10-25): Electrical Engineering's first
// year is the 2024 common first year it shares with CSE/ICT/EC/EE (the 2024 ICT and ECE handouts
// print first-year codes "UG_1_T(CSE/ICT/EC/EE)"); ELEC's own handout PDFs hold the 2020 scheme.
//  - ELEC sem 1 and 2 get the courses ECE's 2024 handouts teach there (same offering as ECE).
//  - ELEC's 2020-scheme first-year course and lab are retired (soft).
//  - Every ELEC course from sem 3 on (all ELEC-only, from the 2020 handouts) is marked
//    "unverified", with its chapters and topics, so student uploads and flags can correct it.
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/003-elec-first-year.ts up|down
//
// "up" tags the current commit (pre-syllabus-003) and records the files it writes in
// data/university/pdeu/migrations/003-elec-first-year.json; "down" restores them from the tag.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
  type HistoryEntry,
} from "../../src/lib/syllabusFix/history";

const NAME = "003-elec-first-year";
const CAUSE = `migration ${NAME} up (ELEC first year = 2024 common first year, owner 2026-10-25)`;
const TAG = "pre-syllabus-003";
const SUBJECTS = "src/data/subjects";
const HISTORY = "data/university/pdeu/history.jsonl";
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;
const PLAN = "handouts/_parsed/rearrange-plan.json";
const MODEL = "ece";
/**
 * ECE first-year courses kept only because ECE's course table still lists them, next to the
 * course its 2024 handout actually teaches: ELEC gets the handout's course, not both.
 */
const SKIP: Record<string, string> = {
  "pdeu-environment-science-ce-ece":
    "same course as pdeu-environmental-science-biotech (ECE handout)",
  "pdeu-introduction-to-electrical-engineering":
    "the 2024 handout's course is Elements of Electrical and Electronics Engineering",
};

type Meta = { confidence?: string; status?: string };
type Topic = Meta & { id: string };
type Chapter = Meta & { id: string; topics: Topic[] };
type Offering = { branch: string; semester: number; key: string; [k: string]: unknown };
type Subject = Meta & {
  id: string;
  branches: string[];
  semesters: number[];
  offerings?: Offering[];
  chapters: Chapter[];
  [k: string]: unknown;
};

const now = new Date().toISOString();
const history: HistoryEntry[] = [];
const log = (target: HistoryEntry["target"], field: string, oldValue: unknown, newValue: unknown) =>
  history.push(
    historyEntry({
      actor: { kind: "script", id: NAME },
      cause: CAUSE,
      target,
      field,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
      at: now,
    }),
  );

function up(): void {
  if (existsSync(MANIFEST)) throw new Error(`${NAME} is already applied. Run "down" first.`);
  const dirty = execFileSync("git", ["status", "--porcelain", "--", "src/data", HISTORY], {
    encoding: "utf8",
  });
  if (dirty.trim()) throw new Error(`Uncommitted syllabus data changes:\n${dirty}`);
  if (!execFileSync("git", ["tag", "--list", TAG], { encoding: "utf8" }).trim())
    execFileSync("git", ["tag", TAG]);

  const files = new Map<string, { file: string; data: Subject }>();
  for (const f of readdirSync(SUBJECTS))
    if (/^pdeu-.*\.json$/.test(f) && !f.endsWith("-sources.json")) {
      const file = path.join(SUBJECTS, f);
      const data = JSON.parse(readFileSync(file, "utf8")) as Subject;
      files.set(data.id, { file, data });
    }
  const modified = new Set<string>();
  const touch = (s: Subject) => modified.add(files.get(s.id)!.file);
  const sync = (s: Subject) => {
    s.branches = [...new Set(s.offerings!.map((o) => o.branch))];
    s.semesters = [...new Set(s.offerings!.map((o) => o.semester))].sort((a, b) => a - b);
  };
  const plan = JSON.parse(readFileSync(PLAN, "utf8")) as {
    matched: { branch: string; sem: number; subject: string }[];
  };
  const handoutMatched = new Set(
    plan.matched.filter((m) => m.branch === MODEL).map((m) => m.subject),
  );

  let linked = 0;
  let retired = 0;
  let unverified = 0;
  for (const { data: s } of files.values()) {
    if (s.status === "retired") continue;
    const offerings = s.offerings ?? [];
    // 1. ELEC first year = ECE's 2024 first year.
    const model = offerings.find((o) => o.branch === MODEL && o.semester <= 2);
    // Every ECE first-year course (handout courses, their labs, and course-table-only ones such
    // as Indian Knowledge System), except a table-only twin of a handout course (SKIP).
    if (model && !SKIP[s.id] && !offerings.some((o) => o.branch === "elec")) {
      const offering = { ...model, branch: "elec" };
      offerings.push(offering);
      sync(s);
      touch(s);
      log({ kind: "subject", subject: s.id }, "offering elec", null, {
        ...offering,
        fromEceHandout: handoutMatched.has(s.id),
      });
      linked++;
      continue;
    }
    const elec = offerings.filter((o) => o.branch === "elec");
    if (!elec.length) continue;
    const elecOnly = offerings.every((o) => o.branch === "elec");
    // 2. ELEC's 2020-scheme first-year courses give way to the 2024 common first year.
    if (elecOnly && elec.every((o) => o.semester <= 2)) {
      log({ kind: "subject", subject: s.id }, "status", s.status ?? "active", "retired");
      s.status = "retired";
      touch(s);
      retired++;
      continue;
    }
    // 3. ELEC from sem 3 on comes from the 2020-scheme handouts: unverified, so uploads fix it.
    if (elecOnly && elec.some((o) => o.semester >= 3)) {
      const nodes: (Meta & { id: string })[] = [
        s,
        ...s.chapters,
        ...s.chapters.flatMap((c) => c.topics),
      ];
      const changed = nodes.filter((n) => n.confidence && n.confidence !== "unverified");
      if (s.confidence !== "unverified" || changed.length) {
        for (const n of changed) n.confidence = "unverified";
        s.confidence = "unverified";
        touch(s);
        log(
          { kind: "subject", subject: s.id },
          "confidence (course, chapters, topics)",
          "verified",
          "unverified",
        );
        unverified++;
      }
    }
  }

  for (const { file, data } of files.values())
    if (modified.has(file)) writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
  const norm = (f: string) => f.replaceAll("\\", "/");
  writeFileSync(
    MANIFEST,
    `${JSON.stringify({ appliedAt: now, gitTag: TAG, modified: [...modified].map(norm).sort(), skipped: SKIP }, null, 2)}\n`,
  );
  console.log(
    `${NAME} up: ${linked} first-year courses linked to elec, ${retired} 2020-scheme first-year courses retired, ${unverified} ELEC courses marked unverified, ${history.length} history entries.`,
  );
}

function down(): void {
  if (!existsSync(MANIFEST)) throw new Error(`${NAME} is not applied.`);
  const m = JSON.parse(readFileSync(MANIFEST, "utf8")) as { gitTag: string; modified: string[] };
  execFileSync("git", ["checkout", m.gitTag, "--", ...m.modified]);
  const { entries } = parseHistory(readFileSync(HISTORY, "utf8"));
  const undo = historyEntry({
    actor: { kind: "script", id: NAME },
    cause: `migration ${NAME} down`,
    target: { kind: "branch" },
    field: "ELEC first year and unverified marks",
    oldValue: null,
    newValue: null,
  });
  let all = entries;
  for (const e of entries.filter((x) => x.cause === CAUSE && !x.reverted))
    all = markReverted(all, e.id, undo.id);
  writeFileSync(HISTORY, formatHistory([...all, undo]));
  rmSync(MANIFEST);
  console.log(`${NAME} down: restored ${m.modified.length} files from ${m.gitTag}.`);
}

const direction = process.argv[2];
if (direction === "up") up();
else if (direction === "down") down();
else {
  console.error(`Usage: ${NAME}.ts up|down`);
  process.exit(1);
}
