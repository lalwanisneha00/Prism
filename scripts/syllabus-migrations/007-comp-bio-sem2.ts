// Syllabus fix, admin correction before Phase 4 (owner's decision, 2026-10-25): COMP takes
// Biological Systems for Engineers (24BT101T) in semester 2. This answers the open question 005
// left (it unlinked the course from COMP sem 1 and marked it unverified only because its
// semester was unknown). Rearrange only: the COMP offering comes back for semester 2, the retired
// handbook row `ce/s2-biological-systems-for-engineers` returns as semester 2 (the credit table
// adds up with it there), and the course, chapters and topics are verified again. Ids unchanged;
// Chemical's own copy is not touched.
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/007-comp-bio-sem2.ts up|down
//
// Runs on top of 005 and 006 (uncommitted when this was written), so "down" restores the two
// files from the copies saved in the manifest instead of from a git tag.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
  type HistoryEntry,
} from "../../src/lib/syllabusFix/history";

const NAME = "007-comp-bio-sem2";
const CAUSE = `migration ${NAME} up (admin correction: admin_handout, verified; owner 2026-10-25)`;
const HISTORY = "data/university/pdeu/history.jsonl";
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;
const AFTER = "data/university/pdeu/migrations/005-merge-first-year.json";
const SUBJECT = "pdeu-biological-systems-for-engineers";
const SUBJECT_FILE = `src/data/subjects/${SUBJECT}.json`;
const HANDBOOK = "src/data/pdeu/ce.json";
const SUBJECT_MAP = "src/data/pdeu/subject-map.json";
const BRANCH = "ce";
const KEY = "s2-biological-systems-for-engineers";
const SEMESTER = 2;

type Meta = { source?: string; confidence?: string };
type Topic = Meta & { id: string; [k: string]: unknown };
type Chapter = Meta & { id: string; topics: Topic[]; [k: string]: unknown };
type Offering = { branch: string; semester: number; key: string; [k: string]: unknown };
type Subject = Meta & {
  id: string;
  status?: string;
  branches: string[];
  semesters: number[];
  offerings?: Offering[];
  chapters: Chapter[];
  [k: string]: unknown;
};
type HbCourse = {
  key: string;
  code?: string;
  category: string;
  ltp?: string;
  credits: number;
  semester: number;
  core: boolean;
  retired?: boolean;
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
  if (!existsSync(AFTER)) throw new Error(`Apply 005-merge-first-year first.`);
  const s = readJson<Subject>(SUBJECT_FILE);
  const hb = readJson<{ subjects: HbCourse[] }>(HANDBOOK);
  const map = readJson<Record<string, string>>(SUBJECT_MAP);
  const before = { subject: structuredClone(s), row: undefined as HbCourse | undefined };
  if (s.status === "retired") throw new Error(`${SUBJECT} is retired`);
  if (s.offerings?.some((o) => o.branch === BRANCH))
    throw new Error(`${SUBJECT} already has a ${BRANCH} offering`);
  const row = hb.subjects.find((c) => c.key === KEY);
  if (!row) throw new Error(`${HANDBOOK} has no row ${KEY}`);
  if (map[`${BRANCH}/${KEY}`] !== SUBJECT)
    throw new Error(`subject-map ${BRANCH}/${KEY} does not point at ${SUBJECT}`);
  before.row = structuredClone(row);

  // The handbook row comes back in semester 2.
  if (row.retired) {
    delete row.retired;
    log({ kind: "branch", subject: SUBJECT }, `handbook ${BRANCH}/${KEY} retired`, true, false);
  }
  if (row.semester !== SEMESTER) {
    log(
      { kind: "branch", subject: SUBJECT },
      `handbook ${BRANCH}/${KEY} semester`,
      row.semester,
      SEMESTER,
    );
    row.semester = SEMESTER;
  }

  // The COMP offering, from the row.
  const o: Offering = {
    branch: BRANCH,
    key: KEY,
    code: row.code,
    category: row.category,
    ltp: row.ltp,
    credits: row.credits,
    semester: SEMESTER,
    kind: row.core ? "core" : "non-core",
  };
  s.offerings = [...(s.offerings ?? []), o];
  log({ kind: "subject", subject: SUBJECT }, `offering ${BRANCH}`, null, o);
  const oldSems = s.semesters;
  s.branches = [...new Set(s.offerings.map((x) => x.branch))];
  s.semesters = [...new Set(s.offerings.map((x) => x.semester))].sort((a, b) => a - b);
  log({ kind: "subject", subject: SUBJECT }, "semesters", oldSems, s.semesters);

  // Verified again: 005 marked it unverified only because the semester was unknown.
  const verify = (node: Meta, target: HistoryEntry["target"]) => {
    if (node.confidence === "verified") return;
    log(target, "confidence", node.confidence ?? null, "verified");
    node.confidence = "verified";
  };
  if (s.source !== "admin_handout") {
    log({ kind: "subject", subject: SUBJECT }, "source", s.source ?? null, "admin_handout");
    s.source = "admin_handout";
  }
  verify(s, { kind: "subject", subject: SUBJECT });
  for (const c of s.chapters) {
    if (c.confidence) verify(c, { kind: "chapter", subject: SUBJECT, chapter: c.id });
    for (const t of c.topics)
      if (t.confidence) verify(t, { kind: "topic", subject: SUBJECT, chapter: c.id, topic: t.id });
  }

  writeFileSync(SUBJECT_FILE, json(s));
  writeFileSync(HANDBOOK, json(hb));
  writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
  writeFileSync(
    MANIFEST,
    json({ appliedAt: now, modified: [HANDBOOK, SUBJECT_FILE], semester: SEMESTER, before }),
  );
  console.log(`${NAME} up: ${SUBJECT} in COMP sem ${SEMESTER}, ${history.length} history entries.`);
}

function down(): void {
  if (!existsSync(MANIFEST)) throw new Error(`${NAME} is not applied.`);
  const m = readJson<{ before: { subject: Subject; row: HbCourse } }>(MANIFEST);
  const hb = readJson<{ subjects: HbCourse[] }>(HANDBOOK);
  const i = hb.subjects.findIndex((c) => c.key === KEY);
  if (i < 0) throw new Error(`${HANDBOOK} has no row ${KEY}`);
  hb.subjects[i] = m.before.row;
  writeFileSync(HANDBOOK, json(hb));
  writeFileSync(SUBJECT_FILE, json(m.before.subject));
  const { entries } = parseHistory(readFileSync(HISTORY, "utf8"));
  const undo = historyEntry({
    actor: { kind: "admin", id: NAME },
    cause: `migration ${NAME} down`,
    target: { kind: "catalogue" },
    field: "COMP Biological Systems for Engineers semester",
    oldValue: SEMESTER,
    newValue: null,
  });
  let all = entries;
  for (const e of entries.filter((x) => x.cause === CAUSE && !x.reverted))
    all = markReverted(all, e.id, undo.id);
  writeFileSync(HISTORY, formatHistory([...all, undo]));
  rmSync(MANIFEST);
  console.log(`${NAME} down: ${SUBJECT} unlinked from COMP again.`);
}

const direction = process.argv[2];
if (direction === "up") up();
else if (direction === "down") down();
else {
  console.error(`Usage: ${NAME}.ts up|down`);
  process.exit(1);
}
