"use client";

import { useState } from "react";
import { eigen2x2, fmt } from "@/visuals/mathTools";
import { ArrowMarker, Readout, Slider, WidgetShell } from "@/visuals/ui";
import { equalAspectBounds, Graph, makeGraphScale } from "@/visuals/widgets/math/Graph";

/** What a 2×2 matrix does to the plane: the unit square, the grid, and the eigenvectors. */
export function MatrixTransform({
  a: a0,
  b: b0,
  c: c0,
  d: d0,
  caption,
}: {
  a: number;
  b: number;
  c: number;
  d: number;
  caption: string;
}) {
  const [m, setM] = useState({ a: a0, b: b0, c: c0, d: d0 });
  const { a, b, c, d } = m;
  const apply = (x: number, y: number): [number, number] => [a * x + b * y, c * x + d * y];
  const det = a * d - b * c;
  const eigen = eigen2x2(a, b, c, d);
  const scale = makeGraphScale(equalAspectBounds(3.6));
  const pt = ([x, y]: [number, number]) => `${scale.sx(x).toFixed(1)},${scale.sy(y).toFixed(1)}`;

  const gridLines: [number, number][][] = [];
  for (let k = -3; k <= 3; k++) {
    gridLines.push([apply(k, -3), apply(k, 3)], [apply(-3, k), apply(3, k)]);
  }
  const square = [apply(0, 0), apply(1, 0), apply(1, 1), apply(0, 1)];

  const set = (key: keyof typeof m) => (v: number) => setM((prev) => ({ ...prev, [key]: v }));

  return (
    <WidgetShell
      title="Matrix as a transformation"
      caption={caption}
      readouts={
        <>
          <Readout label="det A (area scale)" value={fmt(det)} />
          <Readout label="trace A" value={fmt(a + d)} />
          <Readout
            label="Eigenvalues λ"
            value={
              eigen.kind === "real"
                ? `${fmt(eigen.values[0])}, ${fmt(eigen.values[1])}`
                : `${fmt(eigen.re)} ± ${fmt(eigen.im)}i`
            }
          />
          <Readout label="Invertible?" value={Math.abs(det) < 1e-9 ? "no (det = 0)" : "yes"} />
        </>
      }
      controls={
        <>
          <Slider
            label="a (top left)"
            value={a}
            min={-3}
            max={3}
            step={0.1}
            unit=""
            onChange={set("a")}
            format={fmt}
          />
          <Slider
            label="b (top right)"
            value={b}
            min={-3}
            max={3}
            step={0.1}
            unit=""
            onChange={set("b")}
            format={fmt}
          />
          <Slider
            label="c (bottom left)"
            value={c}
            min={-3}
            max={3}
            step={0.1}
            unit=""
            onChange={set("c")}
            format={fmt}
          />
          <Slider
            label="d (bottom right)"
            value={d}
            min={-3}
            max={3}
            step={0.1}
            unit=""
            onChange={set("d")}
            format={fmt}
          />
        </>
      }
    >
      <Graph
        scale={scale}
        label={`The matrix [[${fmt(a)}, ${fmt(b)}], [${fmt(c)}, ${fmt(d)}]] with determinant ${fmt(det)}`}
      >
        <defs>
          <ArrowMarker id="mt-i" color="#e1306c" />
          <ArrowMarker id="mt-j" color="#3b82f6" />
          <ArrowMarker id="mt-e" color="#10b981" />
        </defs>
        {gridLines.map(([p, q], i) => (
          <line
            key={i}
            x1={scale.sx(p[0])}
            y1={scale.sy(p[1])}
            x2={scale.sx(q[0])}
            y2={scale.sy(q[1])}
            stroke="var(--primary)"
            strokeOpacity={0.25}
          />
        ))}
        <polygon
          points={square.map(pt).join(" ")}
          fill="var(--primary)"
          fillOpacity={0.25}
          stroke="var(--primary)"
          strokeWidth={2}
        />
        {eigen.kind === "real" &&
          eigen.vectors?.map((v, i) => (
            <line
              key={i}
              x1={scale.sx(-6 * v[0])}
              y1={scale.sy(-6 * v[1])}
              x2={scale.sx(6 * v[0])}
              y2={scale.sy(6 * v[1])}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="6 5"
            />
          ))}
        <line
          x1={scale.sx(0)}
          y1={scale.sy(0)}
          x2={scale.sx(a)}
          y2={scale.sy(c)}
          stroke="#e1306c"
          strokeWidth={3}
          markerEnd="url(#mt-i)"
        />
        <line
          x1={scale.sx(0)}
          y1={scale.sy(0)}
          x2={scale.sx(b)}
          y2={scale.sy(d)}
          stroke="#3b82f6"
          strokeWidth={3}
          markerEnd="url(#mt-j)"
        />
      </Graph>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-2 text-xs text-muted">
        <li>
          <span style={{ color: "#e1306c" }}>━</span> A·î = first column ({fmt(a)}, {fmt(c)})
        </li>
        <li>
          <span style={{ color: "#3b82f6" }}>━</span> A·ĵ = second column ({fmt(b)}, {fmt(d)})
        </li>
        <li>
          <span style={{ color: "#10b981" }}>┅</span>{" "}
          {eigen.kind === "real"
            ? "eigenvector lines (only stretched, never turned)"
            : "no real eigenvectors: A rotates every direction"}
        </li>
      </ul>
    </WidgetShell>
  );
}
