import type { HiddenByFlags } from "@/lib/syllabusFix/myFlags";
import { activeChapters } from "@/lib/syllabusFix/active";

/*
 * What a mock test covers (mock test overhaul): one subject, then the whole subject, some units or
 * some topics. PDEU's handouts give one chapter per unit, so a unit and a chapter are the same
 * thing in Prism's data: the tree is unit › topic. Like choosing pages to revise from the contents
 * page of one textbook.
 */

export type ScopeLevel = "subject" | "units" | "topics";
export const SCOPE_LEVELS: readonly ScopeLevel[] = ["subject", "units", "topics"];

export type ScopeTopic = { id: string; name: string; unitId: string };
export type ScopeUnit = { id: string; number: number; name: string; topics: ScopeTopic[] };
export type ScopeTree = { subjectId: string; units: ScopeUnit[] };

type SubjectLike = {
  id: string;
  chapters: readonly {
    id: string;
    name: string;
    status?: "active" | "retired";
    topics: readonly { id: string; name: string; status?: "active" | "retired" }[];
  }[];
};

const NO_FLAGS: HiddenByFlags = { subjects: new Set(), chapters: new Set(), topics: new Set() };
const cache = new Map<string, ScopeTree>();

const flagKey = (h: HiddenByFlags, subjectId: string) =>
  [
    ...[...h.chapters].filter((k) => k.startsWith(`${subjectId}/`)),
    ...[...h.topics].filter((k) => k.startsWith(`${subjectId}/`)),
  ]
    .sort()
    .join("|");

/**
 * The units and topics a student can be tested on: retired ones and the ones they flagged out are
 * left out. Kept in memory per subject, so stepping back and forth doesn't rebuild it.
 */
export function scopeTree(subject: SubjectLike, hidden: HiddenByFlags = NO_FLAGS): ScopeTree {
  const key = `${subject.id}#${subject.chapters.length}#${flagKey(hidden, subject.id)}`;
  const known = cache.get(key);
  if (known) return known;
  const units: ScopeUnit[] = [];
  for (const c of activeChapters(subject)) {
    if (hidden.chapters.has(`${subject.id}/${c.id}`)) continue;
    const topics = c.topics
      .filter((t) => !hidden.topics.has(`${subject.id}/${t.id}`))
      .map((t) => ({ id: t.id, name: t.name, unitId: c.id }));
    if (topics.length) units.push({ id: c.id, number: units.length + 1, name: c.name, topics });
  }
  const tree = { subjectId: subject.id, units };
  if (cache.size > 50) cache.clear();
  cache.set(key, tree);
  return tree;
}

/** The topics chosen: the whole subject, every topic of the picked units, or the picked topics. */
export function topicsInScope(
  tree: ScopeTree,
  level: ScopeLevel,
  picked: readonly string[],
): ScopeTopic[] {
  const all = tree.units.flatMap((u) => u.topics);
  if (level === "subject") return all;
  const chosen = new Set(picked);
  if (level === "units") return tree.units.filter((u) => chosen.has(u.id)).flatMap((u) => u.topics);
  return all.filter((t) => chosen.has(t.id));
}

/** The units the chosen topics come from, in syllabus order. */
export function unitsInScope(tree: ScopeTree, topics: readonly ScopeTopic[]): ScopeUnit[] {
  const ids = new Set(topics.map((t) => t.unitId));
  return tree.units.filter((u) => ids.has(u.id));
}

/** "Whole subject", "Units 1, 3", "3 topics from Unit 2": the scope in a few words. */
export function describeScope(
  tree: ScopeTree,
  level: ScopeLevel,
  picked: readonly string[],
): string {
  if (level === "subject") return "Whole subject";
  if (level === "units") {
    const numbers = tree.units.filter((u) => picked.includes(u.id)).map((u) => u.number);
    return numbers.length === 1 ? `Unit ${numbers[0]}` : `Units ${numbers.join(", ")}`;
  }
  const topics = topicsInScope(tree, level, picked);
  const units = unitsInScope(tree, topics).map((u) => u.number);
  const n = `${topics.length} ${topics.length === 1 ? "topic" : "topics"}`;
  return units.length === 1 ? `${n} from Unit ${units[0]}` : `${n} from Units ${units.join(", ")}`;
}

/** Checks a picked scope: something must be chosen, and everything picked must still exist. */
export function scopeProblem(
  tree: ScopeTree,
  level: ScopeLevel,
  picked: readonly string[],
): string | null {
  if (tree.units.length === 0) return "This subject has no topics to test yet.";
  if (level === "subject") return null;
  if (picked.length === 0)
    return level === "units" ? "Pick at least one unit." : "Pick at least one topic.";
  const known = new Set(
    level === "units"
      ? tree.units.map((u) => u.id)
      : tree.units.flatMap((u) => u.topics.map((t) => t.id)),
  );
  return picked.every((id) => known.has(id))
    ? null
    : "Some of what you picked is no longer in this subject.";
}

/**
 * The order to hand out questions over topics: one topic from each unit in turn, so a short
 * paper on the whole subject doesn't only ask about Unit 1.
 */
export function interleaveByUnit<T extends { unitId: string }>(topics: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const t of topics) groups.set(t.unitId, [...(groups.get(t.unitId) ?? []), t]);
  const lists = [...groups.values()];
  const out: T[] = [];
  for (let i = 0; out.length < topics.length; i++) {
    for (const list of lists) if (list[i]) out.push(list[i]);
  }
  return out;
}

/** Subjects for the Mock Tests page: the student's semester list, minus labs and flagged ones. */
export function mockSubjectIds(
  picks: readonly string[],
  hidden: HiddenByFlags,
  isLab: (id: string) => boolean,
): string[] {
  return picks.filter((id) => !hidden.subjects.has(id) && !isLab(id));
}
