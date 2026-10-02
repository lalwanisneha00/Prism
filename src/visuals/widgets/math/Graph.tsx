"use client";

import type { MouseEvent, ReactNode } from "react";
import { niceTicks } from "@/visuals/Plot";

export const GW = 640;
export const GH = 320;
const PAD = { left: 44, right: 12, top: 12, bottom: 28 };

export type Bounds = { xMin: number; xMax: number; yMin: number; yMax: number };
export type Scale = {
  sx: (x: number) => number;
  sy: (y: number) => number;
  bounds: Bounds;
};

/**
 * Bounds centred on the origin where one unit is the same length across and up, so angles
 * and shapes are true (needed for vectors, rotations and eigenvectors).
 */
export function equalAspectBounds(halfHeight: number): Bounds {
  const plotW = GW - PAD.left - PAD.right;
  const plotH = GH - PAD.top - PAD.bottom;
  const halfWidth = Number(((halfHeight * plotW) / plotH).toPrecision(6));
  return { xMin: -halfWidth, xMax: halfWidth, yMin: -halfHeight, yMax: halfHeight };
}

/** Pixel positions rounded to 1/100 px, so server and browser draw identical SVG. */
const px = (v: number) => Math.round(v * 100) / 100;

export function makeGraphScale(bounds: Bounds): Scale {
  const sx = (x: number) =>
    px(PAD.left + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * (GW - PAD.left - PAD.right));
  const sy = (y: number) =>
    px(
      GH -
        PAD.bottom -
        ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * (GH - PAD.top - PAD.bottom),
    );
  return { sx, sy, bounds };
}

/** A polyline through (x, f(x)), broken wherever f is undefined or far off the graph. */
export function curvePath(scale: Scale, f: (x: number) => number, samples = 240): string[] {
  const { xMin, xMax, yMin, yMax } = scale.bounds;
  const margin = (yMax - yMin) * 2;
  const segments: string[] = [];
  let current: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = xMin + ((xMax - xMin) * i) / samples;
    const y = f(x);
    if (Number.isFinite(y) && y > yMin - margin && y < yMax + margin) {
      current.push(`${scale.sx(x).toFixed(1)},${scale.sy(y).toFixed(1)}`);
    } else if (current.length) {
      segments.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) segments.push(current.join(" "));
  return segments;
}

const tickLabel = (v: number) =>
  Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(0) : String(v);

/** Axes, grid and tick labels; children draw on top using the same scale. */
export function Graph({
  scale,
  label,
  children,
  onPoint,
}: {
  scale: Scale;
  label: string;
  children: ReactNode;
  /** Called with graph coordinates when the student taps the graph. */
  onPoint?: (x: number, y: number) => void;
}) {
  const { xMin, xMax, yMin, yMax } = scale.bounds;
  const x0 = Math.min(Math.max(0, xMin), xMax);
  const y0 = Math.min(Math.max(0, yMin), yMax);

  function handleClick(e: MouseEvent<SVGSVGElement>) {
    if (!onPoint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * GW;
    const py = ((e.clientY - rect.top) / rect.height) * GH;
    const x = xMin + ((px - PAD.left) / (GW - PAD.left - PAD.right)) * (xMax - xMin);
    const y = yMin + ((GH - PAD.bottom - py) / (GH - PAD.top - PAD.bottom)) * (yMax - yMin);
    if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) onPoint(x, y);
  }

  return (
    <svg
      viewBox={`0 0 ${GW} ${GH}`}
      className={`block w-full ${onPoint ? "cursor-crosshair" : ""}`}
      role="img"
      aria-label={label}
      onClick={handleClick}
    >
      <defs>
        <clipPath id="graph-area">
          <rect
            x={PAD.left}
            y={PAD.top}
            width={GW - PAD.left - PAD.right}
            height={GH - PAD.top - PAD.bottom}
          />
        </clipPath>
      </defs>
      {niceTicks(yMin, yMax).map((t) => (
        <g key={`y${t}`}>
          <line
            x1={PAD.left}
            x2={GW - PAD.right}
            y1={scale.sy(t)}
            y2={scale.sy(t)}
            stroke="var(--border)"
          />
          <text
            x={PAD.left - 5}
            y={scale.sy(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--muted)"
          >
            {tickLabel(t)}
          </text>
        </g>
      ))}
      {niceTicks(xMin, xMax).map((t) => (
        <g key={`x${t}`}>
          <line
            x1={scale.sx(t)}
            x2={scale.sx(t)}
            y1={PAD.top}
            y2={GH - PAD.bottom}
            stroke="var(--border)"
          />
          <text
            x={scale.sx(t)}
            y={GH - PAD.bottom + 16}
            textAnchor="middle"
            fontSize="11"
            fill="var(--muted)"
          >
            {tickLabel(t)}
          </text>
        </g>
      ))}
      <line
        x1={PAD.left}
        x2={GW - PAD.right}
        y1={scale.sy(y0)}
        y2={scale.sy(y0)}
        stroke="var(--muted)"
      />
      <line
        x1={scale.sx(x0)}
        x2={scale.sx(x0)}
        y1={PAD.top}
        y2={GH - PAD.bottom}
        stroke="var(--muted)"
      />
      <g clipPath="url(#graph-area)">{children}</g>
    </svg>
  );
}

export function Curve({
  scale,
  f,
  color = "var(--primary)",
  width = 3,
  dashed = false,
}: {
  scale: Scale;
  f: (x: number) => number;
  color?: string;
  width?: number;
  dashed?: boolean;
}) {
  return (
    <>
      {curvePath(scale, f).map((points, i) => (
        <polyline
          key={i}
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinejoin="round"
          strokeDasharray={dashed ? "7 5" : undefined}
        />
      ))}
    </>
  );
}

/** A colour key under a graph. */
export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-2 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-0.5 w-5"
            style={{
              background: i.dashed
                ? `repeating-linear-gradient(90deg, ${i.color} 0 6px, transparent 6px 10px)`
                : i.color,
            }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
