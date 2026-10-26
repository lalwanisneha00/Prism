// Syllabus fix, admin correction (owner's decision, 2026-10-27): Engineering Graphics has two
// parts, the drawing laboratory (experiments 1 to 4) and the CAD laboratory (5 to 9). Rearrange
// only: its one chapter keeps its id and becomes "Drawing Laboratory"; experiments 5 to 9 move to
// a new chapter "CAD Laboratory" (topic ids unchanged, `movedFrom` kept, marked stale).
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/010-engineering-graphics-parts.ts up|down
//
// "up" keeps copies of the files it writes in its manifest; "down" puts them back.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
  type HistoryEntry,
} from "../../src/lib/syllabusFix/history";
import { markStale, StaleTopicsSchema } from "../../src/lib/syllabusFix/stale";

const NAME = "010-engineering-graphics-parts";
const CAUSE = `migration ${NAME} up (admin correction: admin_handout, verified; owner 2026-10-27)`;
const HISTORY = "data/university/pdeu/history.jsonl";
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;
const AFTER = "data/university/pdeu/migrations/009-engineering-graphics-lab.json";
const SUBJECT = "pdeu-engineering-graphics-ce-petro";
const SUBJECT_FILE = `src/data/subjects/${SUBJECT}.json`;
const STALE = "src/data/syllabus/stale-topics.json";
const FILES = [SUBJECT_FILE, STALE];
const DRAWING = { id: "engineering-graphics", name: "Drawing Laboratory" };
const CAD = { id: "cad-laboratory", name: "CAD Laboratory" };
/** Experiments from this number on are the CAD laboratory. */
const FIRST_CAD = 5;

type Topic = { id: string; name: string; number?: number; [k: string]: unknown };
type Chapter = { id: string; name: string; topics: Topic[]; [k: string]: unknown };
type Subject = { id: string; chapters: Chapter[]; [k: string]: unknown };

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
  if (!existsSync(AFTER)) throw new Error(`Apply 009-engineering-graphics-lab first.`);
  const copies = Object.fromEntries(FILES.map((f) => [f, readFileSync(f, "utf8")]));

  const s = readJson<Subject>(SUBJECT_FILE);
  if (s.chapters.length !== 1 || s.chapters[0].id !== DRAWING.id)
    throw new Error(`${SUBJECT} does not have its one chapter ${DRAWING.id}`);
  const drawing = s.chapters[0];
  const cad = drawing.topics.filter((t) => (t.number ?? 0) >= FIRST_CAD);
  if (cad.length === 0) throw new Error(`${SUBJECT} has no experiments from ${FIRST_CAD} on`);

  log(
    { kind: "chapter", subject: SUBJECT, chapter: DRAWING.id },
    "name",
    drawing.name,
    DRAWING.name,
  );
  drawing.name = DRAWING.name;
  drawing.topics = drawing.topics.filter((t) => !cad.includes(t));
  for (const t of cad) {
    t.movedFrom = { subject: SUBJECT, chapter: DRAWING.id, at: now };
    log(
      { kind: "topic", subject: SUBJECT, chapter: CAD.id, topic: t.id },
      "chapter",
      DRAWING.id,
      CAD.id,
    );
  }
  s.chapters.push({
    id: CAD.id,
    name: CAD.name,
    topics: cad,
    source: "admin_handout",
    confidence: "verified",
  });
  log({ kind: "chapter", subject: SUBJECT, chapter: CAD.id }, "chapter", null, CAD.name);
  writeFileSync(SUBJECT_FILE, json(s));

  const stale = markStale(
    StaleTopicsSchema.parse(readJson(STALE)),
    cad.map((t) => ({ subject: SUBJECT, topic: t.id })),
    now,
  );
  writeFileSync(STALE, json(stale));

  writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
  writeFileSync(MANIFEST, json({ appliedAt: now, modified: FILES, copies }));
  console.log(
    `${NAME} up: ${SUBJECT} split into Drawing (${drawing.topics.length}) and CAD (${cad.length}) laboratories, ${history.length} history entries.`,
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
    target: { kind: "subject", subject: SUBJECT },
    field: "Engineering Graphics parts",
    oldValue: "Drawing Laboratory + CAD Laboratory",
    newValue: "one chapter",
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
