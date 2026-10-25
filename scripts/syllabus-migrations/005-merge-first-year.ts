// Syllabus fix, admin corrections before Phase 4 (owner's requests, 2026-10-25). Rearrange only:
// every id stays, extra copies retire softly with an alias, nothing is re-imported.
//
//   1. Biological Systems for Engineers is unlinked from COMP sem 1 (its real semester is not
//      confirmed) and marked unverified. Other branches are not touched.
//   2. Merge the per-branch copies of first-year courses into one shared course. Non-core courses
//      (IKS, UHV, Environmental Science, ...) have one syllabus for every branch, so the same
//      course always merges. Core courses merge only with the same code or 80% topic overlap
//      (`mergeVerdict` in src/lib/syllabusFix/merge.ts). The most complete copy is the main one;
//      the others are retired with `movedTo` and listed in src/data/syllabus/aliases.json.
//   3. A first-year course-table row whose course code is already a Prism course gets an offering
//      for its branch and semester (the cause of IKS missing from COMP sem 1 search: Phase 2 only
//      linked courses the branch's own handout PDF printed).
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/005-merge-first-year.ts plan|up|down
//
// "plan" prints what would change. "up" tags the current commit (pre-syllabus-005) and records the
// files it writes in data/university/pdeu/migrations/005-merge-first-year.json; "down" restores them.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
  type HistoryEntry,
} from "../../src/lib/syllabusFix/history";
import {
  copyAliases,
  isRealCode,
  mergeVerdict,
  pickMain,
  plainCourseName,
  type CourseCopy,
  type MergeVerdict,
} from "../../src/lib/syllabusFix/merge";
import { nameSimilarity } from "../../src/lib/university/match";

const NAME = "005-merge-first-year";
const CAUSE = `migration ${NAME} up (admin correction: admin_handout, verified; owner 2026-10-25)`;
const TAG = "pre-syllabus-005";
const HISTORY = "data/university/pdeu/history.jsonl";
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;
const SUBJECTS = "src/data/subjects";
const SUBJECT_MAP = "src/data/pdeu/subject-map.json";
const ALIASES = "src/data/syllabus/aliases.json";
const HANDBOOK_BRANCHES = ["ce", "ict", "ece", "me", "civil", "petro", "biotech"];

const BIO = "pdeu-biological-systems-for-engineers";
/** Kept out of the merge: its semester for COMP is an open question (owner, 2026-10-25). */
const KEEP_APART = new Set([BIO, "pdeu-biological-systems-for-engineers-chem"]);
/**
 * Main copies whose name came from an old handbook, renamed to the 2024 handout title of their
 * code (handouts/_split/<BRANCH>/sem<N>/<CODE>_<title>.pdf). Every other main keeps its name.
 */
const HANDOUT_TITLE: Record<string, string> = {
  "pdeu-physics-ict": "Applied Physics", // 24PH101T
  "pdeu-chemistry-ece-civil": "Engineering Chemistry", // 24CH101T
  "pdeu-engineering-chemistry-practical-ece": "Engineering Chemistry Laboratory", // 24CH101P
  "pdeu-elements-of-electrical-and-electronics-engineering-lab-me":
    "Elements of Electrical and Electronics Engineering Laboratory", // 24EE101P
  "pdeu-introduction-to-computer-programming-2": "Computer Programming II (For ME/CL/CH/BT)", // 24CP102T
};
/** Plain names at least this alike may be copies of one course (the rules then decide). */
const CANDIDATE_NAME = 0.6;

type Meta = { status?: string; source?: string; confidence?: string };
type Topic = Meta & { id: string; name: string; [k: string]: unknown };
type Chapter = Meta & { id: string; name: string; topics: Topic[]; [k: string]: unknown };
type Offering = {
  branch: string;
  semester: number;
  key: string;
  code?: string;
  kind?: string;
  [k: string]: unknown;
};
type Subject = Meta & {
  id: string;
  name: string;
  university?: string;
  courseCategory?: string;
  courseType?: string;
  code?: string;
  branches: string[];
  semesters: number[];
  offerings?: Offering[];
  chapters: Chapter[];
  relatedCourses?: string[];
  links?: { subject: string; chapters?: string[] }[];
  movedTo?: string;
  sameAs?: string;
  [k: string]: unknown;
};
type HbCourse = {
  key: string;
  name: string;
  code?: string;
  semester: number;
  core?: boolean;
  credits?: number;
  ltp?: string;
  category?: string;
  retired?: boolean;
  units: unknown[];
  experiments?: unknown[];
  options?: HbCourse[];
  [k: string]: unknown;
};
type Aliases = {
  version: 1;
  subjects: Record<string, string>;
  chapters: Record<string, string>;
  topics: Record<string, string>;
};

const EMPTY_ALIASES: Aliases = { version: 1, subjects: {}, chapters: {}, topics: {} };

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
const active = <T extends Meta>(x: T) => x.status !== "retired";

function loadSubjects(): Map<string, Subject> {
  const out = new Map<string, Subject>();
  for (const f of readdirSync(SUBJECTS)) {
    if (!f.startsWith("pdeu-") || !f.endsWith(".json") || f.endsWith("-sources.json")) continue;
    const s = readJson<Subject>(`${SUBJECTS}/${f}`);
    out.set(s.id, s);
  }
  return out;
}

function codesOf(s: Subject): string[] {
  const all = [s.code, ...(s.offerings ?? []).map((o) => o.code)].filter(isRealCode);
  return [...new Set(all.map((c) => c.toUpperCase()))];
}

function toCopy(s: Subject, withRetired = false): CourseCopy {
  return {
    id: s.id,
    name: plainCourseName(s.name),
    codes: codesOf(s),
    nonCore: s.courseCategory === "non-core",
    verified: s.confidence === "verified",
    offerings: s.offerings?.length ?? 0,
    chapters: s.chapters
      .filter((c) => withRetired || active(c))
      .map((c) => ({
        id: c.id,
        name: c.name,
        topics: c.topics
          .filter((t) => withRetired || active(t))
          .map((t) => ({ id: t.id, name: t.name })),
      })),
  };
}

const isFirstYear = (s: Subject) =>
  s.university === "pdeu" && active(s) && (s.offerings ?? []).some((o) => o.semester <= 2);
/** "... Practical", "... Lab" and "... Laboratory" name the same kind of course. */
const labWords = (n: string) =>
  n.replace(/\b(?:laborator(?:y|ies)|labs?|practicals?|practices?)\b/gi, "lab");
const nameSim = (a: CourseCopy, b: CourseCopy) =>
  nameSimilarity(labWords(a.name), labWords(b.name));
const isLab = (c: HbCourse) => (c.experiments?.length ?? 0) > 0 && c.units.length === 0;

type Group = {
  main: CourseCopy;
  /** `unmatched`: active topics of the copy with no counterpart in the main copy. */
  merged: { copy: CourseCopy; verdict: MergeVerdict; unmatched: number }[];
  kept: { copy: CourseCopy; verdict: MergeVerdict }[];
};

/** Families of likely copies (same course type, same code or alike names), then the rules. */
function planMerges(subjects: Map<string, Subject>): Group[] {
  const pool = [...subjects.values()].filter((s) => isFirstYear(s) && !KEEP_APART.has(s.id));
  const copies = new Map(pool.map((s) => [s.id, toCopy(s)]));
  const type = (id: string) => subjects.get(id)?.courseType ?? "theory";
  const parent = new Map(pool.map((s) => [s.id, s.id]));
  const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!));
  for (const a of pool)
    for (const b of pool) {
      if (a.id >= b.id || type(a.id) !== type(b.id)) continue;
      const ca = copies.get(a.id)!;
      const cb = copies.get(b.id)!;
      if (ca.codes.some((c) => cb.codes.includes(c)) || nameSim(ca, cb) >= CANDIDATE_NAME)
        parent.set(find(a.id), find(b.id));
    }
  const families = new Map<string, CourseCopy[]>();
  for (const s of pool)
    families.set(find(s.id), [...(families.get(find(s.id)) ?? []), copies.get(s.id)!]);

  const groups: Group[] = [];
  for (const family of families.values()) {
    let rest = family;
    while (rest.length > 1) {
      const main = pickMain(rest);
      const others = rest
        .filter((c) => c.id !== main.id)
        .map((copy) => ({ copy, verdict: mergeVerdict(main, copy, nameSim(main, copy)) }));
      const merged = others
        .filter((o) => o.verdict.merge)
        .map((o) => {
          const topics = copyAliases(o.copy, main).topics;
          const all = o.copy.chapters.flatMap((c) => c.topics);
          return { ...o, unmatched: all.filter((t) => !topics[t.id]).length };
        });
      const kept = others.filter((o) => !o.verdict.merge);
      groups.push({ main, merged, kept });
      // The main copy leaves the family either way; the rest are compared among themselves.
      rest = kept.map((k) => k.copy);
    }
  }
  return groups.sort((a, b) => a.main.name.localeCompare(b.main.name));
}

type TableLink = { branch: string; row: HbCourse; to?: string; candidates: string[] };

/** First-year course-table rows with a real code that no course offers to their branch yet. */
function planTableLinks(
  subjects: Map<string, Subject>,
  map: Record<string, string>,
  retiredTo: Map<string, string>,
  handbooks: Map<string, { subjects: HbCourse[] }>,
): TableLink[] {
  const out: TableLink[] = [];
  for (const branch of HANDBOOK_BRANCHES) {
    const hb =
      handbooks.get(branch) ?? readJson<{ subjects: HbCourse[] }>(`src/data/pdeu/${branch}.json`);
    for (const row of hb.subjects) {
      if (row.retired || row.semester > 2 || isLab(row) || !isRealCode(row.code)) continue;
      const mapped = map[`${branch}/${row.key}`];
      const owner = mapped ? subjects.get(retiredTo.get(mapped) ?? mapped) : undefined;
      if (owner?.offerings?.some((o) => o.branch === branch && o.semester === row.semester))
        continue;
      const code = row.code.toUpperCase();
      const candidates = [
        ...new Set(
          [...subjects.values()]
            .filter(
              (s) => s.university === "pdeu" && !KEEP_APART.has(s.id) && codesOf(s).includes(code),
            )
            .map((s) => retiredTo.get(s.id) ?? s.id)
            .filter((id) => active(subjects.get(id)!)),
        ),
      ];
      out.push({
        branch,
        row,
        to: candidates.length === 1 ? candidates[0] : undefined,
        candidates,
      });
    }
  }
  return out;
}

function report(groups: Group[], links: TableLink[]): void {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  for (const g of groups) {
    if (g.merged.length === 0 && g.kept.length === 0) continue;
    console.log(`\n${g.main.name}  [main: ${g.main.id}]`);
    for (const m of g.merged)
      console.log(
        `  + ${m.copy.id}  (${m.verdict.why}, overlap ${pct(m.verdict.overlap)}${m.verdict.code ? `, ${m.verdict.code}` : ""}${m.unmatched ? `, ${m.unmatched} topics not in main` : ""})`,
      );
    for (const k of g.kept)
      console.log(
        `  - kept apart: ${k.copy.id}  (${k.verdict.why}, overlap ${pct(k.verdict.overlap)}${k.verdict.code ? `, ${k.verdict.code}` : ""})`,
      );
  }
  console.log("\nCourse-table rows linked by code:");
  for (const l of links)
    console.log(
      `  ${l.branch} s${l.row.semester} ${l.row.key} ${l.row.code} → ${l.to ?? `NOT LINKED (${l.candidates.length} candidates: ${l.candidates.join(", ")})`}`,
    );
}

function recompute(s: Subject): void {
  const offs = s.offerings ?? [];
  if (offs.length === 0) {
    s.semesters = [];
    return;
  }
  s.branches = [...new Set(offs.map((o) => o.branch))];
  s.semesters = [...new Set(offs.map((o) => o.semester))].sort((a, b) => a - b);
}

/** The parser's own notes, not syllabus topics ("This branch's handbook does not print ..."). */
const PARSE_NOTE =
  /handbook does not print|topics are taken from the same|credits shown here follow/i;
const carried: { from: string; to: string; topic: string; chapter: string }[] = [];
const notCarried: { from: string; topic: string }[] = [];

/**
 * Topics of a merging copy that the main copy lacks move into the main copy (same chapter by
 * meaning, else the copy's chapter is added), so no branch loses part of its syllabus. They keep
 * their ids where free, record `movedFrom`, and are unverified until students or a handout confirm.
 */
function carryOver(old: Subject, main: Subject): void {
  const a = copyAliases(toCopy(old), toCopy(main));
  const ids = new Set(main.chapters.flatMap((c) => c.topics.map((t) => t.id)));
  const freeId = (id: string, taken: Set<string>) => {
    let next = id;
    for (let n = 2; taken.has(next); n++) next = `${id}-${n}`;
    return next;
  };
  for (const ch of old.chapters.filter(active)) {
    const missing = ch.topics.filter((t) => active(t) && !a.topics[t.id]);
    const keep = missing.filter((t) => !PARSE_NOTE.test(t.name));
    for (const t of missing)
      if (PARSE_NOTE.test(t.name)) notCarried.push({ from: old.id, topic: t.name });
    if (keep.length === 0) continue;
    let target = main.chapters.find((c) => c.id === a.chapters[ch.id]);
    if (!target) {
      target = {
        id: freeId(ch.id, new Set(main.chapters.map((c) => c.id))),
        name: ch.name,
        ...(ch.hours === undefined ? {} : { hours: ch.hours }),
        topics: [],
        source: "admin_handout",
        confidence: "unverified",
        movedFrom: { subject: old.id, chapter: ch.id, at: now },
      };
      main.chapters.push(target);
      log({ kind: "chapter", subject: main.id, chapter: target.id }, "added (carried over)", null, {
        from: `${old.id}/${ch.id}`,
        name: ch.name,
      });
    }
    for (const t of keep) {
      const id = freeId(t.id, ids);
      ids.add(id);
      const prev = target.topics.at(-1)?.id;
      // The old `requires` named topics of the copy; like Phase 2, a moved topic needs the one before it.
      const topic: Topic = {
        ...t,
        id,
        source: "admin_handout",
        confidence: "unverified",
        movedFrom: { subject: old.id, chapter: ch.id, at: now },
      };
      delete topic.requires;
      if (prev) topic.requires = [prev];
      target.topics.push(topic);
      carried.push({
        from: `${old.id}/${t.id}`,
        to: `${main.id}/${id}`,
        topic: t.name,
        chapter: target.name,
      });
      log(
        { kind: "topic", subject: main.id, chapter: target.id, topic: id },
        "added (carried over, unverified)",
        null,
        { from: `${old.id}/${ch.id}/${t.id}`, name: t.name },
      );
    }
  }
}

function setMeta(s: Subject, field: "source" | "confidence", value: string): void {
  if (s[field] === value) return;
  log({ kind: "subject", subject: s.id }, field, s[field], value);
  s[field] = value;
}

function apply(write: boolean): void {
  const subjects = loadSubjects();
  const map = readJson<Record<string, string>>(SUBJECT_MAP);
  const aliases = readJson<Aliases>(ALIASES);
  const changed = new Set<string>();
  const handbooks = new Map<string, { subjects: HbCourse[] }>();

  // 1. Biological Systems for Engineers leaves COMP sem 1; semester unknown, unverified.
  const bio = subjects.get(BIO)!;
  const ceOffers = (bio.offerings ?? []).filter((o) => o.branch === "ce");
  if (ceOffers.length === 0) throw new Error(`${BIO} has no COMP offering`);
  bio.offerings = (bio.offerings ?? []).filter((o) => o.branch !== "ce");
  for (const o of ceOffers) log({ kind: "subject", subject: BIO }, "offering ce", o, null);
  const oldSems = bio.semesters;
  recompute(bio);
  log({ kind: "subject", subject: BIO }, "semesters", oldSems, bio.semesters);
  setMeta(bio, "source", "admin_handout");
  setMeta(bio, "confidence", "unverified");
  for (const c of bio.chapters) {
    if (c.confidence && c.confidence !== "unverified") {
      log(
        { kind: "chapter", subject: BIO, chapter: c.id },
        "confidence",
        c.confidence,
        "unverified",
      );
      c.confidence = "unverified";
    }
    for (const t of c.topics)
      if (t.confidence && t.confidence !== "unverified") {
        log(
          { kind: "topic", subject: BIO, chapter: c.id, topic: t.id },
          "confidence",
          t.confidence,
          "unverified",
        );
        t.confidence = "unverified";
      }
  }
  changed.add(BIO);
  const ce = readJson<{ subjects: HbCourse[] }>("src/data/pdeu/ce.json");
  for (const o of ceOffers) {
    const row = ce.subjects.find((r) => r.key === o.key);
    if (row && !row.retired) {
      row.retired = true;
      log(
        { kind: "branch", subject: BIO },
        `handbook ce/${row.key} retired (semester not confirmed, open question)`,
        false,
        true,
      );
    }
  }
  handbooks.set("ce", ce);

  // 2. Merges.
  const groups = planMerges(subjects);
  const retiredTo = new Map<string, string>();
  for (const g of groups) {
    if (g.merged.length === 0) continue;
    const main = subjects.get(g.main.id)!;
    const plain = HANDOUT_TITLE[main.id] ?? plainCourseName(main.name);
    if (plain !== main.name) {
      log({ kind: "subject", subject: main.id }, "name", main.name, plain);
      main.name = plain;
    }
    for (const { copy } of g.merged) {
      const old = subjects.get(copy.id)!;
      for (const o of old.offerings ?? []) {
        const have = (main.offerings ?? []).some(
          (x) => x.branch === o.branch && x.semester === o.semester,
        );
        if (have) continue;
        main.offerings = [...(main.offerings ?? []), o];
        log({ kind: "subject", subject: main.id }, `offering ${o.branch}`, null, {
          ...o,
          from: old.id,
        });
      }
      if (!main.code && old.code && isRealCode(old.code)) {
        log({ kind: "subject", subject: main.id }, "code", null, old.code);
        main.code = old.code;
      }
      log({ kind: "subject", subject: old.id }, "status", old.status ?? "active", "retired");
      old.status = "retired";
      log({ kind: "subject", subject: old.id }, "movedTo", old.movedTo, main.id);
      old.movedTo = main.id;
      old.sameAs = main.id;
      retiredTo.set(old.id, main.id);
      aliases.subjects[old.id] = main.id;
      carryOver(old, main);
      const a = copyAliases(toCopy(old, true), toCopy(main));
      for (const [from, to] of Object.entries(a.chapters))
        aliases.chapters[`${old.id}/${from}`] = `${main.id}/${to}`;
      for (const [from, to] of Object.entries(a.topics))
        aliases.topics[`${old.id}/${from}`] = `${main.id}/${to}`;
      changed.add(old.id);
    }
    const oldBranches = main.branches;
    const oldSemesters = main.semesters;
    recompute(main);
    if (JSON.stringify(oldBranches) !== JSON.stringify(main.branches))
      log({ kind: "subject", subject: main.id }, "branches", oldBranches, main.branches);
    if (JSON.stringify(oldSemesters) !== JSON.stringify(main.semesters))
      log({ kind: "subject", subject: main.id }, "semesters", oldSemesters, main.semesters);
    setMeta(main, "source", "admin_handout");
    setMeta(main, "confidence", "verified");
    changed.add(main.id);
  }

  // Theory ↔ lab links and borrowed chapters follow the merge.
  for (const s of subjects.values()) {
    if (
      s.relatedCourses?.some((r) => retiredTo.has(r)) ||
      (retiredTo.has(s.id) && s.relatedCourses)
    ) {
      const target = retiredTo.has(s.id) ? subjects.get(retiredTo.get(s.id)!)! : s;
      const next = [
        ...new Set(
          [...(target.relatedCourses ?? []), ...(s.relatedCourses ?? [])].map(
            (r) => retiredTo.get(r) ?? r,
          ),
        ),
      ].filter((r) => r !== target.id);
      if (JSON.stringify(next) !== JSON.stringify(target.relatedCourses ?? [])) {
        log({ kind: "subject", subject: target.id }, "relatedCourses", target.relatedCourses, next);
        target.relatedCourses = next;
        changed.add(target.id);
      }
    }
    for (const l of s.links ?? [])
      if (retiredTo.has(l.subject))
        throw new Error(`${s.id} borrows chapters of merged ${l.subject}`);
  }

  // subject-map: course-table rows of retired copies now open the main copy.
  for (const [k, id] of Object.entries(map))
    if (retiredTo.has(id)) {
      log(
        { kind: "branch", subject: retiredTo.get(id) },
        `subject-map ${k}`,
        id,
        retiredTo.get(id),
      );
      map[k] = retiredTo.get(id)!;
    }

  // 3. Course-table rows linked by their code.
  const links = planTableLinks(subjects, map, retiredTo, handbooks);
  for (const l of links) {
    if (!l.to) continue;
    const s = subjects.get(l.to)!;
    const o: Offering = {
      branch: l.branch,
      key: l.row.key,
      code: l.row.code,
      category: l.row.category,
      ltp: l.row.ltp,
      credits: l.row.credits,
      semester: l.row.semester,
      kind: l.row.core ? "core" : "non-core",
    };
    s.offerings = [...(s.offerings ?? []), o];
    log({ kind: "subject", subject: s.id }, `offering ${l.branch}`, null, {
      ...o,
      from: "course table, same code",
    });
    recompute(s);
    if (map[`${l.branch}/${l.row.key}`] !== s.id) {
      log(
        { kind: "branch", subject: s.id },
        `subject-map ${l.branch}/${l.row.key}`,
        map[`${l.branch}/${l.row.key}`],
        s.id,
      );
      map[`${l.branch}/${l.row.key}`] = s.id;
    }
    setMeta(s, "source", "admin_handout");
    setMeta(s, "confidence", "verified");
    changed.add(s.id);
  }

  if (!write) {
    report(groups, links);
    console.log(`\nCarried over into main copies (unverified): ${carried.length}`);
    for (const c of carried) console.log(`  ${c.from} → ${c.to}  [${c.chapter}] ${c.topic}`);
    console.log(`Parser notes left in the retired copy: ${notCarried.length}`);
    for (const n of notCarried) console.log(`  ${n.from}: ${n.topic}`);
    console.log(`
Biological Systems: COMP offerings removed ${ceOffers.map((o) => o.key).join(", ")}; ${history.length} history entries would be written.`);
    return;
  }
  const modified = [...changed].map((id) => `${SUBJECTS}/${id}.json`);
  for (const id of changed) writeFileSync(`${SUBJECTS}/${id}.json`, json(subjects.get(id)));
  for (const [b, hb] of handbooks) {
    writeFileSync(`src/data/pdeu/${b}.json`, json(hb));
    modified.push(`src/data/pdeu/${b}.json`);
  }
  writeFileSync(SUBJECT_MAP, json(map));
  writeFileSync(ALIASES, json(aliases));
  modified.push(SUBJECT_MAP, ALIASES);
  writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
  writeFileSync(
    MANIFEST,
    json({
      appliedAt: now,
      gitTag: TAG,
      modified: modified.sort(),
      merged: groups
        .filter((g) => g.merged.length > 0)
        .map((g) => ({
          main: g.main.id,
          copies: g.merged.map((m) => ({ id: m.copy.id, ...m.verdict })),
        })),
      keptApart: groups.flatMap((g) =>
        g.kept.map((k) => ({ main: g.main.id, id: k.copy.id, ...k.verdict })),
      ),
      carried,
      notCarried,
    }),
  );
  console.log(
    `${NAME} up: ${groups.filter((g) => g.merged.length).length} merged courses, ${retiredTo.size} copies retired, ${modified.length} files, ${history.length} history entries.`,
  );
}

function up(): void {
  if (existsSync(MANIFEST)) throw new Error(`${NAME} is already applied. Run "down" first.`);
  const dirty = execFileSync("git", ["status", "--porcelain", "--", "src/data", HISTORY], {
    encoding: "utf8",
  })
    .split("\n")
    // The alias file is new with this migration; an empty one is not a change.
    .filter(
      (l) =>
        l.trim() && !(l.endsWith(ALIASES) && readFileSync(ALIASES, "utf8") === json(EMPTY_ALIASES)),
    );
  if (dirty.length) throw new Error(`Uncommitted syllabus data changes:\n${dirty.join("\n")}`);
  if (!execFileSync("git", ["tag", "--list", TAG], { encoding: "utf8" }).trim())
    execFileSync("git", ["tag", TAG]);
  apply(true);
}

function down(): void {
  if (!existsSync(MANIFEST)) throw new Error(`${NAME} is not applied.`);
  const m = readJson<{ gitTag: string; modified: string[] }>(MANIFEST);
  execFileSync("git", ["checkout", m.gitTag, "--", ...m.modified.filter((f) => f !== ALIASES)]);
  writeFileSync(ALIASES, json(EMPTY_ALIASES));
  const { entries } = parseHistory(readFileSync(HISTORY, "utf8"));
  const undo = historyEntry({
    actor: { kind: "admin", id: NAME },
    cause: `migration ${NAME} down`,
    target: { kind: "catalogue" },
    field: "first-year merges",
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
if (direction === "plan") apply(false);
else if (direction === "up") up();
else if (direction === "down") down();
else {
  console.error(`Usage: ${NAME}.ts plan|up|down`);
  process.exit(1);
}
