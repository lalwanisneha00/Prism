"use client";

/*
 * A small live graph for lab simulations (syllabus fix, Phase 7C fixes): one or more curves, the
 * reading the student is on as a dot, and optional sample points (what you'd write in the
 * observation table). Redrawn on every slider move, so no chart library.
 */

export type PlotSeries = {
  points: readonly (readonly [number, number])[];
  colour: string;
  label?: string;
  dashed?: boolean;
  /** Draw dots at the points instead of a line. */
  dots?: boolean;
};

const GW = 440;
const GH = 230;
const PAD = { l: 58, r: 14, t: 14, b: 44 };

/** About five round tick values covering lo..hi. */
function ticks(lo: number, hi: number): number[] {
  const span = hi - lo || 1;
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-6; t += step)
    out.push(Number(t.toPrecision(10)));
  return out;
}

const tickText = (v: number) => {
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) return v.toExponential(0);
  return String(Number(v.toPrecision(3)));
};

export function LabPlot({
  series,
  at,
  xLabel,
  yLabel,
  xRange,
  yRange,
  title,
}: {
  series: readonly PlotSeries[];
  at?: { x: number; y: number; colour?: string };
  xLabel: string;
  yLabel: string;
  xRange?: [number, number];
  yRange?: [number, number];
  title?: string;
}) {
  const all = series.flatMap((s) => s.points);
  if (at) all.push([at.x, at.y]);
  const xs = all.map((p) => p[0]).filter(Number.isFinite);
  const ys = all.map((p) => p[1]).filter(Number.isFinite);
  if (xs.length < 2) return null;
  const [x0, x1] = xRange ?? [Math.min(0, ...xs), Math.max(...xs)];
  const [y0, y1] = yRange ?? [Math.min(0, ...ys), Math.max(...ys)];
  const sx = (x: number) => PAD.l + ((x - x0) / (x1 - x0 || 1)) * (GW - PAD.l - PAD.r);
  const sy = (y: number) => GH - PAD.b - ((y - y0) / (y1 - y0 || 1)) * (GH - PAD.t - PAD.b);
  const clampY = (y: number) => Math.max(PAD.t - 4, Math.min(GH - PAD.b + 4, sy(y)));
  const labelled = series.filter((s) => s.label);
  return (
    <figure className="mx-auto flex w-full max-w-2xl flex-col gap-1">
      {title && <p className="px-1 text-sm font-semibold">{title}</p>}
      <svg
        viewBox={`0 0 ${GW} ${GH}`}
        className="block w-full"
        role="img"
        aria-label={`Graph of ${yLabel} against ${xLabel}`}
      >
        {ticks(y0, y1).map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.l} x2={GW - PAD.r} y1={sy(t)} y2={sy(t)} stroke="var(--border)" />
            <text x={PAD.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={12} fill="var(--muted)">
              {tickText(t)}
            </text>
          </g>
        ))}
        {ticks(x0, x1).map((t) => (
          <g key={`x${t}`}>
            <line
              x1={sx(t)}
              x2={sx(t)}
              y1={PAD.t}
              y2={GH - PAD.b}
              stroke="var(--border)"
              opacity={0.5}
            />
            <text
              x={sx(t)}
              y={GH - PAD.b + 16}
              textAnchor="middle"
              fontSize={12}
              fill="var(--muted)"
            >
              {tickText(t)}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={GH - PAD.b} stroke="var(--fg)" />
        <line x1={PAD.l} x2={GW - PAD.r} y1={GH - PAD.b} y2={GH - PAD.b} stroke="var(--fg)" />
        {series.map((s, i) =>
          s.dots ? (
            <g key={i} fill={s.colour}>
              {s.points.map(([x, y], k) => (
                <circle key={k} cx={sx(x)} cy={clampY(y)} r={4} />
              ))}
            </g>
          ) : (
            <path
              key={i}
              d={s.points
                .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
                .map(([x, y], k) => `${k ? "L" : "M"}${sx(x).toFixed(1)} ${clampY(y).toFixed(1)}`)
                .join("")}
              fill="none"
              stroke={s.colour}
              strokeWidth={2.5}
              strokeDasharray={s.dashed ? "6 5" : undefined}
              strokeLinejoin="round"
            />
          ),
        )}
        {at && Number.isFinite(at.x) && Number.isFinite(at.y) && (
          <g>
            <line
              x1={sx(at.x)}
              x2={sx(at.x)}
              y1={clampY(at.y)}
              y2={GH - PAD.b}
              stroke={at.colour ?? "var(--primary)"}
              strokeDasharray="3 4"
            />
            <circle
              cx={sx(at.x)}
              cy={clampY(at.y)}
              r={7}
              fill={at.colour ?? "var(--primary)"}
              stroke="var(--surface)"
              strokeWidth={2.5}
            />
          </g>
        )}
        <text
          x={(PAD.l + GW - PAD.r) / 2}
          y={GH - 8}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill="var(--fg)"
        >
          {xLabel}
        </text>
        <text
          x={14}
          y={(PAD.t + GH - PAD.b) / 2}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill="var(--fg)"
          transform={`rotate(-90 14 ${(PAD.t + GH - PAD.b) / 2})`}
        >
          {yLabel}
        </text>
      </svg>
      {labelled.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted">
          {labelled.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-5"
                style={{ background: s.colour, opacity: s.dashed ? 0.7 : 1 }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
