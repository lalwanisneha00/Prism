"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { fitRange, fmt } from "@/visuals/mathTools";
import { DataNote, GenericFrame } from "@/visuals/generic/Frame";
import type { StatsSpec } from "@/visuals/generic/specs";
import {
  histogram,
  linearRegression,
  meanAndSd,
  normalCdf,
  normalPdf,
  sampleMeans,
  seededRandom,
  type Population,
} from "@/visuals/generic/statsMath";
import { Readout, Slider, WidgetButton } from "@/visuals/ui";
import { Curve, GH, Graph, GW, makeGraphScale } from "@/visuals/widgets/math/Graph";

/** Statistics explorers (SPEC §4.1 item 10): normal curve, sampling demo, regression. */
export function StatsExplorer({ spec }: { spec: StatsSpec }) {
  if (spec.tool === "normal") return <NormalExplorer spec={spec} />;
  if (spec.tool === "sampling") return <SamplingDemo spec={spec} />;
  return <RegressionExplorer spec={spec} />;
}

function NormalExplorer({ spec }: { spec: StatsSpec }) {
  const [mean, setMean] = useState(spec.mean ?? 0);
  const [sd, setSd] = useState(spec.sd ?? 1);
  const m0 = spec.mean ?? 0;
  const s0 = spec.sd ?? 1;
  const from = spec.shadeFrom ?? mean - sd;
  const to = spec.shadeTo ?? mean + sd;
  // ±4.5σ of the starting curve: room for the widest curve the σ slider allows.
  const xMin = m0 - 4.5 * s0;
  const xMax = m0 + 4.5 * s0;
  const peak = normalPdf(0, 0, (s0 * 0.5) / 1);
  const scale = makeGraphScale({ xMin, xMax, yMin: 0, yMax: Number((peak * 1.1).toPrecision(3)) });
  const probability = normalCdf(to, mean, sd) - normalCdf(from, mean, sd);
  const pdf = (x: number) => normalPdf(x, mean, sd);
  const area = Array.from({ length: 61 }, (_, i) => {
    const x = from + ((to - from) * i) / 60;
    return `${scale.sx(x)},${scale.sy(pdf(x))}`;
  });

  return (
    <GenericFrame
      icon="🔔"
      title="Normal distribution"
      caption={spec.caption}
      interactive
      note={<DataNote data={spec.data} sourceId={spec.sourceId} />}
      controls={
        <>
          <Slider
            label="Mean μ"
            value={mean}
            min={m0 - 3 * s0}
            max={m0 + 3 * s0}
            step={Number((s0 / 10).toPrecision(2))}
            unit=""
            format={fmt}
            onChange={setMean}
          />
          <Slider
            label="Standard deviation σ"
            value={sd}
            min={Number((s0 / 2).toPrecision(2))}
            max={Number((s0 * 2).toPrecision(2))}
            step={Number((s0 / 20).toPrecision(2))}
            unit=""
            format={fmt}
            onChange={setSd}
          />
        </>
      }
    >
      <Graph
        scale={scale}
        label={`Normal curve with mean ${fmt(mean)} and standard deviation ${fmt(sd)}`}
      >
        <path
          d={`M${scale.sx(from)},${scale.sy(0)} L${area.join(" L")} L${scale.sx(to)},${scale.sy(0)} Z`}
          fill="var(--primary)"
          fillOpacity={0.25}
        />
        <Curve scale={scale} f={pdf} />
      </Graph>
      <dl className="grid grid-cols-2 gap-2 p-3 text-sm sm:grid-cols-3">
        <Readout
          label={`P(${fmt(from)} < X < ${fmt(to)})`}
          value={`${(probability * 100).toFixed(1)}%`}
        />
        <Readout label="μ ± σ holds" value="68.3%" />
        <Readout label="μ ± 2σ holds" value="95.4%" />
      </dl>
    </GenericFrame>
  );
}

const populationLabel: Record<Population, string> = {
  uniform: "flat (uniform)",
  skewed: "skewed (long right tail)",
  normal: "bell-shaped",
};

function SamplingDemo({ spec }: { spec: StatsSpec }) {
  const [population, setPopulation] = useState<Population>(spec.population ?? "skewed");
  const [n, setN] = useState(spec.sampleSize ?? 5);
  const [seed, setSeed] = useState(7);
  const means = useMemo(
    () => sampleMeans(population, n, 500, seededRandom(seed)),
    [population, n, seed],
  );
  const counts = histogram(means, 0, 10, 40);
  const { mean, sd } = meanAndSd(means);
  const maxCount = Math.max(...counts, 1);
  const scale = makeGraphScale({ xMin: 0, xMax: 10, yMin: 0, yMax: Math.ceil(maxCount * 1.15) });

  return (
    <GenericFrame
      icon="🎲"
      title="Sampling: the central limit theorem"
      caption={spec.caption}
      interactive
      note={<DataNote data="computed" />}
      controls={
        <>
          <Slider
            label="Sample size n"
            value={n}
            min={1}
            max={50}
            step={1}
            unit=""
            onChange={setN}
          />
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(populationLabel) as Population[]).map((p) => (
              <WidgetButton key={p} onClick={() => setPopulation(p)}>
                {p === population ? `● ${p}` : p}
              </WidgetButton>
            ))}
            <WidgetButton onClick={() => setSeed((s) => s + 1)}>Draw again</WidgetButton>
          </div>
        </>
      }
    >
      <Graph scale={scale} label={`Histogram of 500 sample means, sample size ${n}`}>
        {counts.map((c, i) => (
          <rect
            key={i}
            x={scale.sx(i / 4)}
            y={scale.sy(c)}
            width={Math.max(0, scale.sx((i + 1) / 4) - scale.sx(i / 4) - 1)}
            height={Math.max(0, scale.sy(0) - scale.sy(c))}
            fill="var(--primary)"
            fillOpacity={0.7}
          />
        ))}
      </Graph>
      <dl className="grid grid-cols-2 gap-2 p-3 text-sm sm:grid-cols-3">
        <Readout label="Population" value={populationLabel[population]} />
        <Readout label="Mean of the means" value={fmt(mean, 3)} />
        <Readout label="Spread (SD) of the means" value={fmt(sd, 3)} />
      </dl>
    </GenericFrame>
  );
}

function RegressionExplorer({ spec }: { spec: StatsSpec }) {
  const [points, setPoints] = useState(spec.points ?? []);
  const dragging = useRef<number | null>(null);
  const [x0, x1] = fitRange(
    (spec.points ?? []).map((p) => p.x),
    0.25,
  );
  const [y0, y1] = fitRange(
    (spec.points ?? []).map((p) => p.y),
    0.25,
  );
  const scale = makeGraphScale({ xMin: x0, xMax: x1, yMin: y0, yMax: y1 });
  const fit = linearRegression(points);

  function toGraph(e: PointerEvent<SVGElement>) {
    const svg = e.currentTarget.ownerSVGElement ?? (e.currentTarget as SVGSVGElement);
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * GW;
    const py = ((e.clientY - rect.top) / rect.height) * GH;
    // Invert the scale using two known points.
    const x = x0 + ((px - scale.sx(x0)) / (scale.sx(x1) - scale.sx(x0))) * (x1 - x0);
    const y = y0 + ((py - scale.sy(y0)) / (scale.sy(y1) - scale.sy(y0))) * (y1 - y0);
    return { x: Math.min(x1, Math.max(x0, x)), y: Math.min(y1, Math.max(y0, y)) };
  }

  return (
    <GenericFrame
      icon="📉"
      title="Line of best fit"
      caption={spec.caption}
      interactive
      note={<DataNote data={spec.data} sourceId={spec.sourceId} />}
    >
      <Graph
        scale={scale}
        label={`Scatter of ${spec.yLabel} against ${spec.xLabel} with the least-squares line`}
      >
        <Curve scale={scale} f={(x) => fit.slope * x + fit.intercept} color="#f59e0b" width={2.5} />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={scale.sx(p.x)}
            cy={scale.sy(p.y)}
            r={9}
            fill="var(--primary)"
            stroke="var(--surface)"
            strokeWidth={2}
            className="cursor-grab touch-none"
            tabIndex={0}
            role="slider"
            aria-label={`Point ${i + 1}: ${fmt(p.x)}, ${fmt(p.y)}. Arrow keys move it.`}
            aria-valuenow={p.y}
            onPointerDown={(e) => {
              dragging.current = i;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (dragging.current !== i) return;
              const next = toGraph(e);
              setPoints((ps) => ps.map((q, j) => (j === i ? next : q)));
            }}
            onPointerUp={() => (dragging.current = null)}
            onKeyDown={(e) => {
              const dy = (y1 - y0) / 40;
              const dx = (x1 - x0) / 40;
              const move = {
                ArrowUp: [0, dy],
                ArrowDown: [0, -dy],
                ArrowLeft: [-dx, 0],
                ArrowRight: [dx, 0],
              }[e.key];
              if (!move) return;
              e.preventDefault();
              setPoints((ps) =>
                ps.map((q, j) => (j === i ? { x: q.x + move[0], y: q.y + move[1] } : q)),
              );
            }}
          />
        ))}
      </Graph>
      <dl className="grid grid-cols-2 gap-2 p-3 text-sm sm:grid-cols-3">
        <Readout
          label="Best-fit line"
          value={`y = ${fmt(fit.slope)}x ${fit.intercept < 0 ? "−" : "+"} ${fmt(Math.abs(fit.intercept))}`}
        />
        <Readout label="Correlation r" value={fmt(fit.r, 3)} />
        <Readout label="Axes" value={`${spec.xLabel} → ${spec.yLabel}`} />
      </dl>
      <p className="px-3 pb-2 text-xs text-muted">
        Drag a point (or focus it and use the arrow keys) and watch the line refit.
      </p>
    </GenericFrame>
  );
}
