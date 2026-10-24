// Syllabus fix, Phase 1 migration: marks every PDEU course as it is today (from the old merged
// handbook): source "official_site", confidence "unverified", status "active", no votes.
// Chapters and topics inherit these from their course (src/lib/syllabusFix/tree.ts), so they get
// no fields of their own. Additive and reversible:
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/001-tree-fields.ts up
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/001-tree-fields.ts down
//
// "down" removes only values this migration wrote; a course changed later (e.g. by the Phase 2
// import) keeps its fields and is listed. Each run is recorded in data/university/pdeu/history.jsonl.
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
} from "../../src/lib/syllabusFix/history";

const NAME = "001-tree-fields";
const DIR = "src/data/subjects";
const HISTORY = "data/university/pdeu/history.jsonl";
const VALUES = {
  source: "official_site",
  confidence: "unverified",
  status: "active",
  verifiedByCount: 0,
} as const;
const KEYS = Object.keys(VALUES) as (keyof typeof VALUES)[];

type SubjectFile = Record<string, unknown> & { id: string; university?: string };

const direction = process.argv[2];
if (direction !== "up" && direction !== "down") {
  console.error("Usage: 001-tree-fields.ts up|down");
  process.exit(1);
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && !f.endsWith("-sources.json"));
let changed = 0;
const kept: string[] = [];

for (const f of files) {
  const path = join(DIR, f);
  const subject = JSON.parse(readFileSync(path, "utf8")) as SubjectFile;
  if (subject.university !== "pdeu") continue;
  let next: SubjectFile;
  if (direction === "up") {
    if (KEYS.every((k) => k in subject)) continue;
    // Insert just before "chapters" so the course facts stay together at the top of the file.
    const { chapters, ...rest } = subject;
    next = { ...rest, ...VALUES, ...pick(rest), chapters } as SubjectFile;
  } else {
    if (!KEYS.some((k) => k in subject)) continue;
    const different = KEYS.filter((k) => k in subject && subject[k] !== VALUES[k]);
    if (different.length) {
      kept.push(`${subject.id} (${different.join(", ")})`);
      continue;
    }
    next = Object.fromEntries(
      Object.entries(subject).filter(([k]) => !(KEYS as string[]).includes(k)),
    ) as SubjectFile;
  }
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
  changed++;
}

/** Fields already set on a course win over the migration's values (an "up" never overwrites). */
function pick(rest: Record<string, unknown>) {
  return Object.fromEntries(KEYS.filter((k) => k in rest).map((k) => [k, rest[k]]));
}

const text = existsSync(HISTORY) ? readFileSync(HISTORY, "utf8") : "";
const { entries, problems } = parseHistory(text);
if (problems.length) {
  console.error(`${HISTORY} has problems, not recording this run:\n${problems.join("\n")}`);
  process.exit(1);
}
if (direction === "up") {
  if (changed > 0) {
    const entry = historyEntry({
      actor: { kind: "script", id: NAME },
      cause: `migration ${NAME} up`,
      target: { kind: "catalogue" },
      field: "source, confidence, status, verifiedByCount",
      oldValue: null,
      newValue: { ...VALUES, subjects: changed },
    });
    appendFileSync(HISTORY, formatHistory([entry]));
  }
} else if (changed > 0) {
  const ups = entries.filter((e) => e.cause === `migration ${NAME} up` && !e.reverted);
  const undo = historyEntry({
    actor: { kind: "script", id: NAME },
    cause: `migration ${NAME} down`,
    target: { kind: "catalogue" },
    field: "source, confidence, status, verifiedByCount",
    oldValue: VALUES,
    newValue: null,
  });
  let all = [...entries];
  for (const u of ups) all = markReverted(all, u.id, undo.id);
  writeFileSync(HISTORY, formatHistory([...all, undo]));
}

console.log(`${NAME} ${direction}: ${changed} subject file(s) changed.`);
if (kept.length) console.log(`Kept (changed after this migration):\n  ${kept.join("\n  ")}`);
