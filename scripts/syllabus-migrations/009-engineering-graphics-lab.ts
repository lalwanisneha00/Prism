// Syllabus fix, admin correction after Phase 4B (owner's decision, 2026-10-26): Engineering
// Graphics (24ME102T / 24ME102P, L-T-P 0-0-4) is a lab, not a theory course: its nine items are
// the drawing laboratory (1 to 4) and the CAD laboratory (5 to 9). COMP takes it in semester 1.
//   1. `pdeu-engineering-graphics-ce-petro` becomes `courseType: "practical"` (shared course, so
//      for every branch that takes it). Ids, chapter and topics unchanged.
//   2. COMP's second listing of the same lab in semester 2 ("Engineering Graphics - Laboratory",
//      same nine experiments) is unlinked from COMP: its `ce` offering is removed and the COMP
//      handbook row is retired (soft). Other branches keep that course.
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/009-engineering-graphics-lab.ts up|down
//
// "up" keeps copies of the three files it writes in its manifest; "down" puts them back.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
  type HistoryEntry,
} from "../../src/lib/syllabusFix/history";

const NAME = "009-engineering-graphics-lab";
const CAUSE = `migration ${NAME} up (admin correction: admin_handout, verified; owner 2026-10-26)`;
const HISTORY = "data/university/pdeu/history.jsonl";
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;
const AFTER = "data/university/pdeu/migrations/008-comp-workshop-sem2.json";
const GRAPHICS = "pdeu-engineering-graphics-ce-petro";
const LAB = "pdeu-engineering-graphics-laboratory-ece";
const file = (id: string) => `src/data/subjects/${id}.json`;
const HANDBOOK = "src/data/pdeu/ce.json";
const LAB_KEY = "s2-engineering-graphics-laboratory";
const GRAPHICS_KEY = "s1-engineering-graphics";
const NOTE_LAB =
  "Same lab as Engineering Graphics in semester 1 (drawing and CAD laboratory); COMP takes it there (admin correction, owner 2026-10-26).";
const NOTE_GRAPHICS =
  "A lab: drawing laboratory (experiments 1 to 4) and CAD laboratory (5 to 9) (admin correction, owner 2026-10-26).";
const FILES = [file(GRAPHICS), file(LAB), HANDBOOK];

type Offering = { branch: string; semester: number; key: string; [k: string]: unknown };
type Subject = {
  id: string;
  semesters: number[];
  offerings?: Offering[];
  courseType?: string;
  source?: string;
  confidence?: string;
  [k: string]: unknown;
};
type HbCourse = {
  key: string;
  semester: number;
  retired?: boolean;
  notes?: string[];
  [k: string]: unknown;
};

const now = new Date().toISOString();
const history: HistoryEntry[] = [];
const log = (target: HistoryEntry["target"], field: string, oldValue: unknown, newValue: unknown) =>
  history.push(
    historyEntry({
      actor: { kind: "admin", id: NAME },
      cause: CAUSE,
      target,
      field,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
      at: now,
    }),
  );
const readJson = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

function up(): void {
  if (existsSync(MANIFEST)) throw new Error(`${NAME} is already applied. Run "down" first.`);
  if (!existsSync(AFTER)) throw new Error(`Apply 008-comp-workshop-sem2 first.`);
  const copies = Object.fromEntries(FILES.map((f) => [f, readFileSync(f, "utf8")]));

  // 1. Engineering Graphics is a lab.
  const g = readJson<Subject>(file(GRAPHICS));
  if (g.courseType === "practical") throw new Error(`${GRAPHICS} is already practical`);
  log({ kind: "subject", subject: GRAPHICS }, "courseType", g.courseType ?? "theory", "practical");
  g.courseType = "practical";
  // Lab convention: experiments are numbered, in the handout's order.
  const experiments = (g.chapters as { topics: { number?: number }[] }[]).flatMap((c) => c.topics);
  experiments.forEach((t, i) => {
    t.number ??= i + 1;
  });
  log({ kind: "subject", subject: GRAPHICS }, "experiment numbers", null, experiments.length);
  for (const [field, value] of [
    ["source", "admin_handout"],
    ["confidence", "verified"],
  ] as const)
    if (g[field] !== value) {
      log({ kind: "subject", subject: GRAPHICS }, field, g[field], value);
      g[field] = value;
    }
  writeFileSync(file(GRAPHICS), json(g));

  // 2. COMP's second listing of the same lab (semester 2) is unlinked from COMP.
  const lab = readJson<Subject>(file(LAB));
  const offering = lab.offerings?.find((o) => o.branch === "ce" && o.key === LAB_KEY);
  if (!offering) throw new Error(`${LAB} has no COMP offering ${LAB_KEY}`);
  lab.offerings = lab.offerings!.filter((o) => o !== offering);
  log({ kind: "subject", subject: LAB }, `offering ce/${LAB_KEY}`, offering, null);
  const sems = [...new Set(lab.offerings.map((o) => o.semester))].sort((a, b) => a - b);
  if (sems.join() !== lab.semesters.join()) {
    log({ kind: "subject", subject: LAB }, "semesters", lab.semesters, sems);
    lab.semesters = sems;
  }
  writeFileSync(file(LAB), json(lab));

  const hb = readJson<{ subjects: HbCourse[] }>(HANDBOOK);
  const labRow = hb.subjects.find((c) => c.key === LAB_KEY);
  const gRow = hb.subjects.find((c) => c.key === GRAPHICS_KEY);
  if (!labRow || !gRow) throw new Error(`${HANDBOOK} is missing ${LAB_KEY} or ${GRAPHICS_KEY}`);
  labRow.retired = true;
  labRow.notes = [...(labRow.notes ?? []), NOTE_LAB];
  gRow.notes = [...(gRow.notes ?? []), NOTE_GRAPHICS];
  log({ kind: "branch", subject: LAB }, `handbook ce/${LAB_KEY} retired`, false, true);
  writeFileSync(HANDBOOK, json(hb));

  writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
  writeFileSync(MANIFEST, json({ appliedAt: now, modified: FILES, copies }));
  console.log(
    `${NAME} up: ${GRAPHICS} is a lab; COMP's sem 2 copy unlinked. ${history.length} history entries.`,
  );
}

function down(): void {
  if (!existsSync(MANIFEST)) throw new Error(`${NAME} is not applied.`);
  const m = readJson<{ copies: Record<string, string> }>(MANIFEST);
  for (const [f, text] of Object.entries(m.copies)) writeFileSync(f, text);
  const { entries } = parseHistory(readFileSync(HISTORY, "utf8"));
  const undo = historyEntry({
    actor: { kind: "admin", id: NAME },
    cause: `migration ${NAME} down`,
    target: { kind: "catalogue" },
    field: "Engineering Graphics course type and COMP listing",
    oldValue: "practical, COMP sem 1 only",
    newValue: "theory, COMP sem 1 and lab in sem 2",
  });
  let all = entries;
  for (const e of entries.filter((x) => x.cause === CAUSE && !x.reverted))
    all = markReverted(all, e.id, undo.id);
  writeFileSync(HISTORY, formatHistory([...all, undo]));
  rmSync(MANIFEST);
  console.log(`${NAME} down: files restored.`);
}

const direction = process.argv[2];
if (direction === "up") up();
else if (direction === "down") down();
else {
  console.error(`Usage: ${NAME}.ts up|down`);
  process.exit(1);
}
