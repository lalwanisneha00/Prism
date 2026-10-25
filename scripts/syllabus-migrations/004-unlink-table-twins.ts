// Syllabus fix, Phase 2 follow-up (owner's decision, 2026-10-25): where a branch listed two copies
// of one course, one matched by its 2024 handout and one kept only because the old course table
// still names it, the table-only copy is unlinked from that branch. Plus ME's old-scheme
// first-year courses whose handbook entries Phase 2 already retired (approved there) but which
// were still listed in My subjects. Soft: an offering is removed (or a course with no other
// branch is retired) and its handbook entry is marked retired; ids and progress stay findable.
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/004-unlink-table-twins.ts up|down
//
// "up" tags the current commit (pre-syllabus-004) and records the files it writes in
// data/university/pdeu/migrations/004-unlink-table-twins.json; "down" restores them from the tag.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
  type HistoryEntry,
} from "../../src/lib/syllabusFix/history";

const NAME = "004-unlink-table-twins";
const CAUSE = `migration ${NAME} up (course-table-only twins, owner 2026-10-25)`;
const TAG = "pre-syllabus-004";
const HISTORY = "data/university/pdeu/history.jsonl";
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;

/** [subject, branch, semester, kept twin or reason] */
const UNLINK: [string, string, number, string][] = [
  ["pdeu-environment-science-ce-ece", "ece", 1, "twin of pdeu-environmental-science-biotech"],
  [
    "pdeu-introduction-to-electrical-engineering",
    "ece",
    2,
    "twin of pdeu-elements-of-electrical-and-electronics-engineering-biotech",
  ],
  [
    "pdeu-computer-and-communication-networks",
    "ece",
    6,
    "twin of pdeu-computer-communication-and-networking",
  ],
  ["pdeu-environment-science-civil", "civil", 1, "twin of pdeu-environmental-science-biotech"],
  [
    "pdeu-introduction-to-electrical-engineering",
    "civil",
    2,
    "twin of pdeu-elements-of-electrical-and-electronics-engineering-biotech",
  ],
  ["pdeu-engineering-graphics-me", "me", 1, "twin of pdeu-engineering-graphics-ce-petro"],
  // ME old-scheme leftovers: handbook entry already retired in Phase 2, course still listed.
  ["pdeu-environmental-studies", "me", 1, "old scheme; handbook entry retired in Phase 2"],
  ["pdeu-communication-skills-theory", "me", 2, "old scheme; handbook entry retired in Phase 2"],
  [
    "pdeu-professional-ethics-and-human-values",
    "me",
    2,
    "old scheme; handbook entry retired in Phase 2",
  ],
];

type Offering = { branch: string; semester: number; key: string; [k: string]: unknown };
type Subject = {
  id: string;
  status?: string;
  branches: string[];
  semesters: number[];
  offerings?: Offering[];
  [k: string]: unknown;
};
type HbCourse = { key: string; retired?: boolean; options?: HbCourse[]; [k: string]: unknown };

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
const readJson = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;

function up(): void {
  if (existsSync(MANIFEST)) throw new Error(`${NAME} is already applied. Run "down" first.`);
  const dirty = execFileSync("git", ["status", "--porcelain", "--", "src/data", HISTORY], {
    encoding: "utf8",
  });
  if (dirty.trim()) throw new Error(`Uncommitted syllabus data changes:\n${dirty}`);
  if (!execFileSync("git", ["tag", "--list", TAG], { encoding: "utf8" }).trim())
    execFileSync("git", ["tag", TAG]);

  const subjects = new Map<string, Subject>();
  const handbooks = new Map<string, { subjects: HbCourse[] }>();
  const modified = new Set<string>();
  for (const [id, branch, semester, why] of UNLINK) {
    const file = `src/data/subjects/${id}.json`;
    const s = subjects.get(id) ?? readJson<Subject>(file);
    subjects.set(id, s);
    const offerings = s.offerings ?? [];
    const mine = offerings.find((o) => o.branch === branch && o.semester === semester);
    if (!mine) throw new Error(`${id} is not offered to ${branch} sem ${semester}`);
    if (offerings.length > 1) {
      s.offerings = offerings.filter((o) => o !== mine);
      s.branches = [...new Set(s.offerings.map((o) => o.branch))];
      s.semesters = [...new Set(s.offerings.map((o) => o.semester))].sort((a, b) => a - b);
      log({ kind: "subject", subject: id }, `offering ${branch}`, mine, null);
    } else {
      log({ kind: "subject", subject: id }, "status", s.status ?? "active", "retired");
      s.status = "retired";
    }
    modified.add(file);
    const hbFile = `src/data/pdeu/${branch}.json`;
    if (existsSync(hbFile)) {
      const hb = handbooks.get(branch) ?? readJson<{ subjects: HbCourse[] }>(hbFile);
      handbooks.set(branch, hb);
      const entry = hb.subjects
        .flatMap((c) => [c, ...(c.options ?? [])])
        .find((c) => c.key === mine.key);
      if (entry && !entry.retired) {
        entry.retired = true;
        modified.add(hbFile);
        log(
          { kind: "branch", subject: id },
          `handbook ${branch}/${mine.key} retired (${why})`,
          false,
          true,
        );
      }
    }
  }
  for (const s of subjects.values())
    writeFileSync(`src/data/subjects/${s.id}.json`, `${JSON.stringify(s, null, 2)}\n`);
  for (const [b, hb] of handbooks)
    if (modified.has(`src/data/pdeu/${b}.json`))
      writeFileSync(`src/data/pdeu/${b}.json`, `${JSON.stringify(hb, null, 2)}\n`);
  writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
  writeFileSync(
    MANIFEST,
    `${JSON.stringify({ appliedAt: now, gitTag: TAG, modified: [...modified].sort(), unlinked: UNLINK }, null, 2)}\n`,
  );
  console.log(
    `${NAME} up: ${UNLINK.length} unlinks, ${modified.size} files, ${history.length} history entries.`,
  );
}

function down(): void {
  if (!existsSync(MANIFEST)) throw new Error(`${NAME} is not applied.`);
  const m = readJson<{ gitTag: string; modified: string[] }>(MANIFEST);
  execFileSync("git", ["checkout", m.gitTag, "--", ...m.modified]);
  const { entries } = parseHistory(readFileSync(HISTORY, "utf8"));
  const undo = historyEntry({
    actor: { kind: "script", id: NAME },
    cause: `migration ${NAME} down`,
    target: { kind: "catalogue" },
    field: "course-table-only twins",
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
