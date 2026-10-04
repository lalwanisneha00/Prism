import type { MapEdge } from "@/lib/conceptMap";
import { depths, withoutShortcuts, type PrereqGraph } from "@/lib/graph/prereqGraph";

/*
 * Where each topic sits on the subject map. Columns are prerequisite depth (so arrows always
 * flow one way: left to right, or top to bottom on phones); each chapter is a shaded band
 * across them. Inside a band, topics in the same column are ordered to reduce crossings
 * (each one near the average position of what it builds on). Fixed sizes and gaps mean
 * labels never overlap. A collapsed chapter becomes a single box.
 */

export const NODE_W = 168;
export const NODE_H = 56;
const GAP_X = 56; // between columns (room for arrows)
const GAP_Y = 16; // between topics in a band
const BAND_PAD = 28; // band label + padding

export type LaidNode = {
  id: string;
  kind: "topic" | "chapter";
  label: string;
  chapterId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** For a collapsed chapter: how many topics it holds. */
  count?: number;
};
export type LaidBand = {
  chapterId: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
};
export type LaidEdge = MapEdge & { d: string };
export type Layout = {
  nodes: LaidNode[];
  bands: LaidBand[];
  edges: LaidEdge[];
  width: number;
  height: number;
  vertical: boolean;
};

export function layoutGraph(
  g: PrereqGraph,
  {
    vertical = false,
    collapsed = new Set<string>(),
  }: { vertical?: boolean; collapsed?: ReadonlySet<string> } = {},
): Layout {
  const depth = depths(g);
  const chapterOf = new Map(g.topics.map((t) => [t.id, t.chapterId]));
  // A collapsed chapter's topics are represented by one node "chapter:<id>".
  const rep = (id: string) =>
    collapsed.has(chapterOf.get(id) ?? "") ? `chapter:${chapterOf.get(id)}` : id;

  const units: {
    id: string;
    kind: "topic" | "chapter";
    label: string;
    chapterId: string;
    col: number;
    count?: number;
  }[] = [];
  for (const c of g.chapters) {
    const topics = g.topics.filter((t) => t.chapterId === c.id);
    if (topics.length === 0) continue;
    if (collapsed.has(c.id)) {
      units.push({
        id: `chapter:${c.id}`,
        kind: "chapter",
        label: c.name,
        chapterId: c.id,
        col: Math.min(...topics.map((t) => depth.get(t.id) ?? 0)),
        count: topics.length,
      });
    } else {
      for (const t of topics)
        units.push({
          id: t.id,
          kind: "topic",
          label: t.name,
          chapterId: c.id,
          col: depth.get(t.id) ?? 0,
        });
    }
  }

  // Arrows between shown units, without shortcuts and without arrows inside a collapsed chapter.
  const seenEdge = new Set<string>();
  const edges: MapEdge[] = [];
  for (const e of withoutShortcuts(g)) {
    const from = rep(e.from);
    const to = rep(e.to);
    const key = `${from}>${to}`;
    if (from === to || seenEdge.has(key)) continue;
    seenEdge.add(key);
    edges.push({ from, to });
  }
  const preds = new Map<string, string[]>();
  for (const e of edges) preds.set(e.to, [...(preds.get(e.to) ?? []), e.from]);

  // Bands, top to bottom in syllabus order; slots within a band per column.
  const colCount = Math.max(1, ...units.map((u) => u.col + 1));
  const slot = new Map<string, number>(); // index within its column in its band
  const bandRows = new Map<string, number>();
  const rowOf = new Map<string, number>(); // global row position for ordering
  let rowBase = 0;
  for (const c of g.chapters) {
    const inBand = units.filter((u) => u.chapterId === c.id);
    if (inBand.length === 0) continue;
    let rows = 1;
    for (let col = 0; col < colCount; col++) {
      const column = inBand.filter((u) => u.col === col);
      // Order by the average row of what each builds on (fewer crossings); syllabus order breaks ties.
      const bary = (u: (typeof column)[number]) => {
        const p = (preds.get(u.id) ?? [])
          .map((x) => rowOf.get(x))
          .filter((r): r is number => r !== undefined);
        return p.length ? p.reduce((a, b) => a + b, 0) / p.length : Number.POSITIVE_INFINITY;
      };
      column
        .map((u, i) => ({ u, i, b: bary(u) }))
        .sort((a, b) => (a.b === b.b ? a.i - b.i : a.b - b.b))
        .forEach(({ u }, k) => {
          slot.set(u.id, k);
          rowOf.set(u.id, rowBase + k);
        });
      rows = Math.max(rows, column.length);
    }
    bandRows.set(c.id, rows);
    rowBase += rows;
  }

  // Positions. "Main" axis = prerequisite depth (x on wide screens, y on phones); "cross"
  // axis = chapter bands and the slots inside them. Steps differ because boxes are wider than tall.
  const mainStep = vertical ? NODE_H + 44 : NODE_W + GAP_X;
  const crossSize = vertical ? NODE_W : NODE_H;
  const crossGap = vertical ? 12 : GAP_Y;
  const nodes: LaidNode[] = [];
  const bands: LaidBand[] = [];
  let cross = 0;
  const mainLength = 12 + (colCount - 1) * mainStep + (vertical ? NODE_H : NODE_W) + 12;
  for (const c of g.chapters) {
    const rows = bandRows.get(c.id);
    if (!rows) continue;
    const pad = vertical ? 12 : BAND_PAD;
    const size = pad + rows * crossSize + (rows - 1) * crossGap + 12;
    for (const u of units.filter((x) => x.chapterId === c.id)) {
      const main = 12 + u.col * mainStep + (vertical ? BAND_PAD : 0);
      const crossPos = cross + pad + (slot.get(u.id) ?? 0) * (crossSize + crossGap);
      nodes.push({
        id: u.id,
        kind: u.kind,
        label: u.label,
        chapterId: u.chapterId,
        x: vertical ? crossPos : main,
        y: vertical ? main : crossPos,
        w: NODE_W,
        h: NODE_H,
        ...(u.count ? { count: u.count } : {}),
      });
    }
    bands.push(
      vertical
        ? {
            chapterId: c.id,
            label: c.name,
            x: cross,
            y: 0,
            w: size,
            h: mainLength + BAND_PAD,
            collapsed: collapsed.has(c.id),
          }
        : {
            chapterId: c.id,
            label: c.name,
            x: 0,
            y: cross,
            w: mainLength,
            h: size,
            collapsed: collapsed.has(c.id),
          },
    );
    cross += size + 10;
  }
  const crossTotal = Math.max(cross - 10, 0);
  const width = vertical ? crossTotal : mainLength;
  const height = vertical ? mainLength + BAND_PAD : crossTotal;

  const at = new Map(nodes.map((n) => [n.id, n]));
  const laidEdges: LaidEdge[] = edges.flatMap((e) => {
    const a = at.get(e.from);
    const b = at.get(e.to);
    if (!a || !b) return [];
    if (vertical) {
      const x1 = a.x + a.w / 2;
      const y1 = a.y + a.h;
      const x2 = b.x + b.w / 2;
      const y2 = b.y;
      const m = (y1 + y2) / 2;
      return [{ ...e, d: `M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2}` }];
    }
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const m = (x1 + x2) / 2;
    return [{ ...e, d: `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}` }];
  });

  return { nodes, bands, edges: laidEdges, width, height, vertical };
}
