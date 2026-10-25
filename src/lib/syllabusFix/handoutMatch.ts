import { sameTopic } from "@/lib/custom/matchSyllabus";
import { nameSimilarity, singular } from "@/lib/university/match";
import { normalize } from "@/lib/topicSearch";
import type { CourseType, ParsedExperiment, ParsedUnit } from "@/lib/syllabusFix/handoutCourse";

/*
 * Compare parsed handouts with Prism's syllabus and list what would have to change (syllabus fix,
 * Phase 2 dry run). Pure: nothing is changed here. Every planned change is a move, a link, an
 * addition or a soft retirement; anything below a confident match goes to `needsReview`.
 */

export type HandoutCourse = {
  branch: string;
  sem: number;
  code: string | null;
  title: string;
  courseType: CourseType;
  units: ParsedUnit[];
  experiments: ParsedExperiment[];
  related: string[];
  pages: string;
  source: string;
};

export type PrismTopic = { id: string; name: string };
export type PrismChapter = { id: string; name: string; topics: PrismTopic[] };
export type PrismOffering = { branch: string; semester: number; code?: string; kind?: string };
export type PrismCourse = {
  id: string;
  name: string;
  code?: string;
  courseCategory?: string;
  offerings: PrismOffering[];
  chapters: PrismChapter[];
};

export type OutlineCourse = { branch: string; sem: number | null; name: string; fileSem: number };

export type ChangeType =
  | "course missing from branch/semester"
  | "course in wrong semester"
  | "course in wrong branch"
  | "unit under wrong course"
  | "unit wrong order"
  | "unit missing"
  | "unit rename"
  | "topic under wrong unit"
  | "topic missing"
  | "topic split"
  | "extra item not in any handout"
  | "new course"
  | "new practical course";

export type Change = {
  type: ChangeType;
  branch: string;
  sem: number;
  /** What the change does, in plain words. */
  detail: string;
  /** The handout side (course title, unit, topic). */
  handout?: { course: string; code: string | null; unit?: string; topic?: string; pages?: string };
  /** The Prism side (ids). */
  prism?: { subject: string; chapter?: string; topic?: string };
  /** For moves: where it goes. */
  to?: { subject?: string; chapter?: string; semester?: number; branch?: string; order?: number };
  /** Retire (soft-delete) instead of move/add. */
  retire?: boolean;
  /** Topic split: the handout topics one old topic becomes (the first keeps the old id). */
  pieces?: string[];
};

export type ReviewItem = {
  branch: string;
  sem: number;
  reason: string;
  detail: string;
  /** The handout course it is about, when there is one. */
  course?: { title: string; code: string | null };
};

export type MatchResult = {
  changes: Change[];
  needsReview: ReviewItem[];
  /** Handout course → Prism subject id, for confident matches. */
  matched: { branch: string; sem: number; title: string; subject: string; how: string }[];
};

export type MatchOptions = {
  /** Branch/semester pairs whose handouts are known to be incomplete: never retire there. */
  incomplete: (branch: string, sem: number) => boolean;
  /** Branches covered by handouts. Prism courses of other branches are never touched. */
  branches: readonly string[];
};

/**
 * Confident match thresholds. Between `review` and confident = a weak match: sent to
 * needs_review, never applied. Below `review` = no match at all.
 */
export const MATCH = { name: 0.85, nameWithTopics: 0.6, topics: 0.3, review: 0.4, unit: 0.35 };

/** A weak (unsure) course match still needs this much evidence; less is no match. */
export const WEAK = { name: 0.6, topics: 0.2 };

/** Words that say nothing about what a course or topic is (owner's decision, Phase 2). */
const GENERIC = /\b(?:introduction|intro|basics?|overview|applications?|fundamentals?)\b/gi;

/** "Digital Circuits (ICT)" → "Digital Circuits": Prism adds a branch tag to per-branch copies. */
function plainName(name: string): string {
  return name.replace(
    /\s*\((?:ict|ce|ece|me|civil|petro|biotech|ece\s*\/\s*civil|[a-z ,/&]+)\)\s*$/i,
    "",
  );
}

function isRealCode(code: string | null | undefined): code is string {
  return !!code && !code.startsWith("UG_") && !/[xX*]/.test(code.slice(4));
}

function prismCodes(p: PrismCourse): string[] {
  return [p.code, ...p.offerings.map((o) => o.code)].filter(isRealCode).map((c) => c.toUpperCase());
}

const STOP = new Set([
  ..."a an and the of in on to for with by using its their is are as at from into via etc or".split(
    " ",
  ),
  ..."introduction intro basic basics overview application applications fundamental fundamentals".split(
    " ",
  ),
]);
const wordCache = new Map<string, string[]>();
function words(text: string): string[] {
  const hit = wordCache.get(text);
  if (hit) return hit;
  const out = normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(singular);
  wordCache.set(text, out);
  return out;
}

function plainWords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !["a", "an", "and", "the", "of", "etc"].includes(w))
    .map(singular);
}

/**
 * Same topic, allowing different splitting: the old data has "Excess-3 codes, Logic Gates, and
 * Truth Table" as one topic where a new handout has three. A topic counts as covered when it
 * means the same, or when all its words sit inside the other topic (either way round).
 */
export function covers(a: string, b: string): boolean {
  if (sameTopic(a, b)) return true;
  let wa = words(a);
  let wb = words(b);
  // A topic made only of generic words ("Introduction", "Applications") is compared by its
  // plain words, so it still finds itself in the handout.
  if (wa.length === 0 || wb.length === 0) {
    wa = plainWords(a);
    wb = plainWords(b);
  }
  if (wa.length === 0 || wb.length === 0) return false;
  const inB = wa.every((w) => wb.includes(w));
  const inA = wb.every((w) => wa.includes(w));
  return inB || inA;
}

/** Every word of `piece` is in `whole`. */
function containedIn(piece: string, whole: string): boolean {
  const wp = words(piece).length ? words(piece) : plainWords(piece);
  const ww = words(whole).length ? words(whole) : plainWords(whole);
  return wp.length > 0 && wp.every((w) => ww.includes(w));
}

/** A split must keep this share of the old topic's words. */
export const SPLIT_COVERAGE = 0.8;

/** Share of the old topic's words that the pieces carry. */
function splitCoverage(old: string, pieces: readonly string[]): number {
  const ow = plainWords(old);
  if (ow.length === 0) return 1;
  const pw = new Set(pieces.flatMap(plainWords));
  return ow.filter((w) => pw.has(w)).length / ow.length;
}

function handoutTopics(h: HandoutCourse): string[] {
  return h.units.flatMap((u) => [u.name, ...u.topics]);
}

function prismTopicNames(p: PrismCourse): string[] {
  return p.chapters.flatMap((c) => c.topics.map((t) => t.name));
}

/** Share of the handout's topics that Prism's course also lists. */
function topicOverlap(texts: readonly string[], names: readonly string[]): number {
  if (texts.length === 0 || names.length === 0) return 0;
  return texts.filter((t) => names.some((n) => sameTopic(t, n))).length / texts.length;
}

/** Share of the handout's topics covered by the course, allowing different splitting. */
function looseOverlap(texts: readonly string[], names: readonly string[]): number {
  if (texts.length === 0) return 1;
  if (names.length === 0) return 0;
  return texts.filter((t) => names.some((n) => covers(t, n))).length / texts.length;
}

/** Below this, a same-named course of another branch is a different syllabus. */
export const CROSS_BRANCH_OVERLAP = 0.5;

type Scored = {
  course: PrismCourse;
  score: number;
  how: string;
  confident: boolean;
  /** Name similarity and topic overlap (1 and 1 for a code match). */
  name: number;
  overlap: number;
};

const NUMERAL: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
};

/** "Mathematics – III" → {3}; numbers that tell courses of a series apart. */
function numerals(name: string): Set<number> {
  const out = new Set<number>();
  for (const w of normalize(name).split(" ")) {
    if (/^[1-8]$/.test(w)) out.add(Number(w));
    else if (w in NUMERAL) out.add(NUMERAL[w]);
  }
  return out;
}

const LAB_WORD = /\b(?:lab|laboratory|practicals?)\b/i;

/**
 * Names that look alike but are different courses: "Mathematics I" vs "Mathematics III", or a
 * course vs its lab. (nameSimilarity ignores numbers and "lab" on purpose, for student uploads.)
 */
function differentCourse(a: string, b: string): boolean {
  const na = numerals(a);
  const nb = numerals(b);
  if (na.size && nb.size && ![...na].some((n) => nb.has(n))) return true;
  return LAB_WORD.test(a) !== LAB_WORD.test(b);
}

/**
 * The course's name without notes in brackets ("(For ME/CL/CH/BT)", "(Department Specific)",
 * or one cut off by a line break: "(Department"), without generic words ("Introduction to",
 * "Basics of", "Applications"), and with a known handout typo fixed.
 */
function courseName(name: string): string {
  return name
    .replace(/\([^)]*\)?/g, " ")
    .replace(/\bintoduction\b/gi, "Introduction")
    .replace(GENERIC, " ")
    .replace(/\bmaths?\b/gi, "Mathematics")
    .replace(/\bengg\b\.?/gi, "Engineering")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreCourse(h: HandoutCourse, p: PrismCourse): Scored | null {
  if (isRealCode(h.code) && prismCodes(p).includes(h.code.toUpperCase()))
    return { course: p, score: 1, how: `code ${h.code}`, confident: true, name: 1, overlap: 1 };
  const title = courseName(h.title);
  const theirs = courseName(plainName(p.name));
  if (differentCourse(title, theirs)) return null;
  const name = nameSimilarity(title, theirs);
  if (name < 0.3) return null;
  const overlap = topicOverlap(handoutTopics(h), prismTopicNames(p));
  const confident = name >= MATCH.name || (name >= MATCH.nameWithTopics && overlap >= MATCH.topics);
  const score = Math.max(name, overlap >= 0.4 ? 0.5 + overlap / 2 : 0);
  if (!confident && score < MATCH.review) return null;
  return {
    course: p,
    score: confident ? Math.max(score, name) : score,
    how: `name ${name.toFixed(2)}, topics ${overlap.toFixed(2)}`,
    name,
    overlap,
    confident,
  };
}

/** Prefer the copy already offered to this branch and semester, then this branch, then any. */
function placeRank(p: PrismCourse, branch: string, sem: number): number {
  if (p.offerings.some((o) => o.branch === branch && o.semester === sem)) return 2;
  if (p.offerings.some((o) => o.branch === branch)) return 1;
  return 0;
}

export function bestCourse(
  h: HandoutCourse,
  catalogue: readonly PrismCourse[],
): { best: Scored | null; others: Scored[] } {
  const ranked = catalogue
    .map((p) => scoreCourse(h, p))
    .filter((s): s is Scored => s !== null)
    .sort(
      (a, b) =>
        Number(b.confident) - Number(a.confident) ||
        b.score - a.score ||
        placeRank(b.course, h.branch, h.sem) - placeRank(a.course, h.branch, h.sem),
    );
  const top = ranked[0];
  if (!top?.confident) return { best: null, others: ranked.slice(0, 3) };
  // Several equally good copies (common first-year courses): take the one in this branch.
  const ties = ranked.filter((r) => r.confident && r.score >= top.score - 0.05);
  ties.sort((a, b) => placeRank(b.course, h.branch, h.sem) - placeRank(a.course, h.branch, h.sem));
  return { best: ties[0], others: ranked.filter((r) => r !== ties[0]).slice(0, 3) };
}

type UnitPair = {
  unit: ParsedUnit;
  unitIndex: number;
  chapter: PrismChapter;
  chapterIndex: number;
};

function unitScore(u: ParsedUnit, c: PrismChapter): number {
  const names = c.topics.map((t) => t.name);
  const hits = u.topics.filter((t) => names.some((n) => covers(t, n))).length;
  const overlap = hits / Math.max(1, Math.min(u.topics.length, names.length));
  return 0.5 * nameSimilarity(u.name, c.name) + overlap;
}

/** Share of the unit's topics with a same-meaning topic in the chapter (needs 3+ hits). */
function strictUnitScore(u: ParsedUnit, c: PrismChapter): number {
  const hits = u.topics.filter((t) => c.topics.some((x) => sameTopic(t, x.name))).length;
  return hits >= 3 ? hits / u.topics.length : 0;
}

/** Pair handout units with Prism chapters, best pairs first. */
function pairUnits(units: readonly ParsedUnit[], chapters: readonly PrismChapter[]): UnitPair[] {
  const options: (UnitPair & { score: number })[] = [];
  units.forEach((unit, unitIndex) =>
    chapters.forEach((chapter, chapterIndex) => {
      const score = unitScore(unit, chapter);
      if (score >= MATCH.unit) options.push({ unit, unitIndex, chapter, chapterIndex, score });
    }),
  );
  options.sort((a, b) => b.score - a.score);
  const usedU = new Set<number>();
  const usedC = new Set<number>();
  const pairs: UnitPair[] = [];
  for (const o of options) {
    if (usedU.has(o.unitIndex) || usedC.has(o.chapterIndex)) continue;
    usedU.add(o.unitIndex);
    usedC.add(o.chapterIndex);
    pairs.push(o);
  }
  return pairs.sort((a, b) => a.unitIndex - b.unitIndex);
}

function compareUnits(
  h: HandoutCourse,
  p: PrismCourse,
  branchCourses: readonly PrismCourse[],
  out: MatchResult,
): void {
  const base = { branch: h.branch, sem: h.sem };
  const ref = { course: h.title, code: h.code, pages: h.pages };
  const pairs = pairUnits(h.units, p.chapters);
  // Placeholder chapter names from the old extraction ("Unit 1", "18") take the handout's name.
  for (const x of pairs)
    if (/^(?:unit\s*[-:]?\s*[ivx\d]+|\d+)$/i.test(x.chapter.name.trim()) && x.unit.name)
      out.changes.push({
        ...base,
        type: "unit rename",
        detail: `Rename chapter "${x.chapter.name}" to "${x.unit.name}"`,
        handout: { ...ref, unit: x.unit.name },
        prism: { subject: p.id, chapter: x.chapter.id },
      });
  // Order: matched chapters should appear in the handout's unit order.
  const outOfOrder = pairs.some((x, i) => i > 0 && x.chapterIndex < pairs[i - 1].chapterIndex);
  if (outOfOrder)
    for (const x of pairs)
      if (x.chapterIndex !== x.unitIndex)
        out.changes.push({
          ...base,
          type: "unit wrong order",
          detail: `Move chapter "${x.chapter.name}" to position ${x.unitIndex + 1}`,
          handout: { ...ref, unit: x.unit.name },
          prism: { subject: p.id, chapter: x.chapter.id },
          to: { order: x.unitIndex + 1 },
        });

  const allTopics = p.chapters.flatMap((c) => c.topics.map((t) => ({ chapter: c, topic: t })));
  const pairedChapters = new Set(pairs.map((x) => x.chapter.id));
  const claimedTopics = new Set<string>();
  const movedTopics = new Set<string>();
  const splits = new Map<string, { chapter: PrismChapter; topic: PrismTopic; pieces: string[] }>();

  h.units.forEach((unit, unitIndex) => {
    const pair = pairs.find((x) => x.unitIndex === unitIndex);
    if (!pair) {
      // Is this unit sitting under another course of the branch? Strict: most of the unit's
      // topics must mean the same as that chapter's (loose word overlap would find "Yoga").
      const elsewhere = branchCourses
        .filter((o) => o.id !== p.id)
        .flatMap((o) => o.chapters.map((c) => ({ o, c, s: strictUnitScore(unit, c) })))
        .sort((a, b) => b.s - a.s)[0];
      if (elsewhere && elsewhere.s >= 0.6) {
        out.changes.push({
          ...base,
          type: "unit under wrong course",
          detail: `Move chapter "${elsewhere.c.name}" from ${elsewhere.o.id} to ${p.id} (unit ${unitIndex + 1})`,
          handout: { ...ref, unit: unit.name },
          prism: { subject: elsewhere.o.id, chapter: elsewhere.c.id },
          to: { subject: p.id, order: unitIndex + 1 },
        });
      } else {
        out.changes.push({
          ...base,
          type: "unit missing",
          detail: `Add unit ${unitIndex + 1} "${unit.name}" (${unit.topics.length} topics) to ${p.id}`,
          handout: { ...ref, unit: unit.name },
          to: { subject: p.id, order: unitIndex + 1 },
        });
      }
      return;
    }
    for (const topic of unit.topics) {
      const here =
        pair.chapter.topics.find((t) => sameTopic(topic, t.name)) ??
        pair.chapter.topics.find((t) => covers(topic, t.name));
      if (here) {
        claimedTopics.add(here.id);
        // The old topic holds this handout topic and more ("Excess-3 codes, Logic Gates, and
        // Truth Table" ⊃ "Logic Gates"): collect the pieces to split it later.
        // A handout topic inside it joins the group, in handout order; 2+ means a split. One
        // that is wider than the old topic ("Pointer arithmetic" vs "Pointer") is not a piece.
        if (sameTopic(topic, here.name) || containedIn(topic, here.name)) {
          const group = splits.get(here.id) ?? { chapter: pair.chapter, topic: here, pieces: [] };
          group.pieces.push(topic);
          splits.set(here.id, group);
        }
        continue;
      }
      const other = allTopics.find(
        (x) =>
          x.chapter.id !== pair.chapter.id &&
          !movedTopics.has(x.topic.id) &&
          covers(topic, x.topic.name),
      );
      if (other) {
        movedTopics.add(other.topic.id);
        claimedTopics.add(other.topic.id);
        out.changes.push({
          ...base,
          type: "topic under wrong unit",
          detail: `Move topic "${other.topic.name}" from chapter "${other.chapter.name}" to "${pair.chapter.name}"`,
          handout: { ...ref, unit: unit.name, topic },
          prism: { subject: p.id, chapter: other.chapter.id, topic: other.topic.id },
          to: { subject: p.id, chapter: pair.chapter.id },
        });
      } else {
        out.changes.push({
          ...base,
          type: "topic missing",
          detail: `Add topic "${topic}" to chapter "${pair.chapter.name}"`,
          handout: { ...ref, unit: unit.name, topic },
          to: { subject: p.id, chapter: pair.chapter.id },
        });
      }
    }
  });

  for (const [id, g] of splits) {
    // Only split when the pieces carry (nearly) all of the old topic, so nothing is lost.
    if (g.pieces.length < 2 || splitCoverage(g.topic.name, g.pieces) < SPLIT_COVERAGE) continue;
    out.changes.push({
      ...base,
      type: "topic split",
      detail: `Split topic "${g.topic.name}" into ${g.pieces.map((x) => `"${x}"`).join(", ")} (first keeps id ${id})`,
      handout: ref,
      prism: { subject: p.id, chapter: g.chapter.id, topic: id },
      pieces: g.pieces,
    });
  }

  // Prism chapters and topics the handout doesn't list anywhere.
  const texts = handoutTopics(h);
  for (const c of p.chapters) {
    if (!pairedChapters.has(c.id)) {
      out.changes.push({
        ...base,
        type: "extra item not in any handout",
        detail: `Retire chapter "${c.name}" (${c.topics.length} topics) of ${p.id}`,
        handout: ref,
        prism: { subject: p.id, chapter: c.id },
        retire: true,
      });
      continue;
    }
    for (const t of c.topics) {
      if (claimedTopics.has(t.id) || texts.some((x) => covers(x, t.name))) continue;
      out.changes.push({
        ...base,
        type: "extra item not in any handout",
        detail: `Retire topic "${t.name}" in chapter "${c.name}"`,
        handout: ref,
        prism: { subject: p.id, chapter: c.id, topic: t.id },
        retire: true,
      });
    }
  }
}

/**
 * The whole dry run: course level first (match, missing, wrong semester/branch, new), then
 * units and topics inside every confidently matched course, then Prism courses no handout has.
 */
export function matchHandouts(
  handouts: readonly HandoutCourse[],
  catalogue: readonly PrismCourse[],
  outline: readonly OutlineCourse[],
  options: MatchOptions,
): MatchResult {
  const out: MatchResult = { changes: [], needsReview: [], matched: [] };
  const usedFor = new Map<string, Set<string>>(); // subject id → branches that matched it
  const editedBy = new Map<string, string>(); // subject id → the branch/sem whose handout edits it
  const theoryCatalogue = catalogue;
  // A code printed on two courses of one semester (a lab page with its theory course's code)
  // says nothing about which is which: match those two by name instead.
  const codeCount = new Map<string, number>();
  for (const h of handouts)
    if (h.code)
      codeCount.set(
        `${h.branch}/${h.sem}/${h.code}`,
        (codeCount.get(`${h.branch}/${h.sem}/${h.code}`) ?? 0) + 1,
      );

  for (const original of handouts) {
    const ambiguous =
      (codeCount.get(`${original.branch}/${original.sem}/${original.code}`) ?? 0) > 1;
    const h = ambiguous ? { ...original, code: null } : original;
    const base = { branch: h.branch, sem: h.sem };
    const ref = { course: h.title, code: original.code, pages: h.pages };
    if (h.courseType === "practical") {
      // Prism kept a few lab courses: reuse them (labs only ever match labs). Another branch's
      // lab is only reused when its experiments are this lab's too.
      let lab = bestCourse(h, theoryCatalogue).best;
      if (lab && !lab.course.offerings.some((o) => o.branch === h.branch)) {
        const overlap = looseOverlap(
          h.experiments.map((e) => e.title),
          prismTopicNames(lab.course),
        );
        if (overlap < CROSS_BRANCH_OVERLAP) lab = null;
      }
      if (lab) {
        out.matched.push({ ...base, title: h.title, subject: lab.course.id, how: lab.how });
        (
          usedFor.get(lab.course.id) ?? usedFor.set(lab.course.id, new Set()).get(lab.course.id)!
        ).add(`${h.branch}/${h.sem}`);
        const at = lab.course.offerings.filter((o) => o.branch === h.branch);
        if (!at.some((o) => o.semester === h.sem))
          out.changes.push({
            ...base,
            type: at.length ? "course in wrong semester" : "course missing from branch/semester",
            detail: `${at.length ? "Move" : "Link"} lab ${lab.course.id} to ${h.branch} sem ${h.sem} (${lab.how})`,
            handout: ref,
            prism: { subject: lab.course.id },
            to: { branch: h.branch, semester: h.sem },
          });
        continue;
      }
      out.changes.push({
        ...base,
        type: "new practical course",
        detail: `Add lab "${h.title}" (${h.experiments.length} experiments)${h.related.length ? `, related to ${h.related.join(", ")}` : ""}`,
        handout: ref,
      });
      continue;
    }
    const { best, others } = bestCourse(h, theoryCatalogue);
    if (!best) {
      // A weak match needs some evidence: a close name or shared topics. One shared word and no
      // shared topics ("Engineering Mechanics" vs "Fluid Mechanics") is no match at all. Another
      // branch's course with a different syllabus is not this course either (owner's decision 2).
      const plausible = others.filter((o) => {
        if (o.name < WEAK.name && o.overlap < WEAK.topics) return false;
        const elsewhere = !o.course.offerings.some((x) => x.branch === h.branch);
        return !(
          elsewhere &&
          h.units.length > 0 &&
          looseOverlap(handoutTopics(h), prismTopicNames(o.course)) < CROSS_BRANCH_OVERLAP
        );
      });
      if (plausible.length) {
        out.needsReview.push({
          ...base,
          reason: "unsure course match",
          course: { title: h.title, code: original.code },
          detail: `"${h.title}" (${h.code ?? "no code"}) might be ${plausible.map((o) => `${o.course.id} (${o.how})`).join(" or ")}`,
        });
      } else {
        out.changes.push({
          ...base,
          type: "new course",
          detail: `Add course "${h.title}" (${h.code ?? "no code"}, ${h.units.length} units)`,
          handout: ref,
        });
      }
      continue;
    }
    const p = best.course;
    const here = p.offerings.filter((o) => o.branch === h.branch);
    const loose = looseOverlap(handoutTopics(h), prismTopicNames(p));
    // Another branch's course with the same name but a different syllabus (e.g. ICT's and CE's
    // Machine Learning): linking it would show ICT students CE's topics, and editing it would
    // change CE's course. A person decides: link anyway, or give this branch its own course.
    // Owner's decision 2 (2026-10-25): such a course gets its own copy for this branch.
    // Linking another branch's course needs the same code, or real shared topics as well.
    const differentSyllabus =
      loose < CROSS_BRANCH_OVERLAP || (!best.how.startsWith("code") && best.overlap < MATCH.topics);
    if (here.length === 0 && h.units.length > 0 && differentSyllabus) {
      out.changes.push({
        ...base,
        type: "new course",
        detail: `Add course "${h.title}" (${h.code ?? "no code"}, ${h.units.length} units): same name as ${p.id}, but only ${Math.round(loose * 100)}% of its topics are in it`,
        handout: ref,
      });
      continue;
    }
    out.matched.push({ ...base, title: h.title, subject: p.id, how: best.how });
    (usedFor.get(p.id) ?? usedFor.set(p.id, new Set()).get(p.id)!).add(`${h.branch}/${h.sem}`);
    if (here.length === 0) {
      out.changes.push({
        ...base,
        type: "course missing from branch/semester",
        detail: `Link ${p.id} to ${h.branch} sem ${h.sem} (${best.how})`,
        handout: ref,
        prism: { subject: p.id },
        to: { branch: h.branch, semester: h.sem },
      });
    } else if (!here.some((o) => o.semester === h.sem)) {
      out.changes.push({
        ...base,
        type: "course in wrong semester",
        detail: `Move ${p.id} for ${h.branch} from sem ${here.map((o) => o.semester).join("/")} to sem ${h.sem}`,
        handout: ref,
        prism: { subject: p.id },
        to: { branch: h.branch, semester: h.sem },
      });
    }
    // Units and topics are only edited from this branch's own handout. A course linked in from
    // another branch keeps its content (its own branch's handout decides that).
    // A course shared by several branches takes its units and topics from one handout only
    // (the first branch that matched it); the others just link to it.
    const editor = editedBy.get(p.id);
    if (h.units.length > 0 && here.length > 0 && (!editor || editor === `${h.branch}/${h.sem}`)) {
      editedBy.set(p.id, `${h.branch}/${h.sem}`);
      const branchCourses = catalogue.filter((c) => c.offerings.some((o) => o.branch === h.branch));
      const from = out.changes.length;
      compareUnits(h, p, branchCourses, out);
      const others = [...new Set(p.offerings.map((o) => o.branch))].filter((b) => b !== h.branch);
      if (others.length)
        for (const c of out.changes.slice(from))
          c.detail += ` [course shared with ${others.join(", ")}]`;
    }
  }

  // Course-table rows with no handout page: suggest, never apply.
  const handoutKey = (branch: string) => handouts.filter((h) => h.branch === branch);
  for (const row of outline) {
    if (/elective|internship|seminar|project|lab(?:oratory)?\b|yoga|nss|ncc/i.test(row.name))
      continue;
    const covered = handoutKey(row.branch).some(
      (h) => nameSimilarity(h.title, row.name) >= MATCH.review,
    );
    if (covered) continue;
    const fake: HandoutCourse = {
      branch: row.branch,
      sem: row.sem ?? row.fileSem,
      code: null,
      title: row.name,
      courseType: "theory",
      units: [],
      experiments: [],
      related: [],
      pages: "table",
      source: "course table",
    };
    const { best } = bestCourse(fake, catalogue);
    const offered =
      best && best.course.offerings.some((o) => o.branch === row.branch && o.semester === fake.sem);
    if (offered) continue;
    out.needsReview.push({
      branch: row.branch,
      sem: fake.sem,
      reason: "in course table, no handout page",
      detail: best
        ? `"${row.name}" (sem ${row.sem ?? "?"} in the table) matches ${best.course.id}: link it to ${row.branch} sem ${fake.sem}?`
        : `"${row.name}" (sem ${row.sem ?? "?"} in the table) has no handout page and no Prism course`,
    });
  }

  // Prism courses offered to a handout branch that no handout of that branch lists.
  for (const p of catalogue) {
    for (const o of p.offerings) {
      if (!options.branches.includes(o.branch)) continue;
      const matchedHere = [...(usedFor.get(p.id) ?? [])].some((k) => k.startsWith(`${o.branch}/`));
      if (matchedHere) continue;
      const inTable = outline.some(
        (r) => r.branch === o.branch && nameSimilarity(r.name, plainName(p.name)) >= MATCH.name,
      );
      const elsewhere = [...(usedFor.get(p.id) ?? [])];
      const base = { branch: o.branch, sem: o.semester };
      if (inTable) continue; // listed in the course table: keep, just no handout page
      if (options.incomplete(o.branch, o.semester) || p.courseCategory === "non-core") {
        out.needsReview.push({
          ...base,
          reason: "not in handouts (handouts incomplete or elective)",
          detail: `${p.id} "${p.name}" is not in the ${o.branch} sem ${o.semester} handouts${elsewhere.length ? `; it is in ${elsewhere.join(", ")}` : ""}`,
        });
        continue;
      }
      out.changes.push({
        ...base,
        type: elsewhere.length ? "course in wrong branch" : "extra item not in any handout",
        detail: elsewhere.length
          ? `Unlink ${p.id} from ${o.branch} sem ${o.semester} (handouts put it in ${elsewhere.join(", ")})`
          : `Retire ${p.id} "${p.name}" for ${o.branch} sem ${o.semester} (in no handout)`,
        prism: { subject: p.id },
        retire: true,
      });
    }
  }
  return out;
}

/** Normalised key for de-duplicating table rows. */
export function outlineKey(row: OutlineCourse): string {
  return `${row.branch}|${row.sem ?? "?"}|${normalize(row.name)}`;
}
