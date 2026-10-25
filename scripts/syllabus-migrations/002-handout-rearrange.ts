// Syllabus fix, Phase 2 step 4 (approved by the owner on 2026-10-25): apply the handout dry run.
// Rearranges the existing syllabus instead of rebuilding it: ids are kept; topics move between
// chapters (remembering where they came from), courses are linked to branches or moved to their
// semester, missing courses, units and topics are added, a topic that holds several handout
// topics is split (the first piece keeps the old id), and what no handout lists is retired (soft
// delete: hidden, never removed). Every change is logged to data/university/pdeu/history.jsonl,
// moved or split topics are marked stale (src/data/syllabus/stale-topics.json) so their cached
// lessons regenerate on next open, and new ids are added to src/lib/subjectIds.lock.json.
//
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/002-handout-rearrange.ts up
//   npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/002-handout-rearrange.ts down
//
// "up" tags the current commit (pre-syllabus-phase2-apply) and records every file it writes in
// data/university/pdeu/migrations/002-handout-rearrange.json; "down" restores those files from
// the tag, deletes the files it created and marks its history entries reverted.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildPlan } from "../match-handouts";
import type { Change, HandoutCourse, ReviewItem } from "../../src/lib/syllabusFix/handoutMatch";
import {
  formatHistory,
  historyEntry,
  markReverted,
  parseHistory,
  type HistoryEntry,
} from "../../src/lib/syllabusFix/history";
import type { ParsedSemester } from "../import-handouts";

const NAME = "002-handout-rearrange";
const CAUSE = `migration ${NAME} up (Phase 2 handout import, approved 2026-10-25)`;
const TAG = "pre-syllabus-phase2-apply";
const SUBJECTS = "src/data/subjects";
const HANDBOOK = "src/data/pdeu";
const HANDBOOK_BRANCHES = ["ce", "ict", "ece", "civil", "petro", "biotech", "me"];
const HISTORY = "data/university/pdeu/history.jsonl";
const STALE = "src/data/syllabus/stale-topics.json";
const LOCK = "src/lib/subjectIds.lock.json";
const BRANCHES_FILE = "src/data/branches.json";
const SUBJECT_MAP = `${HANDBOOK}/subject-map.json`;
const MANIFEST = `data/university/pdeu/migrations/${NAME}.json`;
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
/** Draft source for the department AI courses that have no handout page (owner's decision 1). */
const AI_DRAFT_FROM = "pdeu-introduction-to-artificial-intelligence-department-ce";

// ---------- JSON shapes (only the fields this script touches) ----------
type Meta = { source?: string; confidence?: string; status?: string; verifiedByCount?: number };
type TopicJ = Meta & {
  id: string;
  name: string;
  requires?: string[];
  movedFrom?: { subject: string; chapter?: string; at: string };
  number?: number;
  aim?: string;
  [k: string]: unknown;
};
type ChapterJ = Meta & {
  id: string;
  name: string;
  hours?: number;
  topics: TopicJ[];
  [k: string]: unknown;
};
type OfferingJ = {
  branch: string;
  key: string;
  code?: string;
  category: string;
  ltp?: string;
  credits: number;
  semester: number;
  kind?: "core" | "non-core";
  [k: string]: unknown;
};
type SubjectJ = Meta & {
  id: string;
  name: string;
  university?: string;
  branches: string[];
  semesters: number[];
  offerings?: OfferingJ[];
  chapters: ChapterJ[];
  courseType?: string;
  relatedCourses?: string[];
  [k: string]: unknown;
};
type UnitJ = { number: number; title: string; hours?: number; topics: string[] };
type HbCourse = {
  key: string;
  code?: string;
  name: string;
  category: string;
  ltp?: string;
  credits: number;
  semester?: number;
  core?: boolean;
  units: UnitJ[];
  experiments?: string[];
  options?: HbCourse[];
  retired?: boolean;
  source?: "handbook" | "handout";
  notes?: string[];
  [k: string]: unknown;
};
type Handbook = { id: string; subjects: HbCourse[]; [k: string]: unknown };

const now = new Date().toISOString();
const history: HistoryEntry[] = [];
const staleKeys: { subject: string; topic: string }[] = [];
const modified = new Set<string>();
const created = new Set<string>();
const review: ReviewItem[] = [];

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function log(
  target: HistoryEntry["target"],
  field: string,
  oldValue: unknown,
  newValue: unknown,
): void {
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
}

function slug(text: string, max = 60): string {
  return (
    text
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/g, "") || "item"
  );
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

const VERIFIED: Meta = { source: "admin_handout", confidence: "verified" };

// ---------- load ----------
const subjects = new Map<string, { file: string; data: SubjectJ }>();
/** Topic ids each course had before this migration (to tell new topics apart). */
const originalTopics = new Map<string, Set<string>>();
for (const f of readdirSync(SUBJECTS)) {
  if (!/^pdeu-.*\.json$/.test(f) || f.endsWith("-sources.json")) continue;
  const file = path.join(SUBJECTS, f);
  const data = readJson<SubjectJ>(file);
  subjects.set(data.id, { file, data });
  originalTopics.set(data.id, topicIds(data));
}
const handbooks = new Map<string, Handbook>();
for (const b of HANDBOOK_BRANCHES) handbooks.set(b, readJson<Handbook>(`${HANDBOOK}/${b}.json`));
const subjectMap = readJson<Record<string, string>>(SUBJECT_MAP);

function subject(id: string): SubjectJ {
  const s = subjects.get(id);
  if (!s) throw new Error(`unknown subject ${id}`);
  modified.add(s.file);
  return s.data;
}

function topicIds(s: SubjectJ): Set<string> {
  return new Set(s.chapters.flatMap((c) => c.topics.map((t) => t.id)));
}

// ---------- handbook (src/data/pdeu/<branch>.json) ----------
function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)?/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function realCode(code: string | null | undefined): string | undefined {
  return code && !code.startsWith("UG_") && !/[xX*]/.test(code.slice(4)) ? code : undefined;
}

/** PDEU 2024 codes: a course number with a middle digit of 3+ (24ME431T, 24CS336T) is an elective. */
function isElective(code: string | undefined): boolean {
  const m = code?.match(/^\d{2}[A-Z]{2,5}(\d)(\d)(\d)/);
  return !!m && Number(m[2]) >= 3;
}

function ltpOf(h: HandoutCourse): { ltp?: string; credits: number } {
  const c = parsedCourse(h);
  const l = c?.ltp;
  return l ? { ltp: `${l.L}-${l.T}-${l.P}`, credits: l.C ?? 0 } : { credits: 0 };
}

function unitsOf(h: HandoutCourse): UnitJ[] {
  return h.units.map((u) => ({
    number: u.order,
    title: u.name,
    ...(u.hours ? { hours: u.hours } : {}),
    topics: u.topics,
  }));
}

/** Find or add the handout course in its branch's handbook; returns its key. */
function placeInHandbook(h: HandoutCourse, subjectId: string): { key: string; category: string } {
  const hb = handbooks.get(h.branch);
  const fallback = `s${h.sem}-${slug(h.title)}`;
  if (!hb) {
    // Branches without a handbook file (elec, chem): electives still get a slot-style key, so
    // students pick them instead of seeing every option as compulsory.
    if (h.courseType === "practical") return { key: fallback, category: "Laboratory" };
    if (isElective(realCode(h.code)))
      return { key: `s${h.sem}-program-elective--${slug(h.title)}`, category: "Program Elective" };
    return { key: fallback, category: "Program Core" };
  }
  modified.add(`${HANDBOOK}/${h.branch}.json`);
  const flat: { course: HbCourse; parent?: HbCourse }[] = hb.subjects.flatMap((c) => [
    { course: c },
    ...(c.options ?? []).map((o) => ({ course: o, parent: c })),
  ]);
  const code = realCode(h.code);
  const found =
    flat.find((x) => subjectMap[`${h.branch}/${x.course.key}`] === subjectId) ??
    (code ? flat.find((x) => x.course.code?.toUpperCase() === code.toUpperCase()) : undefined) ??
    flat.find((x) => nameKey(x.course.name) === nameKey(h.title));
  const { ltp, credits } = ltpOf(h);
  const content = {
    ...(code ? { code } : {}),
    ...(ltp ? { ltp } : {}),
    units: h.courseType === "practical" ? [] : unitsOf(h),
    ...(h.courseType === "practical" ? { experiments: h.experiments.map((e) => e.title) } : {}),
    source: "handout" as const,
  };
  const used = new Set(flat.map((x) => x.course.key));
  if (found) {
    const target = found.course;
    // An elective printed as a compulsory course in the old handbook moves into the slot.
    if (!found.parent && isElective(code) && h.courseType !== "practical") {
      hb.subjects.splice(hb.subjects.indexOf(target), 1);
      delete subjectMap[`${h.branch}/${target.key}`];
      const slot = slotFor(hb, h, credits, used);
      const oldKey = target.key;
      target.key = uniqueId(`${slot.key}--${slug(h.title)}`, used);
      delete target.semester;
      delete target.core;
      Object.assign(target, content, { category: "Program Elective" });
      delete target.retired;
      slot.options!.push(target);
      subjectMap[`${h.branch}/${target.key}`] = subjectId;
      log(
        { kind: "branch", subject: subjectId },
        `handbook ${h.branch}/${oldKey}`,
        oldKey,
        target.key,
      );
      return { key: target.key, category: "Program Elective" };
    }
    const before = { semester: target.semester, code: target.code, units: target.units.length };
    Object.assign(target, content);
    if (!found.parent && target.semester !== h.sem) target.semester = h.sem;
    delete target.retired;
    subjectMap[`${h.branch}/${target.key}`] = subjectId;
    log({ kind: "branch", subject: subjectId }, `handbook ${h.branch}/${target.key}`, before, {
      semester: found.parent?.semester ?? target.semester,
      code: target.code,
      units: target.units.length,
    });
    return { key: target.key, category: target.category };
  }
  const category =
    h.courseType === "practical"
      ? "Laboratory"
      : isElective(code)
        ? "Program Elective"
        : "Program Core";
  const base = { name: h.title, category, credits, ...content };
  let key: string;
  if (isElective(code) && h.courseType !== "practical") {
    const slot = slotFor(hb, h, credits, used);
    key = uniqueId(`${slot.key}--${slug(h.title)}`, used);
    slot.options!.push({ key, ...base });
  } else {
    key = uniqueId(fallback, used);
    hb.subjects.push({ key, ...base, semester: h.sem, core: true });
  }
  subjectMap[`${h.branch}/${key}`] = subjectId;
  log({ kind: "branch", subject: subjectId }, `handbook ${h.branch}/${key}`, null, {
    added: h.title,
    semester: h.sem,
  });
  return { key, category };
}

/** The elective slot of the semester (made from the course table when there is none yet). */
function slotFor(hb: Handbook, h: HandoutCourse, credits: number, used: Set<string>): HbCourse {
  let slot = hb.subjects.find((c) => c.semester === h.sem && c.options?.length && !c.retired);
  if (!slot) {
    // How many electives a student takes here: the course table's elective rows
    // (ME sem 7: "Professional Elective - 3/4/5" = 3). Open electives are separate.
    const picks = Math.max(1, electiveRows(h.branch, h.sem));
    slot = {
      key: uniqueId(`s${h.sem}-program-elective`, used),
      name: picks > 1 ? `Program Electives (choose ${picks})` : "Program Elective",
      category: "Program Elective",
      credits,
      semester: h.sem,
      core: true,
      units: [],
      options: [],
      ...(picks > 1 ? { picks } : {}),
      source: "handout",
      notes: [
        `Elective slot added from the 2024-25 course handouts; choose ${picks === 1 ? "one option" : `${picks} options`}.`,
      ],
    };
    hb.subjects.push(slot);
  }
  return slot;
}

/** Program/professional elective rows of a semester in the branch's course table. */
function electiveRows(branch: string, sem: number): number {
  const names = new Set<string>();
  for (const s of sems)
    if (s.branch === branch)
      for (const r of s.outline)
        if (r.sem === sem && /elective/i.test(r.name) && !/open/i.test(r.name))
          names.add(r.name.replace(/\s+/g, " ").trim().toLowerCase());
  return names.size;
}

function retireInHandbook(branch: string, subjectId: string): void {
  const hb = handbooks.get(branch);
  if (!hb) return;
  for (const c of hb.subjects)
    for (const x of [c, ...(c.options ?? [])])
      if (subjectMap[`${branch}/${x.key}`] === subjectId && !x.retired) {
        x.retired = true;
        modified.add(`${HANDBOOK}/${branch}.json`);
        log(
          { kind: "branch", subject: subjectId },
          `handbook ${branch}/${x.key} retired`,
          false,
          true,
        );
      }
}

// ---------- subjects ----------
function syncPlaces(s: SubjectJ): void {
  const offerings = s.offerings ?? [];
  if (!offerings.length) return;
  s.branches = [...new Set(offerings.map((o) => o.branch))];
  s.semesters = [...new Set(offerings.map((o) => o.semester))].sort((a, b) => a - b);
}

function ensureOffering(s: SubjectJ, h: HandoutCourse): void {
  const { key, category } = placeInHandbook(h, s.id);
  const { ltp, credits } = ltpOf(h);
  const offerings = (s.offerings ??= []);
  const existing = offerings.find((o) => o.branch === h.branch);
  if (existing) {
    if (existing.semester !== h.sem || existing.key !== key) {
      log(
        { kind: "subject", subject: s.id },
        `offering ${h.branch}`,
        { semester: existing.semester, key: existing.key },
        { semester: h.sem, key },
      );
      existing.semester = h.sem;
      existing.key = key;
    }
  } else {
    const code = realCode(h.code);
    const offering: OfferingJ = {
      branch: h.branch,
      key,
      ...(code ? { code } : {}),
      category,
      ...(ltp ? { ltp } : {}),
      credits,
      semester: h.sem,
      kind: "core",
    };
    offerings.push(offering);
    log({ kind: "subject", subject: s.id }, `offering ${h.branch}`, null, offering);
  }
  syncPlaces(s);
}

function topicsFrom(names: readonly string[], used: Set<string>, meta: Meta): TopicJ[] {
  return names
    .filter((n) => n.trim().length > 0)
    .map((name) => ({ id: uniqueId(slug(name), used), name, ...meta }));
}

function chaptersFrom(h: HandoutCourse, meta: Meta): ChapterJ[] {
  const chapterIds = new Set<string>();
  const topicIdsUsed = new Set<string>();
  if (h.courseType === "practical") {
    return [
      {
        id: "experiments",
        name: "Experiments",
        topics: h.experiments.map((e) => ({
          id: uniqueId(slug(`experiment-${e.number}-${e.title}`), topicIdsUsed),
          name: e.title,
          number: e.number,
          ...(e.aim && e.aim !== e.title ? { aim: e.aim } : {}),
          ...meta,
        })),
      },
    ];
  }
  return h.units
    .filter((u) => u.topics.length > 0)
    .map((u) => ({
      id: uniqueId(slug(u.name), chapterIds),
      name: u.name,
      ...(u.hours ? { hours: u.hours } : {}),
      topics: topicsFrom(u.topics, topicIdsUsed, meta),
    }));
}

/** New courses always carry their branch ("pdeu-machine-learning-ict"): copies stay apart. */
function newSubjectId(title: string, branch: string): string {
  const base = `pdeu-${slug(title.replace(/\([^)]*\)?/g, " "), 70)}-${branch}`;
  return uniqueId(base, new Set(subjects.keys()));
}

function createSubject(h: HandoutCourse, extra: Partial<SubjectJ> = {}): SubjectJ | null {
  const chapters = extra.chapters ?? chaptersFrom(h, {});
  // A lab without an experiment list is still a course of the semester (owner, 2026-10-25).
  if (chapters.length === 0 && h.courseType !== "practical") {
    review.push({
      branch: h.branch,
      sem: h.sem,
      reason: "not applied",
      detail: `"${h.title}" has no units with topics to add`,
    });
    return null;
  }
  const id = newSubjectId(h.title, h.branch);
  const file = path.join(SUBJECTS, `${id}.json`);
  const s: SubjectJ = {
    id,
    name: h.title.replace(/\s+/g, " ").trim(),
    field: h.title,
    tier: "sourced",
    university: "pdeu",
    courseCategory: "core",
    branches: [h.branch],
    semesters: [h.sem],
    syllabusSource: {
      kind: "university",
      title: `PDEU course handout 2024-25 (${FOLDER[h.branch]} semester ${h.sem}): ${h.title}`,
      note: `Units and topics copied from the course handout PDF (pages ${h.pages} of ${h.source}). New in Prism: no curated sources or checked lessons yet.`,
    },
    ...(realCode(h.code) ? { code: realCode(h.code) } : {}),
    ...VERIFIED,
    status: "active",
    verifiedByCount: 0,
    courseType: h.courseType,
    offerings: [],
    ...extra,
    chapters,
  };
  subjects.set(id, { file, data: s });
  created.add(file);
  ensureOffering(s, h);
  log({ kind: "subject", subject: id }, "created", null, {
    name: s.name,
    branch: h.branch,
    semester: h.sem,
    courseType: h.courseType,
  });
  return s;
}

/** Would following "requires" from `from` reach `to`? */
function reaches(s: SubjectJ, from: string, to: string): boolean {
  const req = new Map(
    s.chapters.flatMap((c) => c.topics.map((t) => [t.id, t.requires ?? []] as const)),
  );
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === to) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(req.get(id) ?? []));
  }
  return false;
}

/**
 * The concept map's convention: a topic needs the one before it in its chapter. New topics (and
 * new courses) get the same link, unless it would make a loop.
 */
function linkNewTopics(s: SubjectJ, isNew: (t: TopicJ) => boolean): void {
  for (const c of s.chapters) {
    c.topics.forEach((t, i) => {
      if (i === 0 || t.requires?.length || t.status === "retired" || !isNew(t)) return;
      const prev = c.topics[i - 1];
      if (reaches(s, prev.id, t.id)) return;
      t.requires = [prev.id];
    });
  }
}

/**
 * Re-applying after a published run (`--keep-ids-from=<git ref>`): every id that was published
 * at that ref must still resolve. An id the new run no longer has comes back hidden: a missing
 * course file is restored as retired, a missing chapter or topic is added as retired, and a topic
 * that now sits in another chapter remembers the published chapter in `formerChapters`.
 */
function keepPublished(ref: string): number {
  const show = (file: string): string | null => {
    try {
      return execFileSync("git", ["show", `${ref}:${file}`], {
        encoding: "utf8",
        maxBuffer: 1 << 28,
      });
    } catch {
      return null;
    }
  };
  const published = (JSON.parse(show(LOCK) ?? '{"ids":[]}') as { ids: string[] }).ids;
  const resolvedNow = (s: SubjectJ) => {
    const out = new Set<string>();
    for (const c of s.chapters)
      for (const t of c.topics) {
        out.add(`${c.id}/${t.id}`);
        if (t.movedFrom?.subject === s.id && t.movedFrom.chapter)
          out.add(`${t.movedFrom.chapter}/${t.id}`);
        for (const ch of (t.formerChapters as string[] | undefined) ?? []) out.add(`${ch}/${t.id}`);
      }
    return out;
  };
  const refFiles = new Map<string, SubjectJ | null>();
  const refSubject = (id: string) => {
    if (!refFiles.has(id)) {
      const text = show(`${SUBJECTS}/${id}.json`);
      refFiles.set(id, text ? (JSON.parse(text) as SubjectJ) : null);
    }
    return refFiles.get(id)!;
  };
  let kept = 0;
  const bySubject = new Map<string, string[]>();
  for (const id of published) {
    const [subjectId, ...rest] = id.split("/");
    (bySubject.get(subjectId) ?? bySubject.set(subjectId, []).get(subjectId)!).push(rest.join("/"));
  }
  for (const [subjectId, keys] of bySubject) {
    const current = subjects.get(subjectId);
    if (!current) {
      // Only PDEU courses can have disappeared; the topic bank (em.json, dsa.json …) is never
      // touched by this migration, and an existing file is never written over.
      const file = path.join(SUBJECTS, `${subjectId}.json`);
      if (existsSync(file)) continue;
      const old = refSubject(subjectId);
      if (!old || old.university !== "pdeu") continue;
      old.status = "retired";
      subjects.set(subjectId, { file, data: old });
      created.add(file);
      log({ kind: "subject", subject: subjectId }, "kept as retired (published id)", null, { ref });
      kept += keys.length;
      continue;
    }
    const s = current.data;
    const have = resolvedNow(s);
    const missing = keys.filter((k) => !have.has(k));
    if (!missing.length) continue;
    const old = refSubject(subjectId);
    modified.add(current.file);
    for (const key of missing) {
      const [chapterId, topicId] = key.split("/");
      const placed = s.chapters
        .flatMap((c) => c.topics.map((t) => ({ c, t })))
        .find((x) => x.t.id === topicId);
      if (placed) {
        const list = ((placed.t.formerChapters as string[] | undefined) ??= []);
        if (!list.includes(chapterId)) list.push(chapterId);
      } else {
        const oldChapter = old?.chapters.find((c) => c.id === chapterId);
        const oldTopic = oldChapter?.topics.find((t) => t.id === topicId);
        let chapter = s.chapters.find((c) => c.id === chapterId);
        if (!chapter) {
          chapter = {
            id: chapterId,
            name: oldChapter?.name ?? chapterId,
            status: "retired",
            topics: [],
          };
          s.chapters.push(chapter);
        }
        chapter.topics.push({ id: topicId, name: oldTopic?.name ?? topicId, status: "retired" });
      }
      log(
        { kind: "topic", subject: subjectId, chapter: chapterId, topic: topicId },
        "kept (published id)",
        null,
        { ref, retired: !placed },
      );
      kept++;
    }
  }
  // The published lock stays the base of the new one.
  const lock = readJson<{ note: string; ids: string[] }>(LOCK);
  const known = new Set(lock.ids);
  for (const id of published) if (!known.has(id)) lock.ids.push(id);
  writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
  return kept;
}

// ---------- the plan ----------
const { sems, handouts, result } = buildPlan();
const parsedBy = new Map<string, ParsedSemester["courses"][number]>();
for (const s of sems) for (const c of s.courses) parsedBy.set(`${s.branch}/${s.sem}/${c.title}`, c);
function parsedCourse(h: HandoutCourse) {
  return parsedBy.get(`${h.branch}/${h.sem}/${h.title}`);
}
const handoutBy = new Map(handouts.map((h) => [`${h.branch}/${h.sem}/${h.title}`, h]));
function handoutOf(c: {
  branch: string;
  sem: number;
  handout?: { course: string };
}): HandoutCourse {
  const h = handoutBy.get(`${c.branch}/${c.sem}/${c.handout?.course}`);
  if (!h) throw new Error(`no handout for ${c.branch} sem ${c.sem} ${c.handout?.course}`);
  return h;
}
/** Handout course → the subject that teaches it now. */
const subjectOf = new Map<string, string>();
for (const m of result.matched) subjectOf.set(`${m.branch}/${m.sem}/${m.title}`, m.subject);

function up(): void {
  if (existsSync(MANIFEST))
    throw new Error(`${NAME} is already applied (${MANIFEST}). Run "down" first.`);
  const tags = execFileSync("git", ["tag", "--list", TAG], { encoding: "utf8" });
  const dirty = execFileSync("git", ["status", "--porcelain", "--", "src/data", LOCK], {
    encoding: "utf8",
  });
  // After a "down", the data equals the pre-apply tag again: that is a clean start too.
  let sameAsTag = false;
  if (dirty.trim() && tags.trim()) {
    try {
      execFileSync("git", [
        "diff",
        "--quiet",
        TAG,
        "--",
        "src/data",
        LOCK,
        ":!src/data/subjects/*.generated.ts",
      ]);
      sameAsTag = true;
    } catch {
      sameAsTag = false;
    }
  }
  if (dirty.trim() && !sameAsTag)
    throw new Error(`Uncommitted syllabus data changes; commit or revert them first:\n${dirty}`);
  if (!tags.trim()) execFileSync("git", ["tag", TAG]);

  const changes = result.changes;
  const byType = (t: Change["type"]) => changes.filter((c) => c.type === t);

  // 1. Courses: link to branch/semester, move semester, retire what no handout lists.
  for (const c of [
    ...byType("course missing from branch/semester"),
    ...byType("course in wrong semester"),
  ])
    ensureOffering(subject(c.prism!.subject), handoutOf(c));
  for (const c of changes.filter((x) => x.retire && x.prism && !x.prism.chapter)) {
    const s = subject(c.prism!.subject);
    const offerings = s.offerings ?? [];
    const mine = offerings.filter((o) => o.branch === c.branch && o.semester === c.sem);
    retireInHandbook(c.branch, s.id);
    if (offerings.length > mine.length) {
      s.offerings = offerings.filter((o) => !mine.includes(o));
      syncPlaces(s);
      log({ kind: "subject", subject: s.id }, `offering ${c.branch}`, mine, null);
    } else {
      log({ kind: "subject", subject: s.id }, "status", s.status ?? "active", "retired");
      s.status = "retired";
    }
  }

  // 2. Inside courses: splits, moves, additions, order, retirements.
  for (const c of byType("topic split")) {
    const s = subject(c.prism!.subject);
    const chapter = s.chapters.find((x) => x.id === c.prism!.chapter)!;
    const at = chapter.topics.findIndex((t) => t.id === c.prism!.topic);
    const old = chapter.topics[at];
    const [first, ...rest] = c.pieces!;
    const used = topicIds(s);
    log(
      { kind: "topic", subject: s.id, chapter: chapter.id, topic: old.id },
      "name",
      old.name,
      first,
    );
    old.name = first;
    Object.assign(old, VERIFIED);
    const pieces = topicsFrom(rest, used, VERIFIED);
    chapter.topics.splice(at + 1, 0, ...pieces);
    for (const p of pieces)
      log(
        { kind: "topic", subject: s.id, chapter: chapter.id, topic: p.id },
        "created (split)",
        null,
        { name: p.name, from: old.id },
      );
    staleKeys.push({ subject: s.id, topic: old.id });
  }
  for (const c of byType("topic under wrong unit")) {
    const s = subject(c.prism!.subject);
    const from = s.chapters.find((x) => x.id === c.prism!.chapter)!;
    const to = s.chapters.find((x) => x.id === c.to!.chapter)!;
    const at = from.topics.findIndex((t) => t.id === c.prism!.topic);
    if (at < 0) continue; // already moved by an earlier change
    if (from.topics.length === 1) {
      review.push({
        branch: c.branch,
        sem: c.sem,
        reason: "not applied",
        detail: `${c.detail}: it is the chapter's only topic`,
      });
      continue;
    }
    const [topic] = from.topics.splice(at, 1);
    topic.movedFrom ??= { subject: s.id, chapter: from.id, at: now };
    Object.assign(topic, VERIFIED);
    to.topics.push(topic);
    log(
      { kind: "topic", subject: s.id, chapter: to.id, topic: topic.id },
      "chapter",
      from.id,
      to.id,
    );
    staleKeys.push({ subject: s.id, topic: topic.id });
  }
  for (const c of byType("unit missing")) {
    const s = subject(c.to!.subject!);
    const h = handoutOf(c);
    const unit = h.units.find((u) => u.name === c.handout?.unit);
    if (!unit || unit.topics.length === 0) {
      review.push({
        branch: c.branch,
        sem: c.sem,
        reason: "not applied",
        detail: `${c.detail}: the unit lists no topics`,
      });
      continue;
    }
    const chapter: ChapterJ = {
      id: uniqueId(slug(unit.name), new Set(s.chapters.map((x) => x.id))),
      name: unit.name,
      ...(unit.hours ? { hours: unit.hours } : {}),
      ...VERIFIED,
      topics: topicsFrom(unit.topics, topicIds(s), VERIFIED),
    };
    s.chapters.splice(Math.min(Math.max(0, (c.to!.order ?? 1) - 1), s.chapters.length), 0, chapter);
    log({ kind: "chapter", subject: s.id, chapter: chapter.id }, "created", null, {
      name: chapter.name,
      topics: chapter.topics.length,
    });
  }
  for (const c of byType("unit rename")) {
    const s = subject(c.prism!.subject);
    const chapter = s.chapters.find((x) => x.id === c.prism!.chapter)!;
    log(
      { kind: "chapter", subject: s.id, chapter: chapter.id },
      "name",
      chapter.name,
      c.handout!.unit,
    );
    chapter.name = c.handout!.unit!;
    Object.assign(chapter, VERIFIED);
  }
  for (const c of byType("topic missing")) {
    const s = subject(c.to!.subject!);
    const chapter = s.chapters.find((x) => x.id === c.to!.chapter)!;
    const [topic] = topicsFrom([c.handout!.topic!], topicIds(s), VERIFIED);
    chapter.topics.push(topic);
    log({ kind: "topic", subject: s.id, chapter: chapter.id, topic: topic.id }, "created", null, {
      name: topic.name,
    });
  }
  const orders = new Map<string, Map<string, number>>();
  for (const c of byType("unit wrong order")) {
    const m = orders.get(c.prism!.subject) ?? new Map<string, number>();
    m.set(c.prism!.chapter!, c.to!.order!);
    orders.set(c.prism!.subject, m);
  }
  for (const [id, wanted] of orders) {
    const s = subject(id);
    const before = s.chapters.map((x) => x.id);
    const placed = s.chapters
      .filter((x) => wanted.has(x.id))
      .sort((a, b) => wanted.get(a.id)! - wanted.get(b.id)!);
    const slots = s.chapters.map((x, i) => (wanted.has(x.id) ? i : -1)).filter((i) => i >= 0);
    slots.forEach((slotIndex, k) => (s.chapters[slotIndex] = placed[k]));
    log(
      { kind: "subject", subject: id },
      "chapter order",
      before,
      s.chapters.map((x) => x.id),
    );
  }
  for (const c of changes.filter((x) => x.retire && x.prism?.chapter)) {
    const s = subject(c.prism!.subject);
    const chapter = s.chapters.find((x) => x.id === c.prism!.chapter);
    if (!chapter) continue;
    if (!c.prism!.topic) {
      chapter.status = "retired";
      log({ kind: "chapter", subject: s.id, chapter: chapter.id }, "status", "active", "retired");
      continue;
    }
    const topic = chapter.topics.find((t) => t.id === c.prism!.topic);
    if (!topic) continue;
    topic.status = "retired";
    log(
      { kind: "topic", subject: s.id, chapter: chapter.id, topic: topic.id },
      "status",
      "active",
      "retired",
    );
  }

  // Every matched course is now confirmed by its handout.
  for (const m of result.matched) {
    const s = subject(m.subject);
    const h = handoutBy.get(`${m.branch}/${m.sem}/${m.title}`)!;
    // An existing course the handout calls a lab (e.g. Engineering Graphics) stays listed:
    // labs are hidden until Phase 7B, and students already study these. Flag it instead.
    const type = h.courseType === "practical" ? (s.courseType ?? "theory") : h.courseType;
    if (h.courseType === "practical" && s.courseType !== "practical")
      review.push({
        branch: m.branch,
        sem: m.sem,
        reason: "existing course is a lab in the handout",
        detail: `${s.id} kept listed as ${type}; "${h.title}" is practical in the handout (decide in Phase 7B)`,
      });
    const before = { source: s.source, confidence: s.confidence, courseType: s.courseType };
    Object.assign(s, VERIFIED, { courseType: type });
    if (before.source !== s.source || before.courseType !== s.courseType)
      log({ kind: "subject", subject: s.id }, "source, confidence, courseType", before, {
        ...VERIFIED,
        courseType: type,
      });
    // Keep the handbook entry in step with the handout (units, code, L-T-P).
    if (s.offerings?.some((o) => o.branch === h.branch)) ensureOffering(s, h);
  }

  // 3. New courses, and the owner's decisions 1 and 2.
  const add = (h: HandoutCourse) => {
    const s = createSubject(h);
    if (s) subjectOf.set(`${h.branch}/${h.sem}/${h.title}`, s.id);
  };
  for (const c of byType("new course")) add(handoutOf(c));
  const aiSource = subjects.get(AI_DRAFT_FROM)?.data;
  if (!aiSource) throw new Error(`${AI_DRAFT_FROM} not found`);
  for (const [branch, sem] of [
    ["ict", 3],
    ["ece", 3],
  ] as const) {
    const h: HandoutCourse = {
      branch,
      sem,
      code: null,
      title: "Introduction to Artificial Intelligence",
      courseType: "theory",
      units: [],
      experiments: [],
      related: [],
      pages: "none (listed in the course table only)",
      source: `${FOLDER[branch]}/sem${sem} course table`,
    };
    const chapters = aiSource.chapters
      .filter((ch) => ch.status !== "retired")
      .map((ch) => ({
        id: ch.id,
        name: ch.name,
        ...(ch.hours ? { hours: ch.hours } : {}),
        topics: ch.topics.map((t) => ({ id: t.id, name: t.name })),
      }));
    createSubject(h, {
      chapters,
      source: "official_site",
      confidence: "unverified",
      syllabusSource: {
        kind: "university",
        title: `PDEU ${FOLDER[branch]} semester ${sem}: Introduction to Artificial Intelligence (Department Specific)`,
        note: `Draft: the ${FOLDER[branch]} course table lists this course but no handout page was available, so its chapters and topics are copied from ${aiSource.name} (${AI_DRAFT_FROM}) as a starting point. Unverified: replace with the real ${FOLDER[branch]} handout when it arrives.`,
      },
    });
  }

  // 4. Labs: reuse the few Prism already has, otherwise add them (with their experiments).
  for (const c of byType("new practical course")) {
    const h = handoutOf(c);
    if (h.experiments.length === 0) {
      // No experiment list in the handout: listed with no experiments yet, unverified, so the
      // upload banner asks students for the lab's handout.
      const s = createSubject(h, {
        chapters: [],
        confidence: "unverified",
        syllabusSource: {
          kind: "university",
          title: `PDEU course handout 2024-25 (${FOLDER[h.branch]} semester ${h.sem}): ${h.title}`,
          note: `The handout (pages ${h.pages} of ${h.source}) lists this lab but no experiments that could be read. Unverified: experiments come from a student's upload.`,
        },
      });
      if (s) subjectOf.set(`${h.branch}/${h.sem}/${h.title}`, s.id);
      continue;
    }
    add(h);
  }
  // Theory course ↔ its lab.
  for (const h of handouts) {
    const mine = subjectOf.get(`${h.branch}/${h.sem}/${h.title}`);
    if (!mine) continue;
    for (const title of h.related) {
      const other = subjectOf.get(`${h.branch}/${h.sem}/${title}`);
      if (!other || other === mine) continue;
      const s = subject(mine);
      const list = (s.relatedCourses ??= []);
      if (!list.includes(other)) list.push(other);
    }
  }

  // ME's handbook file is the old 2016-19 scheme: retire its courses that no 2024-25 handout
  // matched (not sem 8, internships, seminars or projects: those handouts are incomplete).
  const me = handbooks.get("me")!;
  for (const c of me.subjects) {
    if (c.source === "handout" || c.retired || c.semester === 8) continue;
    if (/internship|seminar|project|orientation|training|yoga|nss|ncc/i.test(c.name)) continue;
    c.retired = true;
    modified.add(`${HANDBOOK}/me.json`);
    log(
      { kind: "branch" },
      `handbook me/${c.key} retired (old scheme, in no handout)`,
      false,
      true,
    );
  }

  // 5. New branches (owner's decision in Phase 0).
  const branchFile = readJson<{
    branches: { id: string; name: string; short: string; wave: number }[];
  }>(BRANCHES_FILE);
  for (const b of [
    { id: "elec", name: "Electrical Engineering", short: "Electrical", wave: 4 },
    { id: "chem", name: "Chemical Engineering", short: "Chemical", wave: 4 },
  ])
    if (!branchFile.branches.some((x) => x.id === b.id)) {
      branchFile.branches.push(b);
      log({ kind: "branch" }, `branch ${b.id}`, null, b);
    }

  const keepFrom = process.argv.find((a) => a.startsWith("--keep-ids-from="))?.split("=")[1];
  const keptIds = keepFrom ? keepPublished(keepFrom) : 0;
  if (keepFrom) console.log(`Kept ${keptIds} published ids from ${keepFrom}.`);

  for (const { file, data } of subjects.values()) {
    if (created.has(file)) linkNewTopics(data, () => true);
    else if (modified.has(file)) {
      const before = originalTopics.get(data.id)!;
      linkNewTopics(data, (t) => !before.has(t.id));
    }
  }

  // ---------- write ----------
  for (const { file, data } of subjects.values())
    if (modified.has(file) || created.has(file))
      writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  for (const [b, hb] of handbooks)
    if (modified.has(`${HANDBOOK}/${b}.json`))
      writeFileSync(`${HANDBOOK}/${b}.json`, `${JSON.stringify(hb, null, 2)}\n`);
  writeFileSync(SUBJECT_MAP, `${JSON.stringify(subjectMap, null, 2)}\n`);
  writeFileSync(BRANCHES_FILE, `${JSON.stringify(branchFile, null, 2)}\n`);
  modified.add(SUBJECT_MAP).add(BRANCHES_FILE);

  const stale = readJson<{ version: 1; topics: Record<string, string> }>(STALE);
  for (const k of staleKeys) stale.topics[`${k.subject}/${k.topic}`] = now;
  writeFileSync(STALE, `${JSON.stringify(stale, null, 2)}\n`);
  modified.add(STALE);

  const lock = readJson<{ note: string; ids: string[] }>(LOCK);
  const known = new Set(lock.ids);
  for (const { data } of subjects.values())
    for (const ch of data.chapters)
      for (const t of ch.topics) {
        const id = `${data.id}/${ch.id}/${t.id}`;
        if (!known.has(id)) {
          lock.ids.push(id);
          known.add(id);
        }
      }
  writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
  modified.add(LOCK);

  const text = readFileSync(HISTORY, "utf8");
  writeFileSync(HISTORY, text + formatHistory(history));
  modified.add(HISTORY);

  mkdirSync(path.dirname(MANIFEST), { recursive: true });
  const norm = (f: string) => f.replaceAll("\\", "/");
  writeFileSync(
    MANIFEST,
    `${JSON.stringify(
      {
        appliedAt: now,
        gitTag: TAG,
        modified: [...modified]
          .filter((f) => !created.has(f))
          .map(norm)
          .sort(),
        created: [...created].map(norm).sort(),
        notApplied: review,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `${NAME} up: ${modified.size} files changed, ${created.size} subject files created, ${history.length} history entries, ${staleKeys.length} topics marked stale, ${review.length} items not applied (see ${MANIFEST}).`,
  );
}

function down(): void {
  if (!existsSync(MANIFEST)) throw new Error(`${NAME} is not applied (no ${MANIFEST}).`);
  const m = readJson<{ gitTag: string; modified: string[]; created: string[] }>(MANIFEST);
  const keep = m.modified.filter((f) => f !== HISTORY);
  execFileSync("git", ["checkout", m.gitTag, "--", ...keep]);
  for (const f of m.created) rmSync(f, { force: true });
  const { entries } = parseHistory(readFileSync(HISTORY, "utf8"));
  const undo = historyEntry({
    actor: { kind: "script", id: NAME },
    cause: `migration ${NAME} down`,
    target: { kind: "catalogue" },
    field: "all changes of the Phase 2 handout import",
    oldValue: null,
    newValue: null,
  });
  let all = entries;
  for (const e of entries.filter((x) => x.cause === CAUSE && !x.reverted))
    all = markReverted(all, e.id, undo.id);
  writeFileSync(HISTORY, formatHistory([...all, undo]));
  rmSync(MANIFEST);
  console.log(
    `${NAME} down: restored ${keep.length} files from ${m.gitTag}, removed ${m.created.length} created files.`,
  );
}

const direction = process.argv[2];
if (direction === "up") up();
else if (direction === "down") down();
else {
  console.error(`Usage: ${NAME}.ts up|down`);
  process.exit(1);
}
