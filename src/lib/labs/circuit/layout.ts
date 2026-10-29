import {
  METER_TYPES,
  SOURCE_TYPES,
  terminalsOf,
  type Circuit,
  type CircuitComponent,
} from "@/lib/labs/circuit/model";
import { buildNets } from "@/lib/labs/circuit/validate";

/*
 * Where each part of a lab circuit goes on the schematic (syllabus fix, Phase 7C). Lab circuits
 * are nearly always one main loop (source, key, rheostat, ammeter, the part under test) with
 * meters and branches across some of its parts, so: the main loop runs round a rectangle with the
 * source on the left, and every other part is drawn as a bridge between two points already
 * placed. Circuits with three-terminal parts get no schematic (the connection view still works).
 */

export type Pt = { x: number; y: number };

/** One part on the schematic: drawn from `a` to `b`; `from` is the terminal at `a`. */
export type PlacedPart = { comp: CircuitComponent; a: Pt; b: Pt; from: string; to: string };

export type Schematic = {
  width: number;
  height: number;
  parts: PlacedPart[];
  /** Plain wire segments. */
  wires: [Pt, Pt][];
  /** Junction dots (three or more terminals meet). */
  dots: Pt[];
};

const SLOT = 130;
const MARGIN = 70;
const BRIDGE = 70;

const key = (p: Pt) => `${Math.round(p.x)},${Math.round(p.y)}`;

export function layoutCircuit(circuit: Circuit): Schematic | null {
  if (circuit.components.some((p) => terminalsOf(p).length !== 2)) return null;
  const nets = buildNets(circuit);
  const ends = (p: CircuitComponent) => terminalsOf(p).map((t) => nets.netOf.get(`${p.id}.${t}`)!);
  const parts = circuit.components;
  const source =
    parts.find((p) => SOURCE_TYPES.has(p.type)) ??
    parts.find((p) => !METER_TYPES.has(p.type)) ??
    parts[0];

  // The main loop: the longest simple path from the source's + net back to its - net, skipping
  // voltmeters (they go across parts, not in the loop).
  const [plus, minus] = ends(source);
  const loopable = parts.filter(
    (p) => p.id !== source.id && p.type !== "voltmeter" && p.type !== "oscilloscope",
  );
  let best: { comp: CircuitComponent; from: number; to: number }[] = [];
  let budget = 20_000;
  const walk = (at: number, used: Set<string>, seenNets: Set<number>, path: typeof best) => {
    if (--budget < 0) return;
    if (at === minus) {
      const score = (q: typeof best) =>
        q.length * 10 + q.filter((s) => s.comp.type === "ammeter").length;
      if (score(path) > score(best)) best = [...path];
      return;
    }
    for (const p of loopable) {
      if (used.has(p.id)) continue;
      const [e0, e1] = ends(p);
      const next = e0 === at ? e1 : e1 === at ? e0 : -1;
      if (next < 0 || seenNets.has(next)) continue;
      used.add(p.id);
      seenNets.add(next);
      path.push({ comp: p, from: at, to: next });
      walk(next, used, seenNets, path);
      path.pop();
      seenNets.delete(next);
      used.delete(p.id);
    }
  };
  walk(plus, new Set(), new Set([plus]), []);
  if (best.length === 0) return null;

  // Sides: top (left to right), right (down), bottom (right to left); the source on the left (up).
  const n = best.length;
  const right = n >= 2 ? 1 : 0;
  const top = Math.ceil((n - right) / 2);
  const bottom = n - right - top;
  const cols = Math.max(top, bottom, 1);
  const W = cols * SLOT;
  const H = Math.max(right, 1) * SLOT + 40;
  const x0 = MARGIN + 40;
  const y0 = MARGIN + 40;
  const corner = {
    tl: { x: x0, y: y0 },
    tr: { x: x0 + W, y: y0 },
    br: { x: x0 + W, y: y0 + H },
    bl: { x: x0, y: y0 + H },
  };
  const along = (a: Pt, b: Pt, count: number) =>
    Array.from({ length: count + 1 }, (_, i) => ({
      x: a.x + ((b.x - a.x) * i) / count,
      y: a.y + ((b.y - a.y) * i) / count,
    }));
  const pts: Pt[] = [];
  if (top) pts.push(...along(corner.tl, corner.tr, top));
  else pts.push(corner.tl, corner.tr);
  if (right) pts.push(...along(corner.tr, corner.br, right).slice(1));
  else pts.push(corner.br);
  if (bottom) pts.push(...along(corner.br, corner.bl, bottom).slice(1));
  else pts.push(corner.bl);

  const placed: PlacedPart[] = [];
  const wires: [Pt, Pt][] = [];
  const netPoint = new Map<number, Pt>([[plus, corner.tl]]);
  const termAt = (p: CircuitComponent, netId: number) =>
    terminalsOf(p).find((t) => nets.netOf.get(`${p.id}.${t}`) === netId)!;

  // Loop parts sit on the side points; corners with no part are plain wire.
  let at = 0;
  const steps: { a: Pt; b: Pt }[] = [];
  for (let i = 0; i < pts.length - 1; i++) steps.push({ a: pts[i], b: pts[i + 1] });
  // Segments that are pure corner turns (no part) when a side is empty.
  const segmentIsCorner = (s: { a: Pt; b: Pt }) =>
    (!top && s.a.y === y0 && s.b.y === y0) ||
    (!right && s.a.x === x0 + W && s.b.x === x0 + W) ||
    (!bottom && s.a.y === y0 + H && s.b.y === y0 + H);
  for (const s of steps) {
    if (segmentIsCorner(s)) {
      wires.push([s.a, s.b]);
      continue;
    }
    const step = best[at++];
    if (!step) {
      wires.push([s.a, s.b]);
      continue;
    }
    placed.push({
      comp: step.comp,
      a: s.a,
      b: s.b,
      from: termAt(step.comp, step.from),
      to: termAt(step.comp, step.to),
    });
    netPoint.set(step.from, s.a);
    netPoint.set(step.to, s.b);
  }
  netPoint.set(minus, corner.bl);
  placed.push({
    comp: source,
    a: corner.bl,
    b: corner.tl,
    from: termAt(source, minus),
    to: termAt(source, plus),
  });

  // Bridges: chains of unplaced parts between two placed points, drawn outside the loop when
  // both ends are on one side, through the middle otherwise.
  const done = new Set(placed.map((p) => p.comp.id));
  type Side = "top" | "bottom" | "left" | "right" | "inside";
  /** The sides a point lies on (a corner is on two). */
  const sidesOf = (p: Pt): Side[] => {
    const out: Side[] = [];
    if (Math.abs(p.x - x0) < 1) out.push("left");
    if (Math.abs(p.x - (x0 + W)) < 1) out.push("right");
    if (Math.abs(p.y - y0) < 1) out.push("top");
    if (Math.abs(p.y - (y0 + H)) < 1) out.push("bottom");
    return out.length ? out : ["inside"];
  };
  const level = { top: 0, bottom: 0, left: 0, right: 0, inside: 0 };
  for (let guard = 0; guard < 20; guard++) {
    const chain = findChain(parts, done, netPoint, ends);
    if (!chain) break;
    const P = netPoint.get(chain.start)!;
    const Q = netPoint.get(chain.end)!;
    // Both ends on one side (two corners share one): go round the outside, beside that side.
    const shared = sidesOf(P).find(
      (x): x is Exclude<Side, "inside"> => x !== "inside" && sidesOf(Q).includes(x),
    );
    const sp = shared ?? sidesOf(P)[0];
    const sq = shared ?? sidesOf(Q)[0];
    let route: Pt[];
    if (shared) {
      const d = BRIDGE * ++level[shared];
      const off = {
        top: { x: 0, y: -d },
        bottom: { x: 0, y: d },
        left: { x: -d, y: 0 },
        right: { x: d, y: 0 },
      }[shared];
      route = [P, { x: P.x + off.x, y: P.y + off.y }, { x: Q.x + off.x, y: Q.y + off.y }, Q];
    } else {
      const d = (H / 2) * (0.5 + 0.25 * level.inside++);
      const inward = (p: Pt, s: string): Pt =>
        s === "top"
          ? { x: p.x, y: p.y + d }
          : s === "bottom"
            ? { x: p.x, y: p.y - d }
            : s === "left"
              ? { x: p.x + d, y: p.y }
              : s === "right"
                ? { x: p.x - d, y: p.y }
                : p;
      const pi = inward(P, sp);
      const qi = inward(Q, sq);
      route = [P, pi, { x: qi.x, y: pi.y }, qi, Q].filter(
        (p, i, a) => i === 0 || key(p) !== key(a[i - 1]),
      );
    }
    // Parts go on the longest segment of the route; the rest is wire.
    const len = (s: number) => Math.hypot(route[s].x - route[s - 1].x, route[s].y - route[s - 1].y);
    let longest = 1;
    for (let i = 2; i < route.length; i++) if (len(i) > len(longest)) longest = i;
    for (let i = 1; i < route.length; i++) if (i !== longest) wires.push([route[i - 1], route[i]]);
    const segA = route[longest - 1];
    const segB = route[longest];
    const slots = along(segA, segB, chain.links.length);
    chain.links.forEach((l, i) => {
      placed.push({
        comp: l.comp,
        a: slots[i],
        b: slots[i + 1],
        from: termAt(l.comp, l.from),
        to: termAt(l.comp, l.to),
      });
      done.add(l.comp.id);
      if (i < chain.links.length - 1) netPoint.set(l.to, slots[i + 1]);
    });
  }
  if (done.size !== parts.length) return null;

  // Junction dots where three or more wire ends meet.
  const count = new Map<string, { p: Pt; n: number }>();
  const bump = (p: Pt) => {
    const k = key(p);
    count.set(k, { p, n: (count.get(k)?.n ?? 0) + 1 });
  };
  for (const pp of placed) {
    bump(pp.a);
    bump(pp.b);
  }
  for (const [a, b] of wires) {
    bump(a);
    bump(b);
  }
  const dots = [...count.values()].filter((v) => v.n >= 3).map((v) => v.p);

  // Fit the drawing: shift so everything sits inside a margin.
  const all = [...placed.flatMap((p) => [p.a, p.b]), ...wires.flat()];
  const minX = Math.min(...all.map((p) => p.x)) - MARGIN;
  const minY = Math.min(...all.map((p) => p.y)) - MARGIN;
  const maxX = Math.max(...all.map((p) => p.x)) + MARGIN;
  const maxY = Math.max(...all.map((p) => p.y)) + MARGIN;
  const move = (p: Pt) => ({ x: p.x - minX, y: p.y - minY });
  return {
    width: maxX - minX,
    height: maxY - minY,
    parts: placed.map((p) => ({ ...p, a: move(p.a), b: move(p.b) })),
    wires: wires.map(([a, b]) => [move(a), move(b)]),
    dots: dots.map(move),
  };
}

type Link = { comp: CircuitComponent; from: number; to: number };

/** A path of unplaced parts from one placed net to another (breadth first, shortest). */
function findChain(
  parts: readonly CircuitComponent[],
  done: Set<string>,
  netPoint: Map<number, Pt>,
  ends: (p: CircuitComponent) => number[],
): { start: number; end: number; links: Link[] } | null {
  for (const start of netPoint.keys()) {
    const queue: { at: number; links: Link[] }[] = [{ at: start, links: [] }];
    const seen = new Set([start]);
    while (queue.length) {
      const { at, links } = queue.shift()!;
      for (const p of parts) {
        if (done.has(p.id) || links.some((l) => l.comp.id === p.id)) continue;
        const [e0, e1] = ends(p);
        const next = e0 === at ? e1 : e1 === at ? e0 : -1;
        if (next < 0) continue;
        const path = [...links, { comp: p, from: at, to: next }];
        if (netPoint.has(next) && next !== start) return { start, end: next, links: path };
        if (!seen.has(next) && !netPoint.has(next)) {
          seen.add(next);
          queue.push({ at: next, links: path });
        }
      }
    }
  }
  return null;
}
