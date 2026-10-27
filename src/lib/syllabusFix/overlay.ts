import { z } from "zod";
import { slugify } from "@/lib/custom/customSubject";
import type { Subject, Topic } from "@/lib/subjects";
import type { StaleTopics } from "@/lib/syllabusFix/stale";

/*
 * The live syllabus fixes (syllabus fix, Phase 5). The syllabus itself is JSON in the repo, built
 * into the app. Changes students vote through cannot rewrite those files on a live server, so they
 * are kept as a short list (Firestore `syllabusOverlay/current`) that the app lays over the JSON,
 * like a transparent sheet with corrections on top of a printed timetable. A script can later copy
 * the sheet into the JSON (`npm run syllabus:bake-overlay`); applying a change twice does nothing,
 * so the sheet and the baked JSON never fight.
 */

const name = z.string().max(300);

/** A change as stored on a proposal (the matcher's `Change`, checked again on the way in). */
export const LiveChangeSchema = z.object({
  type: z.string().min(1),
  branch: z.string().min(1),
  sem: z.int().min(1).max(8),
  detail: z.string().max(600).optional(),
  handout: z
    .object({
      course: name.optional(),
      code: z.string().max(40).nullable().optional(),
      unit: name.optional(),
      topic: name.optional(),
    })
    .optional(),
  prism: z
    .object({
      subject: z.string().min(1),
      chapter: z.string().min(1).optional(),
      topic: z.string().min(1).optional(),
    })
    .optional(),
  to: z
    .object({
      subject: z.string().min(1).optional(),
      chapter: z.string().min(1).optional(),
      semester: z.int().min(1).max(8).optional(),
      branch: z.string().min(1).optional(),
      order: z.int().min(1).optional(),
    })
    .optional(),
  retire: z.boolean().optional(),
  pieces: z.array(name).max(40).optional(),
});
export type LiveChange = z.infer<typeof LiveChangeSchema>;

export const AppliedChangeSchema = z.object({
  proposalId: z.string().min(1),
  change: LiveChangeSchema,
  appliedAt: z.iso.datetime(),
  /** Students whose votes made it pass (shown as "verified by N students"). */
  supporters: z.int().min(0),
  /** Ids given to new topics (a missing topic, the extra pieces of a split), in order. */
  newIds: z.array(z.string().min(1)).optional(),
  /** Undone by the admin (Phase 6): skipped, but kept so the history stays readable. */
  reverted: z.boolean().optional(),
});
export type AppliedChange = z.infer<typeof AppliedChangeSchema>;

export const OverlaySchema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  changes: z.array(AppliedChangeSchema),
});
export type Overlay = z.infer<typeof OverlaySchema>;

export const EMPTY_OVERLAY: Overlay = { version: 1, updatedAt: "", changes: [] };

/** The subjects a change touches (where it is now, and where it goes). */
function subjectsOf(c: LiveChange): string[] {
  return [c.prism?.subject, c.to?.subject].filter((s): s is string => Boolean(s));
}

/** Ids for the topics a change adds: unique in the subject, the same on every device. */
export function assignIds(change: LiveChange, subject: Subject): string[] | undefined {
  const taken = new Set(subject.chapters.flatMap((c) => c.topics.map((t) => t.id)));
  const id = (text: string) => slugify(text, taken).replace(/-+$/, "");
  if (change.type === "topic missing" && change.handout?.topic) return [id(change.handout.topic)];
  if (change.type === "topic split" && change.pieces && change.pieces.length > 1)
    return change.pieces.slice(1).map(id);
  return undefined;
}

type Fix = { source: "student_fix"; confidence: "verified"; verifiedByCount: number };

/** One change applied to one subject (a fresh copy). Unknown places or a repeat: unchanged. */
function applyOne(subject: Subject, applied: AppliedChange): Subject {
  const c = applied.change;
  const fix: Fix = {
    source: "student_fix",
    confidence: "verified",
    verifiedByCount: applied.supporters,
  };
  const s: Subject = structuredClone(subject);
  const chapter = (id?: string) => (id ? s.chapters.find((x) => x.id === id) : undefined);
  const hasTopic = (id: string) => s.chapters.some((x) => x.topics.some((t) => t.id === id));
  const branch = c.to?.branch ?? c.branch;

  switch (c.type) {
    case "topic under wrong unit": {
      const from = chapter(c.prism?.chapter);
      const to = chapter(c.to?.chapter);
      const at = from?.topics.findIndex((t) => t.id === c.prism?.topic) ?? -1;
      if (!from || !to || at < 0 || from === to) return subject;
      const [topic] = from.topics.splice(at, 1);
      to.topics.push({
        ...topic,
        ...fix,
        movedFrom: { subject: s.id, chapter: from.id, at: applied.appliedAt },
      });
      // A chapter left with no topics is not shown (its id still resolves).
      if (from.topics.length === 0) {
        from.topics.push({ ...topic, status: "retired" });
        from.status = "retired";
      }
      return s;
    }
    case "topic missing": {
      const to = chapter(c.to?.chapter);
      const id = applied.newIds?.[0];
      if (!to || !id || !c.handout?.topic || hasTopic(id)) return subject;
      const last = to.topics.at(-1);
      // New topics need the one before them (the concept map's convention for added topics).
      to.topics.push({
        id,
        name: c.handout.topic,
        ...(last ? { requires: [last.id] } : {}),
        ...fix,
      });
      return s;
    }
    case "topic split": {
      const home = chapter(c.prism?.chapter);
      const at = home?.topics.findIndex((t) => t.id === c.prism?.topic) ?? -1;
      const ids = applied.newIds ?? [];
      const pieces = c.pieces ?? [];
      if (!home || at < 0 || pieces.length < 2 || ids.length !== pieces.length - 1) return subject;
      if (ids.some(hasTopic)) return subject;
      const first = home.topics[at];
      const rest: Topic[] = pieces.slice(1).map((p, i) => ({
        id: ids[i],
        name: p,
        requires: [i === 0 ? first.id : ids[i - 1]],
        ...fix,
      }));
      home.topics.splice(at, 1, { ...first, name: pieces[0], ...fix }, ...rest);
      return s;
    }
    case "extra item not in any handout": {
      const ch = chapter(c.prism?.chapter);
      if (c.prism?.topic) {
        const topic = ch?.topics.find((t) => t.id === c.prism?.topic);
        if (!topic || topic.status === "retired") return subject;
        Object.assign(topic, fix, { status: "retired" });
        return s;
      }
      if (ch) {
        if (ch.status === "retired") return subject;
        Object.assign(ch, fix, { status: "retired" });
        return s;
      }
      // The whole course: unlinked from this branch only, never deleted.
      return unlink(s, branch) ?? subject;
    }
    case "course in wrong branch":
      return unlink(s, branch) ?? subject;
    case "unit wrong order": {
      const from = s.chapters.findIndex((x) => x.id === c.prism?.chapter);
      const order = c.to?.order;
      if (from < 0 || !order) return subject;
      const to = Math.min(order, s.chapters.length) - 1;
      if (from === to) return subject;
      const [moved] = s.chapters.splice(from, 1);
      s.chapters.splice(to, 0, { ...moved, ...fix });
      return s;
    }
    case "unit rename": {
      const ch = chapter(c.prism?.chapter);
      const to = c.handout?.unit?.trim();
      if (!ch || !to || ch.name === to) return subject;
      Object.assign(ch, fix, { name: to });
      return s;
    }
    case "course in wrong semester":
    case "course missing from branch/semester": {
      const semester = c.to?.semester ?? c.sem;
      const offerings = s.offerings ?? [];
      const mine = offerings.filter((o) => o.branch === branch);
      if (mine.some((o) => o.semester === semester) && c.type !== "course in wrong semester")
        return subject;
      if (mine.length > 0 && c.type === "course in wrong semester") {
        if (mine.every((o) => o.semester === semester)) return subject;
        for (const o of mine) o.semester = semester;
      } else if (offerings[0]) {
        offerings.push({ ...offerings[0], branch, semester });
        s.offerings = offerings;
      } else {
        if (s.branches.includes(branch) && s.semesters.includes(semester)) return subject;
        if (!s.branches.includes("all") && !s.branches.includes(branch)) s.branches.push(branch);
      }
      s.semesters = semestersOf(s, semester);
      Object.assign(s, fix);
      return s;
    }
    default:
      return subject;
  }
}

/** The semesters a course is taught in after an offering change. */
function semestersOf(s: Subject, added?: number): number[] {
  const list = s.offerings?.length
    ? s.offerings.map((o) => o.semester)
    : [...s.semesters, ...(added ? [added] : [])];
  return [...new Set(list)].sort((a, b) => a - b);
}

/** The course without this branch's offering, or null when there was none. */
function unlink(s: Subject, branch: string): Subject | null {
  const before = s.offerings?.length ?? 0;
  const kept = (s.offerings ?? []).filter((o) => o.branch !== branch);
  if (kept.length === before && !s.branches.includes(branch)) return null;
  s.offerings = kept;
  // `branches` must keep one entry; an unlinked branch drops out when another remains.
  if (s.branches.length > 1) s.branches = s.branches.filter((b) => b !== branch);
  s.semesters = semestersOf(s);
  return s;
}

/** The changes still in force (reverted ones skipped), oldest first. */
export function activeChanges(overlay: Overlay): AppliedChange[] {
  return overlay.changes.filter((c) => !c.reverted);
}

/** A subject with every live fix for it laid on top. Unchanged (same object) when none applies. */
export function applyOverlay(subject: Subject, overlay: Overlay): Subject {
  let s = subject;
  for (const applied of activeChanges(overlay))
    if (subjectsOf(applied.change).includes(subject.id)) s = applyOne(s, applied);
  return s;
}

/** The subjects whose branch or semester the live fixes change for a branch. */
export function placeChangesFor(overlay: Overlay, branch: string): string[] {
  const placeTypes = new Set([
    "course in wrong semester",
    "course missing from branch/semester",
    "course in wrong branch",
  ]);
  const ids = activeChanges(overlay)
    .filter(
      (a) =>
        (a.change.to?.branch ?? a.change.branch) === branch &&
        (placeTypes.has(a.change.type) ||
          (a.change.type === "extra item not in any handout" && !a.change.prism?.chapter)),
    )
    .map((a) => a.change.prism?.subject)
    .filter((s): s is string => Boolean(s));
  return [...new Set(ids)];
}

/**
 * A semester's course ids with the live fixes: courses moved away or unlinked leave, courses
 * moved or linked here join. `find` looks a course up (full data).
 */
export function liveSemesterIds(
  ids: readonly string[],
  overlay: Overlay,
  branch: string,
  semester: number,
  find: (id: string) => Subject | undefined,
): string[] {
  const touched = placeChangesFor(overlay, branch);
  if (touched.length === 0) return [...ids];
  const here = (id: string) => {
    const s = find(id);
    if (!s) return false;
    const live = applyOverlay(s, overlay);
    const mine = (live.offerings ?? []).filter((o) => o.branch === branch);
    return mine.length > 0
      ? mine.some((o) => o.semester === semester)
      : (live.branches.includes(branch) || live.branches.includes("all")) &&
          live.semesters.includes(semester);
  };
  const kept = ids.filter((id) => !touched.includes(id) || here(id));
  const joined = touched.filter((id) => !ids.includes(id) && here(id));
  return [...kept, ...joined];
}

/** Topics whose cached lessons a live fix makes stale (moved, renamed by a split). */
export function staleFromOverlay(overlay: Overlay, base: StaleTopics): StaleTopics {
  const topics = { ...base.topics };
  for (const a of activeChanges(overlay)) {
    const p = a.change.prism;
    if (!p?.topic) continue;
    if (a.change.type !== "topic under wrong unit" && a.change.type !== "topic split") continue;
    const key = `${p.subject}/${p.topic}`;
    if (!topics[key] || topics[key] < a.appliedAt) topics[key] = a.appliedAt;
  }
  return { version: 1, topics };
}
