// Syllabus fix, admin correction after Phase 4B (owner's decision, 2026-10-26): COMP takes
// Workshop Practice (24ME101T) in semester 2, not semester 1. Rearrange only: the COMP offering
// of the shared course and COMP's handbook row move to semester 2 in place, so every id and key
// stays; the other branches are not touched.
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/008-comp-workshop-sem2.ts up|down
//
// Like 006: "down" reverses the move field by field.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
  type HistoryEntry,
} from "../../src/lib/syllabusFix/history";

const NAME = "008-comp-workshop-sem2";
const CAUSE = `migration ${NAME} up (admin correction: admin_handout, verified; owner 2026-10-26)`;
const HISTORY = "data/university/pdeu/history.jsonl";
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;
const AFTER = "data/university/pdeu/migrations/007-comp-bio-sem2.json";
const SUBJECT = "pdeu-workshop-practice-ece";
const SUBJECT_FILE = `src/data/subjects/${SUBJECT}.json`;
const HANDBOOK = "src/data/pdeu/ce.json";
const BRANCH = "ce";
const KEY = "s1-workshop-practices";
const NOTE = "COMP takes this course in semester 2 (admin correction, owner 2026-10-26).";

type Offering = { branch: string; semester: number; key: string; [k: string]: unknown };
type Subject = {
  id: string;
  semesters: number[];
  offerings?: Offering[];
  source?: string;
  confidence?: string;
  [k: string]: unknown;
};
type HbCourse = { key: string; semester: number; notes?: string[]; [k: string]: unknown };

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

/** Moves COMP's offering and handbook row between semesters; returns what it changed. */
function move(from: number, to: number, write: (s: Subject, hb: { subjects: HbCourse[] }) => void) {
  const s = readJson<Subject>(SUBJECT_FILE);
  const hb = readJson<{ subjects: HbCourse[] }>(HANDBOOK);
  const offering = s.offerings?.find((o) => o.branch === BRANCH && o.key === KEY);
  const row = hb.subjects.find((c) => c.key === KEY);
  if (!offering || offering.semester !== from)
    throw new Error(`${SUBJECT} has no ${BRANCH} offering ${KEY} in semester ${from}`);
  if (!row || row.semester !== from)
    throw new Error(`${HANDBOOK} row ${KEY} is not semester ${from}`);
  offering.semester = to;
  row.semester = to;
  const oldSems = s.semesters;
  s.semesters = [...new Set(s.offerings!.map((o) => o.semester))].sort((a, b) => a - b);
  write(s, hb);
  writeFileSync(SUBJECT_FILE, json(s));
  writeFileSync(HANDBOOK, json(hb));
  return { oldSems, newSems: s.semesters };
}

function up(): void {
  if (existsSync(MANIFEST)) throw new Error(`${NAME} is already applied. Run "down" first.`);
  if (!existsSync(AFTER)) throw new Error(`Apply 007-comp-bio-sem2 first.`);
  const before: Record<string, unknown> = {};
  const { oldSems, newSems } = move(1, 2, (s, hb) => {
    before.source = s.source ?? null;
    before.confidence = s.confidence ?? null;
    s.source = "admin_handout";
    s.confidence = "verified";
    const row = hb.subjects.find((c) => c.key === KEY)!;
    row.notes = [...(row.notes ?? []), NOTE];
  });
  log({ kind: "subject", subject: SUBJECT }, `offering ${BRANCH}/${KEY} semester`, 1, 2);
  log({ kind: "branch", subject: SUBJECT }, `handbook ${BRANCH}/${KEY} semester`, 1, 2);
  if (oldSems.join() !== newSems.join())
    log({ kind: "subject", subject: SUBJECT }, "semesters", oldSems, newSems);
  if (before.source !== "admin_handout")
    log({ kind: "subject", subject: SUBJECT }, "source", before.source, "admin_handout");
  if (before.confidence !== "verified")
    log({ kind: "subject", subject: SUBJECT }, "confidence", before.confidence, "verified");
  writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
  writeFileSync(
    MANIFEST,
    json({ appliedAt: now, modified: [HANDBOOK, SUBJECT_FILE], before, moved: { from: 1, to: 2 } }),
  );
  console.log(`${NAME} up: ${SUBJECT} moved to COMP sem 2, ${history.length} history entries.`);
}

function down(): void {
  if (!existsSync(MANIFEST)) throw new Error(`${NAME} is not applied.`);
  const m = readJson<{ before: { source: string | null; confidence: string | null } }>(MANIFEST);
  move(2, 1, (s, hb) => {
    if (m.before.source === null) delete s.source;
    else s.source = m.before.source;
    if (m.before.confidence === null) delete s.confidence;
    else s.confidence = m.before.confidence;
    const row = hb.subjects.find((c) => c.key === KEY)!;
    row.notes = (row.notes ?? []).filter((n) => n !== NOTE);
    if (row.notes.length === 0) delete row.notes;
  });
  const { entries } = parseHistory(readFileSync(HISTORY, "utf8"));
  const undo = historyEntry({
    actor: { kind: "admin", id: NAME },
    cause: `migration ${NAME} down`,
    target: { kind: "catalogue" },
    field: "COMP Workshop Practice semester",
    oldValue: 2,
    newValue: 1,
  });
  let all = entries;
  for (const e of entries.filter((x) => x.cause === CAUSE && !x.reverted))
    all = markReverted(all, e.id, undo.id);
  writeFileSync(HISTORY, formatHistory([...all, undo]));
  rmSync(MANIFEST);
  console.log(`${NAME} down: ${SUBJECT} back in COMP sem 1.`);
}

const direction = process.argv[2];
if (direction === "up") up();
else if (direction === "down") down();
else {
  console.error(`Usage: ${NAME}.ts up|down`);
  process.exit(1);
}
