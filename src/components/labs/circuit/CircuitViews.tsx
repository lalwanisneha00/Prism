"use client";

import { CircuitSymbol } from "@/components/labs/circuit/CircuitSymbol";
import type { Schematic } from "@/lib/labs/circuit/layout";
import { formatSI, splitRef, terminalsOf, type Circuit } from "@/lib/labs/circuit/model";
import type { Reading } from "@/lib/labs/circuit/solve";

/*
 * The two views of a lab circuit (syllabus fix, Phase 7C): the clean circuit diagram, and the
 * connection view, where each wire runs from one terminal to another like on a real lab bench.
 */

export function SchematicView({
  schematic,
  circuit,
  lit = [],
  readings,
}: {
  schematic: Schematic;
  circuit: Circuit;
  lit?: readonly string[];
  readings?: Record<string, Reading>;
}) {
  const on = new Set(lit);
  const focus = on.size > 0;
  const labels = schematicLabels(schematic, readings);
  // Grow the drawing so outside labels are never cut off.
  const minX = Math.min(0, ...labels.map((l) => l.box.x0));
  const maxX = Math.max(schematic.width, ...labels.map((l) => l.box.x1));
  const minY = Math.min(0, ...labels.map((l) => l.box.y0));
  const maxY = Math.max(schematic.height, ...labels.map((l) => l.box.y1));
  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className="block max-h-[28rem] w-full"
      role="img"
      aria-label={`Circuit diagram: ${circuit.components.map((c) => c.label).join(", ")}`}
      data-testid="circuit-schematic"
    >
      {schematic.wires.map(([a, b], i) => (
        <line
          key={i}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="var(--fg)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={focus ? 0.55 : 1}
        />
      ))}
      {schematic.parts.map((p) => {
        const isLit = on.has(p.comp.id);
        return (
          <g
            key={p.comp.id}
            data-component={p.comp.id}
            data-lit={isLit || undefined}
            opacity={focus && !isLit ? 0.4 : 1}
          >
            {isLit && (
              <circle
                cx={(p.a.x + p.b.x) / 2}
                cy={(p.a.y + p.b.y) / 2}
                r={34}
                fill="var(--primary)"
                opacity={0.16}
              />
            )}
            <CircuitSymbol type={p.comp.type} a={p.a} b={p.b} from={p.from} lit={isLit} />
          </g>
        );
      })}
      {labels.map(
        (l) =>
          l.leader && (
            <line
              key={`leader-${l.id}`}
              x1={l.leader.x}
              y1={l.leader.y + 20}
              x2={l.x}
              y2={l.y - 20}
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          ),
      )}
      {labels.map((l) => (
        <g
          key={l.id}
          fontSize={19}
          paintOrder="stroke"
          stroke="var(--surface)"
          strokeWidth={5}
          opacity={focus && !on.has(l.id) ? 0.45 : 1}
        >
          <text
            x={l.x}
            y={l.y}
            textAnchor={l.anchor}
            fill={on.has(l.id) ? "var(--primary)" : "var(--fg)"}
            fontWeight={on.has(l.id) ? 700 : 500}
          >
            {l.text}
          </text>
          {l.reading && (
            <text
              x={l.x}
              y={l.y + 22}
              textAnchor={l.anchor}
              fontWeight={l.live ? 700 : 400}
              fill={l.live ? "var(--primary)" : "var(--muted)"}
              data-reading={l.live ? l.id : undefined}
            >
              {l.reading}
            </text>
          )}
        </g>
      ))}
      {schematic.dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={4} fill="var(--fg)" />
      ))}
    </svg>
  );
}

type Label = {
  id: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  text: string;
  reading?: string;
  /** The second line is a live meter reading (not the part's value). */
  live: boolean;
  /** Where the part is, when its label had to move away from it. */
  leader?: { x: number; y: number };
  box: { x0: number; x1: number; y0: number; y1: number };
};

/**
 * Each part's label (and live reading) on the outward side of the part: above parts in the top
 * half, below in the bottom half, left of parts on the left, right of parts on the right. When that
 * spot is taken by an earlier label, the other side, then below or above the part, are tried, and
 * as a last resort the label moves down until it is clear.
 */
function schematicLabels(schematic: Schematic, readings?: Record<string, Reading>): Label[] {
  const cx = schematic.width / 2;
  const cy = schematic.height / 2;
  const placed: Label[] = [];
  // Labels keep off the other labels and off every part's symbol.
  const symbols = schematic.parts.map((q) => {
    const m = { x: (q.a.x + q.b.x) / 2, y: (q.a.y + q.b.y) / 2 };
    return { x0: m.x - 18, x1: m.x + 18, y0: m.y - 18, y1: m.y + 18 };
  });
  const overlaps = (b: Label["box"], o: Label["box"]) =>
    b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1;
  const clash = (b: Label["box"]) =>
    placed.some((o) => overlaps(b, o.box)) || symbols.some((o) => overlaps(b, o));
  for (const p of schematic.parts) {
    const r = readings?.[p.comp.id];
    // A value only means something with a unit (a switch's "1" doesn't).
    const value =
      p.comp.value !== undefined && !r && unitOf(p.comp.type)
        ? ` ${formatSI(p.comp.value, unitOf(p.comp.type))}`
        : "";
    const text = short(p.comp.label);
    // Second line: the live reading, or the part's value.
    const reading = r ? formatSI(r.value, r.unit) : value.trim() || undefined;
    const horizontal = Math.abs(p.a.y - p.b.y) < 1;
    const mid = { x: (p.a.x + p.b.x) / 2, y: (p.a.y + p.b.y) / 2 };
    const lines = reading ? 2 : 1;
    const at = (x: number, y: number, anchor: Label["anchor"], name = text): Label => {
      const width = Math.max(name.length, reading?.length ?? 0) * 10.4;
      const x0 = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
      return {
        id: p.comp.id,
        x,
        y,
        anchor,
        text: name,
        reading,
        live: Boolean(r),
        box: { x0: x0 - 8, x1: x0 + width + 8, y0: y - 22, y1: y + (lines - 1) * 22 + 10 },
      };
    };
    const above = at(mid.x, Math.min(p.a.y, p.b.y) - 32 - (lines - 1) * 22, "middle");
    const below = at(mid.x, Math.max(p.a.y, p.b.y) + 44, "middle");
    let options: Label[];
    if (horizontal) options = mid.y <= cy ? [above, below] : [below, above];
    else {
      // Outward, unless another upright part is further out beside it (a meter across a
      // source): then inward, so the two labels don't collide.
      const outward = mid.x < cx ? -1 : 1;
      const blocked = schematic.parts.some((q) => {
        if (q === p || Math.abs(q.a.x - q.b.x) > 1) return false;
        const qy = (q.a.y + q.b.y) / 2;
        return Math.abs(qy - mid.y) < 50 && (q.a.x - mid.x) * outward > 10;
      });
      const left = blocked ? outward > 0 : outward < 0;
      const y = mid.y - (lines - 1) * 11 + 6;
      options = [
        at(left ? mid.x - 28 : mid.x + 28, y, left ? "end" : "start"),
        at(left ? mid.x + 28 : mid.x - 28, y, left ? "start" : "end"),
        below,
        above,
      ];
    }
    // No room for the full name: just its id (V1), which the readings below the diagram name.
    const tight = options.map((o) => at(o.x, o.y, o.anchor, p.comp.id));
    let label = [...options, ...tight].find((o) => !clash(o.box)) ?? options[0];
    const pushed = clash(label.box);
    for (let k = 0; clash(label.box) && k < 12; k++)
      label = {
        ...label,
        y: label.y + 24,
        box: { ...label.box, y0: label.box.y0 + 24, y1: label.box.y1 + 24 },
      };
    // A label moved away from its part points back to it.
    placed.push(pushed ? { ...label, leader: mid } : label);
  }
  return placed;
}

const short = (s: string) => (s.length > 22 ? `${s.slice(0, 21)}…` : s);

export function unitOf(type: string): string {
  return (
    {
      battery: "V",
      "dc-supply": "V",
      "ac-supply": "V",
      "function-generator": "V",
      "solar-cell": "A",
      resistor: "Ω",
      rheostat: "Ω",
      potentiometer: "Ω",
      bulb: "Ω",
      capacitor: "F",
      "electrolytic-capacitor": "F",
      inductor: "H",
      zener: "V",
      fuse: "A",
      motor: "Ω",
    }[type] ?? ""
  );
}

const WIRE_COLOURS = [
  "#d93838",
  "#2b7fd6",
  "#1f9d55",
  "#e08a00",
  "#8b5cf6",
  "#0e9aa7",
  "#c2410c",
  "#64748b",
];

const CARD_W = 190;
const CARD_H = 64;
const W = 440;
const ROW = 150;

/** Bench layout: cards two to a row (boards and ICs take a whole row), terminals on the bottom edge. */
export function benchLayout(circuit: Circuit) {
  const cards: { id: string; x: number; y: number; w: number }[] = [];
  let col = 0;
  let row = 0;
  for (const c of circuit.components) {
    const wide = terminalsOf(c).length > 4;
    if (wide && col > 0) {
      row++;
      col = 0;
    }
    const w = wide ? W - 40 : CARD_W;
    cards.push({ id: c.id, x: wide ? 20 : 20 + col * (CARD_W + 20), y: 20 + row * ROW, w });
    if (wide || col === 1) {
      row++;
      col = 0;
    } else col = 1;
  }
  const rows = row + (col > 0 ? 1 : 0);
  const terminal = new Map<string, { x: number; y: number }>();
  for (const c of circuit.components) {
    const card = cards.find((k) => k.id === c.id)!;
    const ts = terminalsOf(c);
    ts.forEach((t, i) => {
      terminal.set(`${c.id}.${t}`, {
        x: card.x + ((i + 1) * card.w) / (ts.length + 1),
        y: card.y + CARD_H,
      });
    });
  }
  return { cards, terminal, height: 20 + rows * ROW };
}

/** Gaps between and beside the cards, where wires between rows run. */
const GUTTERS = [12, 220, 428];

/**
 * A wire on the bench: in one row, a curve under the cards; between rows, down from the upper
 * terminal, along to the nearest gap, down past the lower card, and up into its terminal, so it
 * never crosses a card. Wires get their own lanes so they don't lie on top of each other.
 */
export function benchWire(a: { x: number; y: number }, b: { x: number; y: number }, k: number) {
  const lane = (k % 4) * 7;
  if (Math.abs(a.y - b.y) < 1) {
    const drop = 36 + lane * 1.4;
    return {
      d: `M${a.x} ${a.y} C${a.x} ${a.y + drop} ${b.x} ${b.y + drop} ${b.x} ${b.y}`,
      mid: { x: (a.x + b.x) / 2, y: a.y + drop * 0.75 },
    };
  }
  const [hi, lo] = a.y < b.y ? [a, b] : [b, a];
  const g =
    GUTTERS.reduce((best, x) =>
      Math.abs(hi.x - x) + Math.abs(lo.x - x) < Math.abs(hi.x - best) + Math.abs(lo.x - best)
        ? x
        : best,
    ) +
    (lane - 10) * 0.6;
  const y1 = hi.y + 18 + lane;
  const y2 = lo.y + 18 + lane;
  return {
    d: `M${hi.x} ${hi.y} V${y1} H${g} V${y2} H${lo.x} V${lo.y}`,
    mid: { x: g, y: (y1 + y2) / 2 },
  };
}

/**
 * Each wire as a curve from terminal to terminal. With `upTo`, only the first wiring steps' wires
 * are shown (the circuit builds up wire by wire) and `current` ones are drawn thick.
 */
export function ConnectionView({
  circuit,
  shown,
  current = [],
}: {
  circuit: Circuit;
  /** Wires to show (indexes); all when undefined. */
  shown?: ReadonlySet<number>;
  current?: readonly number[];
}) {
  const { cards, terminal, height } = benchLayout(circuit);
  const now = new Set(current);
  const touched = new Set(
    current.flatMap((k) =>
      [circuit.connections[k].from, circuit.connections[k].to].map((r) => splitRef(r).comp),
    ),
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="block w-full"
      role="img"
      aria-label="Connection view: each wire from terminal to terminal"
      data-testid="circuit-connections"
    >
      {cards.map((card) => {
        const c = circuit.components.find((p) => p.id === card.id)!;
        const lit = touched.has(c.id);
        return (
          <g key={c.id} data-card={c.id}>
            <rect
              x={card.x}
              y={card.y}
              width={card.w}
              height={CARD_H}
              rx={10}
              fill={lit ? "var(--primary-soft)" : "var(--surface-2)"}
              stroke={lit ? "var(--primary)" : "var(--border)"}
              strokeWidth={lit ? 2.5 : 1.5}
            />
            <text x={card.x + 10} y={card.y + 22} fontSize={14} fontWeight={700} fill="var(--fg)">
              {c.id}
            </text>
            <text x={card.x + 10} y={card.y + 40} fontSize={12} fill="var(--muted)">
              {short(c.label)}
            </text>
            {terminalsOf(c).map((t) => {
              const p = terminal.get(`${c.id}.${t}`)!;
              return (
                <g key={t}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    fill="var(--surface)"
                    stroke="var(--fg)"
                    strokeWidth={2}
                  />
                  <text
                    x={p.x}
                    y={p.y - 9}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill="var(--fg)"
                  >
                    {t === "-" ? "−" : t}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      {circuit.connections.map((w, k) => {
        if (shown && !shown.has(k)) return null;
        const a = terminal.get(w.from);
        const b = terminal.get(w.to);
        if (!a || !b) return null;
        const { d, mid } = benchWire(a, b, k);
        const colour = WIRE_COLOURS[k % WIRE_COLOURS.length];
        const isNow = now.has(k);
        return (
          <g key={k} data-wire={k} opacity={current.length && !isNow ? 0.45 : 1}>
            <path
              d={d}
              fill="none"
              stroke={colour}
              strokeWidth={isNow ? 5 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={mid.x} cy={mid.y} r={9} fill={colour} />
            <text
              x={mid.x}
              y={mid.y + 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="#fff"
            >
              {k + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** A small live line graph (no chart library: it redraws on every slider move). */
export function LiveGraph({
  points,
  at,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
  line = true,
  dots = false,
}: {
  points: { x: number; y: number }[];
  /** Join the points (false: points only). */
  line?: boolean;
  dots?: boolean;
  at?: { x: number; y: number };
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
}) {
  if (points.length < 2) return null;
  const GW = 440;
  const GH = 260;
  const pad = { l: 64, r: 16, t: 16, b: 46 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs, 0), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys, 0), Math.max(...ys)];
  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (GW - pad.l - pad.r);
  const sy = (y: number) => GH - pad.b - ((y - y0) / (y1 - y0 || 1)) * (GH - pad.t - pad.b);
  const ticks = (lo: number, hi: number) =>
    Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const path = points
    .map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join("");
  return (
    <svg
      viewBox={`0 0 ${GW} ${GH}`}
      className="block w-full"
      role="img"
      aria-label={`${yLabel} against ${xLabel}`}
      data-testid="live-graph"
    >
      {ticks(y0, y1).map((t, i) => (
        <g key={`y${i}`}>
          <line x1={pad.l} x2={GW - pad.r} y1={sy(t)} y2={sy(t)} stroke="var(--border)" />
          <text x={pad.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
            {formatSI(t, yUnit, 2)}
          </text>
        </g>
      ))}
      {ticks(x0, x1).map((t, i) => (
        <text
          key={`x${i}`}
          x={sx(t)}
          y={GH - pad.b + 16}
          textAnchor="middle"
          fontSize={11}
          fill="var(--muted)"
        >
          {formatSI(t, xUnit, 2)}
        </text>
      ))}
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={GH - pad.b} stroke="var(--fg)" />
      <line x1={pad.l} x2={GW - pad.r} y1={GH - pad.b} y2={GH - pad.b} stroke="var(--fg)" />
      {line && <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2.5} />}
      {dots &&
        points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="var(--primary)" />
        ))}
      {at && Number.isFinite(at.x) && Number.isFinite(at.y) && (
        <circle
          cx={sx(at.x)}
          cy={sy(at.y)}
          r={6}
          fill="var(--primary)"
          stroke="var(--surface)"
          strokeWidth={2}
        />
      )}
      <text
        x={(pad.l + GW - pad.r) / 2}
        y={GH - 8}
        textAnchor="middle"
        fontSize={12}
        fill="var(--fg)"
      >
        {xLabel}
      </text>
      <text
        x={14}
        y={(pad.t + GH - pad.b) / 2}
        textAnchor="middle"
        fontSize={12}
        fill="var(--fg)"
        transform={`rotate(-90 14 ${(pad.t + GH - pad.b) / 2})`}
      >
        {yLabel}
      </text>
    </svg>
  );
}
