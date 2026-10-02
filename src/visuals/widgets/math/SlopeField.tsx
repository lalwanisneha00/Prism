"use client";

import { useMemo, useState } from "react";
import { parseFormula } from "@/visuals/expression";
import { fmt, solveOde } from "@/visuals/mathTools";
import { Readout, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Graph, makeGraphScale } from "@/visuals/widgets/math/Graph";

const colors = ["#f59e0b", "#e1306c", "#10b981", "#3b82f6"];

/** The direction field of dy/dx = f(x, y); tap a point to draw the solution through it. */
export function SlopeField({
  f,
  xRange,
  yRange,
  start,
  caption,
}: {
  f: string;
  xRange: [number, number];
  yRange: [number, number];
  start: [number, number];
  caption: string;
}) {
  const [starts, setStarts] = useState<[number, number][]>([start]);
  const formula = useMemo(() => parseFormula(f, ["x", "y"]), [f]);
  const slope = (x: number, y: number) => formula({ x, y });
  const scale = makeGraphScale({
    xMin: xRange[0],
    xMax: xRange[1],
    yMin: yRange[0],
    yMax: yRange[1],
  });

  const ticks = useMemo(() => {
    const list: { x: number; y: number; dx: number; dy: number }[] = [];
    const nx = 17;
    const ny = 11;
    // Draw each tick with the same on-screen length whatever the slope.
    const pxPerX = (scale.sx(xRange[1]) - scale.sx(xRange[0])) / (xRange[1] - xRange[0]);
    const pxPerY = (scale.sy(yRange[0]) - scale.sy(yRange[1])) / (yRange[1] - yRange[0]);
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const x = xRange[0] + ((i + 0.5) * (xRange[1] - xRange[0])) / nx;
        const y = yRange[0] + ((j + 0.5) * (yRange[1] - yRange[0])) / ny;
        const m = formula({ x, y });
        if (!Number.isFinite(m)) continue;
        const dxPx = pxPerX;
        const dyPx = m * pxPerY;
        const norm = Math.hypot(dxPx, dyPx);
        list.push({ x, y, dx: (dxPx / norm) * 11, dy: (dyPx / norm) * 11 });
      }
    }
    return list;
  }, [formula, xRange, yRange, scale]);

  const solutions = starts.map(([x0, y0]) => {
    const forward = solveOde(slope, x0, y0, xRange[1], 300);
    const backward = solveOde(slope, x0, y0, xRange[0], 300).reverse();
    const inView = (p: { y: number }) => p.y > yRange[0] - 50 && p.y < yRange[1] + 50;
    return [...backward, ...forward].filter(inView);
  });
  const latest = starts[starts.length - 1];

  return (
    <WidgetShell
      title={`Slope field of dy/dx = ${f}`}
      caption={caption}
      readouts={
        <>
          <Readout label="Start point" value={`(${fmt(latest[0], 2)}, ${fmt(latest[1], 2)})`} />
          <Readout label="Slope there" value={fmt(slope(...latest))} />
          <Readout label="Curves drawn" value={String(starts.length)} />
        </>
      }
      controls={
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <span className="text-sm text-muted">Tap the field to start a solution curve there.</span>
          <WidgetButton onClick={() => setStarts([start])}>Reset</WidgetButton>
        </div>
      }
    >
      <Graph
        scale={scale}
        label={`Direction field of dy/dx = ${f} with ${starts.length} solution curves`}
        onPoint={(x, y) => setStarts((s) => [...s.slice(-3), [x, y]])}
      >
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={scale.sx(t.x) - t.dx}
            y1={scale.sy(t.y) + t.dy}
            x2={scale.sx(t.x) + t.dx}
            y2={scale.sy(t.y) - t.dy}
            stroke="var(--muted)"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        ))}
        {solutions.map((pts, i) => (
          <polyline
            key={i}
            points={pts
              .map((p) => `${scale.sx(p.x).toFixed(1)},${scale.sy(p.y).toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={3}
          />
        ))}
        {starts.map(([x, y], i) => (
          <circle
            key={i}
            cx={scale.sx(x)}
            cy={scale.sy(y)}
            r={5}
            fill={colors[i % colors.length]}
          />
        ))}
      </Graph>
    </WidgetShell>
  );
}
