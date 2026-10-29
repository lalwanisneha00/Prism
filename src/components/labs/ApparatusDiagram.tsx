"use client";

import { useId } from "react";
import { ApparatusIconAt } from "@/components/labs/ApparatusIcon";
import type { ApparatusIconName } from "@/lib/labs/apparatusIcons";
import { ICON_Y, layoutSetup, ROW_H, SETUP_W, type PlacedPart } from "@/lib/labs/setupLayout";

/** A setup: Phase 7B apparatus (boxes) or Phase 7C setup (drawn apparatus and kinds of link). */
export type SetupLike = {
  parts: readonly { id: string; label: string; icon?: ApparatusIconName; role?: string }[];
  links: readonly {
    from: string;
    to: string;
    label?: string;
    kind?: "wire" | "tube" | "light" | "mechanical" | "flow";
  }[];
};

type LinkKind = NonNullable<SetupLike["links"][number]["kind"]>;

/** Radius of the disc each part stands in. */
const R = 34;

const LINK_STYLE: Record<
  LinkKind,
  { stroke: string; width: number; dash?: string; glow?: string; moving?: boolean }
> = {
  wire: { stroke: "#d93838", width: 2.5 },
  tube: { stroke: "#64748b", width: 6 },
  light: { stroke: "#f2a900", width: 3, dash: "10 8", glow: "#ffd34d", moving: true },
  mechanical: { stroke: "var(--muted)", width: 2.5, dash: "3 5" },
  flow: { stroke: "#2b7fd6", width: 3, dash: "12 8", glow: "#8cc4ff", moving: true },
};

const KIND_NAME: Record<LinkKind, string> = {
  wire: "wire",
  tube: "tube or pipe",
  light: "light path",
  mechanical: "mechanical link",
  flow: "flow",
};

/**
 * The path of a link between two parts: straight between neighbours on a bench, an arch over a
 * part in between, and a curve between benches. Ends stop at the discs' edges.
 */
function linkPath(a: PlacedPart, b: PlacedPart) {
  if (a.row === b.row) {
    const dir = Math.sign(b.x - a.x) || 1;
    const x1 = a.x + dir * (R + 4);
    const x2 = b.x - dir * (R + 4);
    if (Math.abs(a.col - b.col) <= 1)
      return { d: `M${x1} ${a.y} L${x2} ${b.y}`, mid: { x: (x1 + x2) / 2, y: a.y } };
    const top = a.y - R - 22;
    return {
      d: `M${a.x} ${a.y - R - 4} C${a.x} ${top} ${b.x} ${top} ${b.x} ${b.y - R - 4}`,
      mid: { x: (a.x + b.x) / 2, y: top + 6 },
    };
  }
  const [hi, lo] = a.y < b.y ? [a, b] : [b, a];
  const y1 = hi.y + R + 26 + hi.lines.length * 16;
  const y2 = lo.y - R - 4;
  const d =
    Math.abs(hi.x - lo.x) < 1
      ? `M${hi.x} ${y1} L${lo.x} ${y2}`
      : `M${hi.x} ${y1} C${hi.x} ${(y1 + y2) / 2} ${lo.x} ${(y1 + y2) / 2} ${lo.x} ${y2}`;
  // Keep the drawing direction a → b so moving light and flow run the right way.
  const path = a === hi ? d : reversePath(hi, lo, y1, y2);
  return { d: path, mid: { x: (hi.x + lo.x) / 2, y: (y1 + y2) / 2 } };
}

function reversePath(hi: PlacedPart, lo: PlacedPart, y1: number, y2: number) {
  return Math.abs(hi.x - lo.x) < 1
    ? `M${lo.x} ${y2} L${hi.x} ${y1}`
    : `M${lo.x} ${y2} C${lo.x} ${(y1 + y2) / 2} ${hi.x} ${(y1 + y2) / 2} ${hi.x} ${y1}`;
}

/** Whether a link's label fits beside its line (about 7 units a letter). */
function fits(a: PlacedPart, b: PlacedPart, label: string) {
  if (a.row !== b.row) return label.length <= 16;
  return Math.abs(b.x - a.x) - 2 * R - 8 >= label.length * 6.6 + 10;
}

/**
 * The setup drawn as apparatus standing on the lab bench, in the order the experiment runs,
 * joined by wires, tubes, light paths or flows (light and flow move, so the direction shows).
 * Parts named in `highlight` light up and the rest fade, so a step can show what it uses.
 */
export function ApparatusDiagram({
  apparatus,
  highlight = [],
  caption = true,
}: {
  apparatus: SetupLike;
  highlight?: readonly string[];
  /** The line under the drawing (off when the procedure player explains it). */
  caption?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { placed, rows, height } = layoutSetup(apparatus.parts, apparatus.links);
  const lit = new Set(highlight);
  const focus = lit.size > 0;
  const links = apparatus.links.filter(
    (l) => placed.has(l.from) && placed.has(l.to) && l.from !== l.to,
  );
  const crowded = links.filter(
    (l) => l.label && !fits(placed.get(l.from)!, placed.get(l.to)!, l.label),
  );
  const kinds = [...new Set(links.map((l) => l.kind ?? "wire"))];
  const name = (id: string) => apparatus.parts.find((p) => p.id === id)?.label ?? id;
  return (
    <figure className="mx-auto flex w-full max-w-xl flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <svg
          viewBox={`0 0 ${SETUP_W} ${height}`}
          className="block w-full"
          role="img"
          aria-label={`Setup: ${apparatus.parts.map((p) => p.label).join(", ")}`}
          data-testid="apparatus-diagram"
        >
          <defs>
            <linearGradient id={`bench-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c8a27a" />
              <stop offset="1" stopColor="#9c7552" />
            </linearGradient>
            <radialGradient id={`disc-${uid}`} cx="0.5" cy="0.35" r="0.7">
              <stop offset="0" stopColor="var(--surface)" />
              <stop offset="1" stopColor="var(--surface-2)" />
            </radialGradient>
            {(["light", "flow", "wire", "tube", "mechanical"] as const).map((k) => (
              <marker
                key={k}
                id={`arrow-${k}-${uid}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0 0L10 5L0 10z" fill={LINK_STYLE[k].stroke} />
              </marker>
            ))}
          </defs>
          <style>{`@keyframes lab-flow-${uid} { to { stroke-dashoffset: -36; } } .lab-moving-${uid} { animation: lab-flow-${uid} 1.1s linear infinite; } @keyframes lab-pulse-${uid} { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.6; } } .lab-pulse-${uid} { animation: lab-pulse-${uid} 1.6s ease-in-out infinite; } @media (prefers-reduced-motion: reduce) { .lab-moving-${uid}, .lab-pulse-${uid} { animation: none; } }`}</style>

          {/* One bench top under each row of apparatus. */}
          {Array.from({ length: rows }, (_, r) => {
            const y = r * ROW_H + ICON_Y + R + 6;
            return (
              <g key={r} aria-hidden="true">
                <rect
                  x={10}
                  y={y}
                  width={SETUP_W - 20}
                  height={9}
                  rx={3}
                  fill={`url(#bench-${uid})`}
                />
                <rect x={10} y={y + 9} width={SETUP_W - 20} height={3} fill="#000" opacity={0.08} />
              </g>
            );
          })}

          {links.map((l, i) => {
            const a = placed.get(l.from)!;
            const b = placed.get(l.to)!;
            const kind = l.kind ?? "wire";
            const st = LINK_STYLE[kind];
            const on = lit.has(l.from) && lit.has(l.to);
            const faded = focus && !on;
            const { d, mid } = linkPath(a, b);
            const directed = kind === "light" || kind === "flow";
            return (
              <g key={i} data-link={kind} opacity={faded ? 0.35 : 1}>
                {st.glow && (
                  <path
                    d={d}
                    fill="none"
                    stroke={st.glow}
                    strokeWidth={on ? 14 : 10}
                    strokeLinecap="round"
                    opacity={0.35}
                  />
                )}
                <path
                  d={d}
                  fill="none"
                  stroke={st.stroke}
                  strokeWidth={on ? st.width + 1.5 : st.width}
                  strokeDasharray={st.dash}
                  strokeLinecap="round"
                  className={st.moving ? `lab-moving-${uid}` : undefined}
                  markerEnd={directed ? `url(#arrow-${kind}-${uid})` : undefined}
                />
                {l.label && fits(a, b, l.label) && (
                  <text
                    x={mid.x}
                    y={a.row === b.row && Math.abs(a.col - b.col) <= 1 ? mid.y - 12 : mid.y + 4}
                    textAnchor={a.row === b.row ? "middle" : "start"}
                    dx={a.row === b.row ? 0 : 8}
                    fontSize={12}
                    fontWeight={600}
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

          {[...placed.values()].map((p) => {
            const part = apparatus.parts.find((q) => q.id === p.id)!;
            const on = lit.has(p.id);
            const faded = focus && !on;
            return (
              <g
                key={p.id}
                data-part={p.id}
                data-lit={on ? "true" : undefined}
                opacity={faded ? 0.45 : 1}
              >
                {on && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={R + 9}
                    fill="var(--primary)"
                    className={`lab-pulse-${uid}`}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={R}
                  fill={on ? "var(--primary-soft)" : `url(#disc-${uid})`}
                  stroke={on ? "var(--primary)" : "var(--border)"}
                  strokeWidth={on ? 3 : 1.5}
                />
                <g color={on ? "var(--primary)" : "var(--fg)"}>
                  {part.icon ? (
                    <ApparatusIconAt name={part.icon} x={p.x - 24} y={p.y - 24} size={48} />
                  ) : (
                    <text
                      x={p.x}
                      y={p.y + 8}
                      textAnchor="middle"
                      fontSize={22}
                      fontWeight={700}
                      fill="currentColor"
                    >
                      {initials(part.label)}
                    </text>
                  )}
                </g>
                {/* The part's number in the parts list. */}
                <circle
                  cx={p.x - R + 4}
                  cy={p.y - R + 4}
                  r={10}
                  fill={on ? "var(--primary)" : "var(--fg)"}
                />
                <text
                  x={p.x - R + 4}
                  y={p.y - R + 8}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--surface)"
                >
                  {p.n}
                </text>
                {p.lines.map((line, k) => (
                  <text
                    key={k}
                    x={p.x}
                    y={p.y + R + 36 + k * 16}
                    textAnchor="middle"
                    fontSize={13.5}
                    fontWeight={on ? 700 : 600}
                    fill={on ? "var(--primary)" : "var(--fg)"}
                  >
                    {line}
                  </text>
                ))}
                <title>{part.role ? `${part.label}: ${part.role}` : part.label}</title>
              </g>
            );
          })}
        </svg>
      </div>
      {(kinds.length > 1 || kinds.some((k) => k === "light" || k === "flow")) && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Key">
          {kinds.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <svg width="26" height="10" aria-hidden="true">
                <line
                  x1="2"
                  y1="5"
                  x2="24"
                  y2="5"
                  stroke={LINK_STYLE[k].stroke}
                  strokeWidth={Math.min(LINK_STYLE[k].width, 4)}
                  strokeDasharray={LINK_STYLE[k].dash}
                  strokeLinecap="round"
                />
              </svg>
              {KIND_NAME[k]}
            </li>
          ))}
        </ul>
      )}
      {crowded.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs text-muted" data-testid="link-legend">
          {crowded.map((l, i) => (
            <li key={i}>
              {name(l.from)} → {name(l.to)}: <span className="font-semibold">{l.label}</span>
            </li>
          ))}
        </ul>
      )}
      {caption && (
        <figcaption className="text-sm text-muted">
          Setup drawn by Prism from the apparatus list, in the order the experiment runs. The
          numbers match the parts list.
        </figcaption>
      )}
    </figure>
  );
}

function initials(label: string) {
  return label
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
