"use client";

import { niceTicks } from "@/visuals/Plot";
import { palette } from "@/visuals/generic/Frame";
import type { ChartSpec } from "@/visuals/generic/specs";

const W = 640;
const H = 300;
const PAD = { left: 56, right: 16, top: 16, bottom: 48 };

const tick = (v: number) => String(Number(v.toPrecision(4)));

/** Box-and-whisker plot drawn directly in SVG: whisker min–max, box Q1–Q3, line at the median. */
export function BoxPlot({ spec }: { spec: ChartSpec }) {
  const boxes = spec.boxes ?? [];
  const lo = Math.min(...boxes.map((b) => b.min));
  const hi = Math.max(...boxes.map((b) => b.max));
  const pad = (hi - lo) * 0.1 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const sy = (v: number) =>
    H - PAD.bottom - ((v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
  const slot = (W - PAD.left - PAD.right) / Math.max(1, boxes.length);
  const boxWidth = Math.min(90, slot * 0.5);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      role="img"
      aria-label={`Box plot of ${spec.yLabel}`}
    >
      {niceTicks(yMin, yMax).map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="var(--border)" />
          <text x={PAD.left - 6} y={sy(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
            {tick(t)}
          </text>
        </g>
      ))}
      <text
        x={14}
        y={H / 2}
        textAnchor="middle"
        fontSize="13"
        fill="var(--muted)"
        transform={`rotate(-90 14 ${H / 2})`}
      >
        {spec.yLabel}
      </text>
      <text
        x={(PAD.left + W - PAD.right) / 2}
        y={H - 8}
        textAnchor="middle"
        fontSize="13"
        fill="var(--muted)"
      >
        {spec.xLabel}
      </text>
      {boxes.map((b, i) => {
        const cx = PAD.left + slot * (i + 0.5);
        const color = palette[i % palette.length];
        return (
          <g key={b.name}>
            <title>{`${b.name}: min ${tick(b.min)}, Q1 ${tick(b.q1)}, median ${tick(b.median)}, Q3 ${tick(b.q3)}, max ${tick(b.max)}`}</title>
            <line
              x1={cx}
              x2={cx}
              y1={sy(b.max)}
              y2={sy(b.min)}
              stroke="var(--muted)"
              strokeWidth={2}
            />
            {[b.min, b.max].map((v) => (
              <line
                key={v}
                x1={cx - boxWidth / 4}
                x2={cx + boxWidth / 4}
                y1={sy(v)}
                y2={sy(v)}
                stroke="var(--muted)"
                strokeWidth={2}
              />
            ))}
            <rect
              x={cx - boxWidth / 2}
              y={sy(b.q3)}
              width={boxWidth}
              height={Math.max(1, sy(b.q1) - sy(b.q3))}
              fill={color}
              fillOpacity={0.3}
              stroke={color}
              strokeWidth={2}
              rx={3}
            />
            <line
              x1={cx - boxWidth / 2}
              x2={cx + boxWidth / 2}
              y1={sy(b.median)}
              y2={sy(b.median)}
              stroke={color}
              strokeWidth={4}
            />
            <text x={cx} y={H - PAD.bottom + 18} textAnchor="middle" fontSize="12" fill="var(--fg)">
              {b.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
