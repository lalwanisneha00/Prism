"use client";

import { useMemo } from "react";
import { parseExpression } from "@/visuals/expression";

const W = 640;
const H = 300;
const PAD = { left: 56, right: 16, top: 16, bottom: 44 };

/** "Nice" tick values (1, 2, 5 × 10ⁿ) covering [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  return ticks;
}

const label = (v: number) =>
  Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(0) : String(v);

/** A graph of y = f(x). The curve is computed by our own parser, never drawn by the AI. */
export function Plot({
  expression,
  xRange,
  xLabel,
  yLabel,
  caption,
}: {
  expression: string;
  xRange: [number, number];
  xLabel: string;
  yLabel: string;
  caption: string;
}) {
  const data = useMemo(() => {
    const fn = parseExpression(expression);
    const [x0, x1] = xRange;
    const pts = Array.from({ length: 241 }, (_, i) => {
      const x = x0 + ((x1 - x0) * i) / 240;
      return { x, y: fn(x) };
    });
    const ys = pts
      .map((p) => p.y)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    // Ignore the extreme 2% so a spike (like 1/x² near 0) doesn't flatten the rest.
    let yMin = ys[Math.floor(ys.length * 0.02)] ?? 0;
    let yMax = ys[Math.ceil(ys.length * 0.98) - 1] ?? 1;
    if (yMin > 0 && yMin < yMax * 0.5) yMin = 0;
    if (yMax < 0) yMax = 0;
    if (yMax - yMin < 1e-12) {
      yMin -= 1;
      yMax += 1;
    }
    const pad = (yMax - yMin) * 0.08;
    return { pts, yMin: yMin - pad, yMax: yMax + pad };
  }, [expression, xRange]);

  const sx = (x: number) =>
    PAD.left + ((x - xRange[0]) / (xRange[1] - xRange[0])) * (W - PAD.left - PAD.right);
  const sy = (y: number) =>
    H - PAD.bottom - ((y - data.yMin) / (data.yMax - data.yMin)) * (H - PAD.top - PAD.bottom);

  // Break the line wherever the function is undefined or leaves the visible range.
  const segments: string[] = [];
  let current: string[] = [];
  for (const p of data.pts) {
    const visible = Number.isFinite(p.y) && p.y >= data.yMin && p.y <= data.yMax;
    if (visible) current.push(`${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`);
    else if (current.length) {
      segments.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) segments.push(current.join(" "));

  const yZero = data.yMin < 0 && data.yMax > 0 ? sy(0) : null;

  return (
    <figure className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3 sm:p-4">
      <p className="text-sm font-semibold">Graph</p>
      <div className="rounded-lg border border-border bg-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={`Graph of ${yLabel} against ${xLabel}`}
        >
          {niceTicks(data.yMin, data.yMax).map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD.left} y1={sy(t)} x2={W - PAD.right} y2={sy(t)} stroke="var(--border)" />
              <text
                x={PAD.left - 6}
                y={sy(t) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--muted)"
              >
                {label(t)}
              </text>
            </g>
          ))}
          {niceTicks(xRange[0], xRange[1]).map((t) => (
            <text
              key={`x${t}`}
              x={sx(t)}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize="11"
              fill="var(--muted)"
            >
              {label(t)}
            </text>
          ))}
          <line
            x1={PAD.left}
            y1={H - PAD.bottom}
            x2={W - PAD.right}
            y2={H - PAD.bottom}
            stroke="var(--muted)"
          />
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={H - PAD.bottom}
            stroke="var(--muted)"
          />
          {yZero !== null && (
            <line
              x1={PAD.left}
              y1={yZero}
              x2={W - PAD.right}
              y2={yZero}
              stroke="var(--muted)"
              strokeDasharray="4 4"
            />
          )}
          {segments.map((s, i) => (
            <polyline
              key={i}
              points={s}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          ))}
          <text
            x={(PAD.left + W - PAD.right) / 2}
            y={H - 8}
            textAnchor="middle"
            fontSize="13"
            fill="var(--fg)"
          >
            {xLabel}
          </text>
          <text
            x={14}
            y={H / 2}
            textAnchor="middle"
            fontSize="13"
            fill="var(--fg)"
            transform={`rotate(-90 14 ${H / 2})`}
          >
            {yLabel}
          </text>
        </svg>
      </div>
      <figcaption className="text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}
