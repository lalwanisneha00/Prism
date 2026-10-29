// Syllabus fix, Phase 8: re-check every course against its handout after the Phase 2 import
// (the Mechanical bug: topics listed under the wrong chapter). Rearrange only, ids unchanged:
// a visible topic the handout puts in another unit moves to that unit's chapter; a hidden topic
// that the handout lists and no visible topic covers is shown again. Rules and tests:
// src/lib/syllabusFix/handoutRecheck.ts. Writes handouts/_parsed/RECHECK_REPORT.md.
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/011-handout-recheck.ts dry-run|up|down
//
// "up" keeps copies of the files it writes in its manifest; "down" puts them back.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { ParsedUnit } from "../../src/lib/syllabusFix/handoutCourse";
import {
  applyRecheck,
  planRecheck,
  type RecheckChapter,
  type RecheckFix,
} from "../../src/lib/syllabusFix/handoutRecheck";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
  type HistoryEntry,
} from "../../src/lib/syllabusFix/history";
import { markStale, StaleTopicsSchema } from "../../src/lib/syllabusFix/stale";

const NAME = "011-handout-recheck";
const CAUSE = `migration ${NAME} up (Phase 8 re-check against the 2024-25 handouts)`;
const HISTORY = "data/university/pdeu/history.jsonl";
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;
const AFTER = "data/university/pdeu/migrations/010-engineering-graphics-parts.json";
const PLAN = "handouts/_parsed/rearrange-plan.json";
const REPORT = "handouts/_parsed/RECHECK_REPORT.md";
const STALE = "src/data/syllabus/stale-topics.json";
const FOLDER: Record<string, string> = {
  ce: "COMP",
  ict: "ICT",
  ece: "ECE",
  me: "MECH",
  civil: "CIVIL",
  petro: "PETRO",
  biotech: "BIOTECH",
  elec: "ELEC",
  chem: "CHEM",
};

type Topic = RecheckChapter["topics"][number] & {
  movedFrom?: { subject: string; chapter?: string; at: string };
  formerChapters?: string[];
};
type Subject = { id: string; name: string; status?: string; chapters: RecheckChapter[] };
type Matched = { branch: string; sem: number; title: string; subject: string };
type ParsedCourse = { title: string; units: ParsedUnit[] };

const now = new Date().toISOString();
const readJson = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
const subjectFile = (id: string) => `src/data/subjects/${id}.json`;

/** Every theory course with the units of each handout matched to it (Phase 2's match list). */
function courses(): { subject: Subject; units: ParsedUnit[][]; from: string[] }[] {
  const byId = new Map<string, { units: ParsedUnit[][]; from: string[] }>();
  for (const m of readJson<{ matched: Matched[] }>(PLAN).matched) {
    const file = `handouts/_parsed/${FOLDER[m.branch]}/sem${m.sem}.json`;
    if (!existsSync(file) || !existsSync(subjectFile(m.subject))) continue;
    const course = readJson<{ courses: ParsedCourse[] }>(file).courses.find(
      (c) => c.title === m.title,
    );
    if (!course || course.units.length === 0) continue;
    const entry = byId.get(m.subject) ?? { units: [], from: [] };
    entry.units.push(course.units);
    entry.from.push(`${m.branch} sem ${m.sem}`);
    byId.set(m.subject, entry);
  }
  return [...byId.entries()]
    .map(([id, e]) => ({ subject: readJson<Subject>(subjectFile(id)), ...e }))
    .filter((c) => c.subject.status !== "retired")
    .sort((a, b) => a.subject.id.localeCompare(b.subject.id));
}

function plan() {
  return courses()
    .map((c) => ({ ...c, fixes: planRecheck(c.subject.chapters, c.units) }))
    .filter((c) => c.fixes.length > 0);
}

function report(planned: ReturnType<typeof plan>, applied: boolean): string {
  const chapterName = (s: Subject, id: string) => s.chapters.find((c) => c.id === id)?.name ?? id;
  const all = planned.flatMap((p) => p.fixes);
  const L = [
    "# Handout re-check (Phase 8)",
    "",
    `Made by \`scripts/syllabus-migrations/${NAME}.ts\` on ${now.slice(0, 10)}. ${applied ? "**Applied.** Undo with `down`." : "**Dry run: nothing changed.**"}`,
    "",
    "Each course was compared with its handout again after the Phase 2 import. Only clear cases are fixed: a topic the handout puts in another unit moves to that unit's chapter (the chapter holding most of the unit's topics), or is hidden when that chapter already lists it, and a hidden topic the handout lists, with no visible topic covering it, is shown again. Ids never change; moved topics are marked stale so their lessons refresh when next opened.",
    "",
    `**${count(all, "move")} topics moved, ${count(all, "hide")} second copies hidden, ${count(all, "unhide")} shown again, in ${planned.length} courses.**`,
    "",
  ];
  for (const p of planned) {
    L.push(`## ${p.subject.name} (\`${p.subject.id}\`, ${p.from.join(", ")})`, "");
    for (const f of p.fixes) L.push(`- ${line(f, (id) => chapterName(p.subject, id))}`);
    L.push("");
  }
  return L.join("\n");
}

function line(f: RecheckFix, name: (id: string) => string): string {
  if (f.kind === "move")
    return `Moved "${f.name}" from "${name(f.from)}" to "${name(f.to)}" (handout unit "${f.unit}")`;
  if (f.kind === "hide")
    return `Hidden: "${f.name}" in "${name(f.from)}", a second copy (the chapter for handout unit "${f.unit}" already lists it)`;
  return `Shown again: "${f.name}" in "${name(f.to)}" (handout unit "${f.unit}"${f.from !== f.to ? `; was in hidden chapter "${name(f.from)}"` : ""})`;
}

const count = (fixes: readonly RecheckFix[], kind: RecheckFix["kind"]) =>
  fixes.filter((f) => f.kind === kind).length;

function dryRun(): void {
  const planned = plan();
  writeFileSync(REPORT, report(planned, false));
  const all = planned.flatMap((p) => p.fixes);
  console.log(
    `${NAME} dry run: ${count(all, "move")} moves, ${count(all, "hide")} hidden, ${count(all, "unhide")} shown again, ${planned.length} courses. See ${REPORT}.`,
  );
}

function up(): void {
  if (existsSync(MANIFEST)) throw new Error(`${NAME} is already applied. Run "down" first.`);
  if (!existsSync(AFTER)) throw new Error(`Apply 010-engineering-graphics-parts first.`);
  const planned = plan();
  const files = [...planned.map((p) => subjectFile(p.subject.id)), STALE, REPORT];
  const copies = Object.fromEntries(
    files.filter((f) => existsSync(f)).map((f) => [f, readFileSync(f, "utf8")]),
  );
  const history: HistoryEntry[] = [];
  const stale: { subject: string; topic: string }[] = [];

  for (const { subject: s, fixes, units } of planned) {
    s.chapters = applyRecheck(s.chapters, fixes, units, (t: Topic, from) => {
      const former = t.movedFrom?.subject === s.id ? t.movedFrom.chapter : undefined;
      return {
        movedFrom: { subject: s.id, chapter: from, at: now },
        ...(former && former !== from
          ? { formerChapters: [...new Set([...(t.formerChapters ?? []), former])] }
          : {}),
      };
    });
    for (const f of fixes) {
      const target = { kind: "topic" as const, subject: s.id, chapter: f.to, topic: f.topic };
      const entry = (field: string, oldValue: unknown, newValue: unknown) =>
        history.push(
          historyEntry({
            actor: { kind: "script", id: NAME },
            cause: CAUSE,
            target,
            field,
            oldValue,
            newValue,
            at: now,
          }),
        );
      if (f.kind === "unhide") entry("status", "retired", "active");
      if (f.kind === "hide") entry("status", "active", "retired");
      if (f.from !== f.to) entry("chapter", f.from, f.to);
      stale.push({ subject: s.id, topic: f.topic });
    }
    writeFileSync(subjectFile(s.id), json(s));
  }

  writeFileSync(STALE, json(markStale(StaleTopicsSchema.parse(readJson(STALE)), stale, now)));
  writeFileSync(REPORT, report(planned, true));
  writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
  writeFileSync(MANIFEST, json({ appliedAt: now, modified: files, copies }));
  console.log(
    `${NAME} up: ${stale.length} topics fixed in ${planned.length} courses, ${history.length} history entries. Run prettier on the data next.`,
  );
}

function down(): void {
  if (!existsSync(MANIFEST)) throw new Error(`${NAME} is not applied.`);
  const m = readJson<{ copies: Record<string, string> }>(MANIFEST);
  for (const [f, text] of Object.entries(m.copies)) writeFileSync(f, text);
  const { entries } = parseHistory(readFileSync(HISTORY, "utf8"));
  const undo = historyEntry({
    actor: { kind: "script", id: NAME },
    cause: `migration ${NAME} down`,
    target: { kind: "catalogue" },
    field: "handout re-check",
    oldValue: "applied",
    newValue: "undone",
  });
  let all = entries;
  for (const e of entries.filter((x) => x.cause === CAUSE && !x.reverted))
    all = markReverted(all, e.id, undo.id);
  writeFileSync(HISTORY, formatHistory([...all, undo]));
  rmSync(MANIFEST);
  console.log(`${NAME} down: files restored.`);
}

const direction = process.argv[2];
if (direction === "dry-run") dryRun();
else if (direction === "up") up();
else if (direction === "down") down();
else {
  console.error(`Usage: ${NAME}.ts dry-run|up|down`);
  process.exit(1);
}
