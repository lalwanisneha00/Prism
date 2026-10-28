"use client";

import type { PracticalLesson } from "@/lib/labs/practicalSchema";

type Apparatus = PracticalLesson["apparatus"];

const W = 440;
const BOX_W = 190;
const BOX_H = 54;
const COLS = 2;

/** Box positions: two to a row, in the order the AI listed the parts (the app draws, never the AI). */
export function diagramLayout(parts: Apparatus["parts"]) {
  const rows = Math.ceil(parts.length / COLS);
  const gapX = (W - COLS * BOX_W) / (COLS + 1);
  const positions = new Map<string, { x: number; y: number }>();
  parts.forEach((p, i) => {
    const row = Math.floor(i / COLS);
    const inRow = Math.min(COLS, parts.length - row * COLS);
    // Rows with fewer boxes are centred.
    const offset = ((COLS - inRow) * (BOX_W + gapX)) / 2;
    positions.set(p.id, {
      x: gapX + offset + (i % COLS) * (BOX_W + gapX),
      y: 24 + row * (BOX_H + 56),
    });
  });
  return { positions, height: 24 + rows * (BOX_H + 56) - 32 };
}

/**
 * The setup as labelled boxes joined by labelled lines. Parts named in `highlight` light up, so a
 * procedure step can show what it uses.
 */
export function ApparatusDiagram({
  apparatus,
  highlight = [],
}: {
  apparatus: Apparatus;
  highlight?: readonly string[];
}) {
  const { positions, height } = diagramLayout(apparatus.parts);
  const lit = new Set(highlight);
  const centre = (id: string) => {
    const p = positions.get(id)!;
    return { x: p.x + BOX_W / 2, y: p.y + BOX_H / 2 };
  };
  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="block w-full"
          role="img"
          aria-label={`Setup: ${apparatus.parts.map((p) => p.label).join(", ")}`}
          data-testid="apparatus-diagram"
        >
          {apparatus.links.map((l, i) => {
            const a = centre(l.from);
            const b = centre(l.to);
            const on = lit.has(l.from) && lit.has(l.to);
            return (
              <g key={i}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={on ? "var(--primary)" : "var(--muted)"}
                  strokeWidth={on ? 3 : 1.6}
                />
                {l.label && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 6}
                    textAnchor="middle"
                    fontSize={14}
                    fill="var(--muted)"
                    paintOrder="stroke"
                    stroke="var(--surface)"
                    strokeWidth={4}
                  >
                    {l.label}
                  </text>
                )}
              </g>
            );
          })}
          {apparatus.parts.map((p) => {
            const pos = positions.get(p.id)!;
            const on = lit.has(p.id);
            return (
              <g key={p.id} data-part={p.id} data-lit={on ? "true" : undefined}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={BOX_W}
                  height={BOX_H}
                  rx={10}
                  fill={on ? "var(--primary-soft)" : "var(--surface-2)"}
                  stroke={on ? "var(--primary)" : "var(--border)"}
                  strokeWidth={on ? 3 : 1.5}
                />
                <text
                  x={pos.x + BOX_W / 2}
                  y={pos.y + BOX_H / 2 + 5}
                  textAnchor="middle"
                  fontSize={17}
                  fontWeight={600}
                  fill="var(--fg)"
                >
                  {p.label.length > 20 ? `${p.label.slice(0, 19)}…` : p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="text-sm text-muted">
        Labelled setup diagram, drawn by Prism from the apparatus list.
      </figcaption>
    </figure>
  );
}
