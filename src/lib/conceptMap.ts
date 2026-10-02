import type { QuizAttempt } from "@/lib/storage/db";
import type { Subject } from "@/lib/subjects";

/*
 * The prerequisite concept map (SPEC §8, V2 · Step 8). Topics are nodes; "requires" lists
 * are the arrows. Like a skill tree in a game: you can see what to unlock first.
 */

export type MapNode = { id: string; name: string; chapterId: string; chapterName: string };
export type MapEdge = { from: string; to: string };
export type ConceptGraph = { nodes: Map<string, MapNode>; edges: MapEdge[] };

/** Builds the graph of a subject; an arrow goes from a prerequisite to the topic needing it. */
export function buildGraph(subject: Subject): ConceptGraph {
  const nodes = new Map<string, MapNode>();
  const edges: MapEdge[] = [];
  for (const chapter of subject.chapters) {
    for (const topic of chapter.topics) {
      nodes.set(topic.id, {
        id: topic.id,
        name: topic.name,
        chapterId: chapter.id,
        chapterName: chapter.name,
      });
    }
  }
  for (const chapter of subject.chapters) {
    for (const topic of chapter.topics) {
      for (const req of topic.requires ?? []) {
        if (nodes.has(req)) edges.push({ from: req, to: topic.id });
      }
    }
  }
  return { nodes, edges };
}

/** A cycle in the graph (a list of ids), or null. A cycle would make "learn this first" impossible. */
export function findCycle(graph: ConceptGraph): string[] | null {
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const next = (id: string) => graph.edges.filter((e) => e.from === id).map((e) => e.to);
  const visit = (id: string): string[] | null => {
    if (state.get(id) === "done") return null;
    if (state.get(id) === "visiting") return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, "visiting");
    stack.push(id);
    for (const n of next(id)) {
      const cycle = visit(n);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, "done");
    return null;
  };
  for (const id of graph.nodes.keys()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return null;
}

/** Each topic's layer: 0 for topics with no prerequisites, otherwise 1 + its deepest prerequisite. */
export function layers(
  graph: ConceptGraph,
  ids: Iterable<string> = graph.nodes.keys(),
): Map<string, number> {
  const include = new Set(ids);
  const depth = new Map<string, number>();
  const prereqs = (id: string) =>
    graph.edges.filter((e) => e.to === id && include.has(e.from)).map((e) => e.from);
  const of = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    const d = Math.max(-1, ...prereqs(id).map(of)) + 1;
    depth.set(id, d);
    return d;
  };
  for (const id of include) of(id);
  return depth;
}

/**
 * The part of the map around one topic: its prerequisites (up to `back` steps before it)
 * and the topics it unlocks (up to `forward` steps after it). Layer 0 is the topic itself.
 */
export function neighbourhood(
  graph: ConceptGraph,
  topicId: string,
  back = 2,
  forward = 1,
): { layer: Map<string, number>; edges: MapEdge[] } {
  const layer = new Map<string, number>([[topicId, 0]]);
  let frontier = [topicId];
  for (let step = 1; step <= back; step++) {
    frontier = graph.edges
      .filter((e) => frontier.includes(e.to) && !layer.has(e.from))
      .map((e) => e.from)
      .filter((id, i, all) => all.indexOf(id) === i);
    for (const id of frontier) layer.set(id, -step);
  }
  frontier = [topicId];
  for (let step = 1; step <= forward; step++) {
    frontier = graph.edges
      .filter((e) => frontier.includes(e.from) && !layer.has(e.to))
      .map((e) => e.to)
      .filter((id, i, all) => all.indexOf(id) === i);
    for (const id of frontier) layer.set(id, step);
  }
  const edges = graph.edges.filter(
    (e) => layer.has(e.from) && layer.has(e.to) && layer.get(e.from)! < layer.get(e.to)!,
  );
  return { layer, edges };
}

export type TopicStatus = "mastered" | "weak" | "tried" | "new";

/** A topic's status from its most recent quiz or worksheet score. */
export function topicStatuses(attempts: QuizAttempt[]): Map<string, TopicStatus> {
  const latest = new Map<string, QuizAttempt>();
  for (const a of attempts) {
    if (a.deleted || a.total <= 0) continue;
    const prev = latest.get(a.topic);
    if (!prev || a.at > prev.at) latest.set(a.topic, a);
  }
  const statuses = new Map<string, TopicStatus>();
  for (const [topic, a] of latest) {
    const ratio = a.score / a.total;
    statuses.set(topic, ratio >= 0.8 ? "mastered" : ratio < 0.6 ? "weak" : "tried");
  }
  return statuses;
}

/** Prerequisites the student hasn't mastered yet: "revise these first". */
export function gapsBefore(
  graph: ConceptGraph,
  topicId: string,
  statuses: Map<string, TopicStatus>,
): string[] {
  return graph.edges
    .filter((e) => e.to === topicId)
    .map((e) => e.from)
    .filter((id) => statuses.get(id) === "weak");
}
