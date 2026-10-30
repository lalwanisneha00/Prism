// Syllabus fix, admin correction (owner's decision, 2026-10-30): labs merged in migration 005 keep
// one shared experiment list, but every student sees their own branch handout's numbering.
//   1. Experiments that came in twice (same experiment, two wordings) keep one copy: the other is
//      hidden and its old links forward to the kept one.
//   2. Wrong 005 links are fixed: 005 matched similar names, so a branch copy could link two
//      experiments to one shared experiment (CHEM: R-L parallel → series; carpentry → fitting).
//   3. Every experiment of a merged lab gets `numbers`: branch → that branch's handout number,
//      read from the branch's own (hidden) copy through the aliases, so nothing is guessed.
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/012-merged-lab-numbers.ts up|down
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

const NAME = "012-merged-lab-numbers";
const CAUSE = `migration ${NAME} up (admin correction: per-branch lab numbering; owner 2026-10-30)`;
const HISTORY = "data/university/pdeu/history.jsonl";
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;
const AFTER = "data/university/pdeu/migrations/011-handout-recheck.json";
const ALIASES = "src/data/syllabus/aliases.json";

/** Same experiment, two wordings (checked by hand): `drop` came in from another branch's copy. */
const DUPLICATES = [
  {
    subject: "pdeu-engineering-chemistry-practical-ece",
    keep: "experiment-9-detection-of-biomolecule-detection-of-the-prese",
    drop: "experiment-9-detection-of-biomolecules",
  },
  {
    subject: "pdeu-modern-physics-laboratory-biotech",
    keep: "experiment-3-study-of-bio-savart-s-law",
    drop: "experiment-3-study-of-the-biot-savart-law-and-the-magnetic-f",
  },
];
/** Below this name overlap a re-link is not trusted: the script stops for a manual check. */
const MIN_OVERLAP = 0.3;

const nameWords = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );
/** Share of words two names have in common (0 to 1). */
function overlap(a: string, b: string): number {
  const wa = nameWords(a);
  const wb = nameWords(b);
  const both = [...wa].filter((w) => wb.has(w)).length;
  return both / (new Set([...wa, ...wb]).size || 1);
}

type Topic = { id: string; name: string; number?: number; status?: string; [k: string]: unknown };
type Subject = {
  id: string;
  courseType?: string;
  branches: string[];
  chapters: { id: string; topics: Topic[] }[];
  [k: string]: unknown;
};
type Aliases = {
  version: 1;
  subjects: Record<string, string>;
  chapters: Record<string, string>;
  topics: Record<string, string>;
};

const now = new Date().toISOString();
const readJson = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
const file = (id: string) => `src/data/subjects/${id}.json`;

function up(): void {
  if (existsSync(MANIFEST)) throw new Error(`${NAME} is already applied. Run "down" first.`);
  if (!existsSync(AFTER)) throw new Error(`Apply 011-handout-recheck first.`);
  const aliases = readJson<Aliases>(ALIASES);
  const mains = [...new Set(Object.values(aliases.subjects))]
    .map((id) => readJson<Subject>(file(id)))
    .filter((s) => s.courseType === "practical");
  const files = [ALIASES, ...mains.map((s) => file(s.id))];
  const copies = Object.fromEntries(files.map((f) => [f, readFileSync(f, "utf8")]));
  const history: HistoryEntry[] = [];
  const log = (subject: string, topic: string | undefined, field: string, a: unknown, b: unknown) =>
    history.push(
      historyEntry({
        actor: { kind: "admin", id: NAME },
        cause: CAUSE,
        target: topic ? { kind: "topic", subject, topic } : { kind: "subject", subject },
        field,
        oldValue: a ?? null,
        newValue: b ?? null,
        at: now,
      }),
    );

  // 2. Wrong links first, so the numbering below reads the right ones: when one branch copy
  // links two or more of its experiments to the same shared one (005 matched similar names),
  // each goes to the best-named shared experiment no other experiment of that copy claims.
  let relinked = 0;
  for (const main of mains) {
    const shown = main.chapters.flatMap((c) => c.topics).filter((t) => t.status !== "retired");
    for (const [copyId] of Object.entries(aliases.subjects).filter(([, to]) => to === main.id)) {
      const copy = readJson<Subject>(file(copyId));
      const linked = copy.chapters
        .flatMap((c) => c.topics)
        .map((t) => ({ t, key: `${copyId}/${t.id}`, to: aliases.topics[`${copyId}/${t.id}`] }))
        .filter((l) => l.to?.startsWith(`${main.id}/`));
      const count = new Map<string, number>();
      for (const l of linked) count.set(l.to, (count.get(l.to) ?? 0) + 1);
      const claimed = new Set(linked.filter((l) => count.get(l.to) === 1).map((l) => l.to));
      for (const l of linked.filter((x) => (count.get(x.to) ?? 0) > 1)) {
        const best = shown
          .filter((m) => !claimed.has(`${main.id}/${m.id}`))
          .map((m) => ({ m, score: overlap(l.t.name, m.name) }))
          .sort((a, b) => b.score - a.score)[0];
        if (!best || best.score < MIN_OVERLAP)
          throw new Error(`${l.key}: no clear shared experiment (best ${best?.score.toFixed(2)})`);
        const to = `${main.id}/${best.m.id}`;
        claimed.add(to);
        if (to === l.to) continue;
        log(copyId, l.t.id, "alias", l.to, to);
        aliases.topics[l.key] = to;
        relinked++;
      }
    }
  }

  // 1. One copy of each duplicate.
  for (const d of DUPLICATES) {
    const s = mains.find((m) => m.id === d.subject)!;
    const topics = s.chapters.flatMap((c) => c.topics);
    const keep = topics.find((t) => t.id === d.keep);
    const drop = topics.find((t) => t.id === d.drop);
    if (!keep || !drop) throw new Error(`${d.subject}: ${d.keep} or ${d.drop} not found`);
    drop.status = "retired";
    log(s.id, drop.id, "status", "active", "retired");
    const target = `${s.id}/${keep.id}`;
    aliases.topics[`${s.id}/${drop.id}`] = target;
    log(s.id, drop.id, "alias", null, target);
    for (const [k, v] of Object.entries(aliases.topics))
      if (v === `${s.id}/${drop.id}`) {
        aliases.topics[k] = target;
        log(k.split("/")[0], k.split("/")[1], "alias", v, target);
      }
  }

  // 3. Each branch's own numbers.
  for (const main of mains) {
    const shown = main.chapters.flatMap((c) => c.topics).filter((t) => t.status !== "retired");
    const byId = new Map(shown.map((t) => [t.id, t]));
    const numbers = new Map<Topic, Record<string, number>>();
    const set = (t: Topic, branch: string, n: number) => {
      const own = numbers.get(t) ?? {};
      if (own[branch] !== undefined && own[branch] !== n)
        throw new Error(`${main.id}/${t.id}: two numbers for ${branch}`);
      own[branch] = n;
      numbers.set(t, own);
    };
    const copyIds = Object.entries(aliases.subjects)
      .filter(([, to]) => to === main.id)
      .map(([from]) => from);
    const copyBranches = new Set<string>();
    for (const id of copyIds) {
      const copy = readJson<Subject>(file(id));
      copy.branches.forEach((b) => copyBranches.add(b));
      for (const t of copy.chapters.flatMap((c) => c.topics)) {
        const to = aliases.topics[`${id}/${t.id}`];
        const target = to?.startsWith(`${main.id}/`)
          ? byId.get(to.slice(main.id.length + 1))
          : null;
        if (!target || !t.number) continue;
        for (const b of copy.branches) set(target, b, t.number);
      }
    }
    // The main copy's own branches: its own experiments (not the ones that came in with 005).
    const own = main.branches.filter((b) => !copyBranches.has(b));
    for (const t of shown) {
      const from = (t.movedFrom as { subject?: string } | undefined)?.subject;
      if (t.number && (!from || from === main.id)) for (const b of own) set(t, b, t.number);
    }
    for (const t of shown) {
      const n = numbers.get(t);
      if (!n) continue;
      const sorted = Object.fromEntries(Object.entries(n).sort(([a], [b]) => a.localeCompare(b)));
      log(main.id, t.id, "numbers", t.numbers ?? null, sorted);
      t.numbers = sorted;
    }
  }

  for (const main of mains) writeFileSync(file(main.id), json(main));
  writeFileSync(ALIASES, json(aliases));
  writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
  writeFileSync(MANIFEST, json({ appliedAt: now, modified: files, copies }));
  console.log(
    `${NAME} up: ${mains.length} merged labs numbered per branch, ${DUPLICATES.length} duplicates hidden, ${relinked} wrong links fixed, ${history.length} history entries.`,
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
    field: "merged lab numbering",
    oldValue: "per branch",
    newValue: "one numbering",
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
