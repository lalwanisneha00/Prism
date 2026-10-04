import type { MapEdge } from "@/lib/conceptMap";
import type { Subject } from "@/lib/subjects";

/*
 * The subject concept map's logic (fix before V3 · Step 5). Like a family tree for topics:
 * "everything before this topic" is its ancestors, and the study order lists them so that
 * each one comes after everything it builds on, ending at the topic itself.
 * All links come from the subject data files, never from the AI.
 */

export type GraphTopic = { id: string; name: string; chapterId: string; chapterName: string };
export type PrereqGraph = {
  topics: GraphTopic[];
  /** Arrow from a prerequisite to the topic that needs it. */
  edges: MapEdge[];
  /** Chapters in syllabus order. */
  chapters: { id: string; name: string }[];
};

export function graphOf(subject: Subject): PrereqGraph {
  const topics = subject.chapters.flatMap((c) =>
    c.topics.map((t) => ({ id: t.id, name: t.name, chapterId: c.id, chapterName: c.name })),
  );
  const known = new Set(topics.map((t) => t.id));
  const edges = subject.chapters.flatMap((c) =>
    c.topics.flatMap((t) =>
      (t.requires ?? []).filter((r) => known.has(r)).map((r) => ({ from: r, to: t.id })),
    ),
  );
  return { topics, edges, chapters: subject.chapters.map((c) => ({ id: c.id, name: c.name })) };
}

/**
 * Problems that would make the map wrong: a prerequisite that doesn't exist, or a cycle
 * ("A needs B, B needs A": then there is no order to study them in). Empty = fine.
 */
export function graphProblems(subject: Subject): string[] {
  const problems: string[] = [];
  const names = new Map(subject.chapters.flatMap((c) => c.topics.map((t) => [t.id, t.name])));
  for (const c of subject.chapters) {
    for (const t of c.topics) {
      for (const r of t.requires ?? []) {
        if (!names.has(r)) problems.push(`“${t.name}” needs a topic that doesn't exist (${r}).`);
      }
    }
  }
  const cycle = findCycle(graphOf(subject));
  if (cycle) {
    problems.push(
      `These topics depend on each other in a circle: ${cycle.map((id) => names.get(id) ?? id).join(" → ")}.`,
    );
  }
  return problems;
}

function findCycle(g: PrereqGraph): string[] | null {
  const next = successorsMap(g);
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    if (state.get(id) === 2) return null;
    if (state.get(id) === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const n of next.get(id) ?? []) {
      const c = visit(n);
      if (c) return c;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const t of g.topics) {
    const c = visit(t.id);
    if (c) return c;
  }
  return null;
}

function successorsMap(g: PrereqGraph): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of g.edges) m.set(e.from, [...(m.get(e.from) ?? []), e.to]);
  return m;
}

function predecessorsMap(g: PrereqGraph): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of g.edges) m.set(e.to, [...(m.get(e.to) ?? []), e.from]);
  return m;
}

/** Every topic that must be done before `id`: its prerequisites, theirs, all the way back. */
export function allPrerequisites(g: PrereqGraph, id: string): Set<string> {
  const preds = predecessorsMap(g);
  const seen = new Set<string>();
  const stack = [...(preds.get(id) ?? [])];
  while (stack.length) {
    const p = stack.pop()!;
    if (seen.has(p)) continue;
    seen.add(p);
    stack.push(...(preds.get(p) ?? []));
  }
  return seen;
}

/** The topics that `id` directly unlocks (the next steps after it). */
export function unlocks(g: PrereqGraph, id: string): string[] {
  return successorsMap(g).get(id) ?? [];
}

/** Each topic's depth: 0 with no prerequisites, else 1 + its deepest prerequisite. */
export function depths(g: PrereqGraph): Map<string, number> {
  const preds = predecessorsMap(g);
  const depth = new Map<string, number>();
  const of = (id: string, guard: Set<string>): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    if (guard.has(id)) return 0; // a cycle: graphProblems reports it
    guard.add(id);
    const d = Math.max(-1, ...(preds.get(id) ?? []).map((p) => of(p, guard))) + 1;
    guard.delete(id);
    depth.set(id, d);
    return d;
  };
  for (const t of g.topics) of(t.id, new Set());
  return depth;
}

/**
 * A valid order to study `id`: all its prerequisites, each after everything it builds on,
 * ending with `id`. Ties go to the shallower topic, then syllabus order.
 */
export function studyOrder(g: PrereqGraph, id: string): string[] {
  const include = allPrerequisites(g, id);
  include.add(id);
  const depth = depths(g);
  const position = new Map(g.topics.map((t, i) => [t.id, i]));
  const preds = predecessorsMap(g);
  const done = new Set<string>();
  const order: string[] = [];
  while (order.length < include.size) {
    const ready = [...include]
      .filter(
        (t) => !done.has(t) && (preds.get(t) ?? []).every((p) => !include.has(p) || done.has(p)),
      )
      .sort(
        (a, b) =>
          (depth.get(a) ?? 0) - (depth.get(b) ?? 0) ||
          (position.get(a) ?? 0) - (position.get(b) ?? 0),
      );
    if (ready.length === 0) break; // a cycle: graphProblems reports it
    // The target itself always comes last.
    const next = ready.find((t) => t !== id) ?? ready[0];
    order.push(next);
    done.add(next);
  }
  return order;
}

/**
 * The same map without redundant arrows: if A → B → C exists, the direct A → C is dropped
 * (it says nothing new and clutters the picture).
 */
export function withoutShortcuts(g: PrereqGraph): MapEdge[] {
  const next = successorsMap(g);
  const reachableAvoiding = (from: string, to: string): boolean => {
    // Is `to` reachable from `from` by a path of length ≥ 2?
    const stack = (next.get(from) ?? []).filter((n) => n !== to);
    const seen = new Set<string>();
    while (stack.length) {
      const n = stack.pop()!;
      if (n === to) return true;
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(...(next.get(n) ?? []));
    }
    return false;
  };
  return g.edges.filter((e) => !reachableAvoiding(e.from, e.to));
}
