"use client";

import { useMemo, useState } from "react";
import { fmt } from "@/visuals/mathTools";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import {
  applyMap,
  binarySearchSteps,
  callTree,
  cauchyRiemann,
  contourIntegral,
  countCalls,
  doublingTime,
  energyPyramid,
  exponentialGrowth,
  logisticGrowth,
  rainwaterLitres,
  sortSteps,
  windingNumber,
  type CallNode,
  type ComplexMap,
  type Pole,
  type SortAlgo,
} from "@/visuals/wave1/otherModels";

/** Step through bubble, insertion or selection sort, one comparison at a time. */
export function SortStepper({
  algorithm,
  values,
  caption,
}: {
  algorithm: SortAlgo;
  values: number[];
  caption: string;
}) {
  const [algo, setAlgo] = useState<SortAlgo>(algorithm);
  const steps = useMemo(() => sortSteps(algo, values), [algo, values]);
  const [i, setI] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  const max = Math.max(...values, 1);
  return (
    <WidgetShell
      title={`${algo[0].toUpperCase()}${algo.slice(1)} sort, step by step`}
      caption={caption}
      readouts={
        <>
          <Readout label="Step" value={`${Math.min(i, steps.length - 1) + 1} / ${steps.length}`} />
          <Readout label="What happens" value={step.note} />
        </>
      }
      controls={
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <WidgetButton onClick={() => setI((v) => Math.max(0, v - 1))}>◀ Back</WidgetButton>
          <WidgetButton onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))}>
            Next ▶
          </WidgetButton>
          <WidgetButton onClick={() => setI(steps.length - 1)}>Jump to end</WidgetButton>
          {(["bubble", "insertion", "selection"] as const).map((a) => (
            <WidgetButton
              key={a}
              onClick={() => {
                setAlgo(a);
                setI(0);
              }}
            >
              {a}
            </WidgetButton>
          ))}
        </div>
      }
    >
      <div
        className="flex h-48 items-end justify-center gap-1.5 p-3"
        role="img"
        aria-label={`Array: ${step.array.join(", ")}`}
      >
        {step.array.map((v, k) => {
          const comparing = step.compare?.includes(k);
          const done = k >= step.sortedFrom;
          return (
            <div key={k} className="flex w-9 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md ${comparing ? "bg-[#e1306c]" : done ? "bg-success" : "bg-primary"}`}
                style={{ height: `${(v / max) * 140}px` }}
              />
              <span className="font-mono text-xs">{v}</span>
            </div>
          );
        })}
      </div>
      <Legend
        items={[
          { color: "#e1306c", label: "being compared" },
          { color: "var(--success)", label: "in final place" },
        ]}
      />
    </WidgetShell>
  );
}

/** Binary search on a sorted array: the search range halves every step. */
export function BinarySearch({
  values,
  target: targetStart,
  caption,
}: {
  values: number[];
  target: number;
  caption: string;
}) {
  const sorted = useMemo(() => [...values].sort((a, b) => a - b), [values]);
  const [target, setTarget] = useState(targetStart);
  const steps = useMemo(() => binarySearchSteps(sorted, target), [sorted, target]);
  const [i, setI] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  return (
    <WidgetShell
      title="Binary search"
      caption={caption}
      readouts={
        <>
          <Readout label="Looking for" value={String(target)} />
          <Readout label="Step" value={`${Math.min(i, steps.length - 1) + 1} / ${steps.length}`} />
          <Readout label="Linear search would need up to" value={`${sorted.length} checks`} />
          <Readout
            label="Binary search needs at most"
            value={`${Math.ceil(Math.log2(sorted.length + 1))} checks`}
          />
        </>
      }
      controls={
        <>
          <Slider
            label="Target value"
            value={target}
            min={sorted[0]}
            max={sorted[sorted.length - 1]}
            step={1}
            unit=""
            onChange={(v) => {
              setTarget(v);
              setI(0);
            }}
          />
          <div className="flex gap-2">
            <WidgetButton onClick={() => setI((v) => Math.max(0, v - 1))}>◀ Back</WidgetButton>
            <WidgetButton onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))}>
              Next ▶
            </WidgetButton>
          </div>
        </>
      }
    >
      <div className="flex flex-wrap justify-center gap-1 p-3 font-mono text-sm">
        {sorted.map((v, k) => {
          const inRange = k >= step.low && k <= step.high;
          const isMid = k === step.mid;
          return (
            <div
              key={k}
              className={`flex w-10 flex-col items-center rounded-md border py-1 ${isMid ? (step.found ? "border-success bg-success/20" : "border-[#e1306c] bg-[#e1306c]/15") : inRange ? "border-primary" : "border-border opacity-40"}`}
            >
              <span className="text-[10px] text-muted">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          );
        })}
      </div>
      <p className="px-3 pb-3 text-sm" role="status">
        {step.note}
      </p>
    </WidgetShell>
  );
}

function TreeNode({ node, depth }: { node: CallNode; depth: number }) {
  return (
    <li className="flex flex-col items-center gap-1">
      <span
        className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap"
        title={`returns ${node.value}`}
      >
        {node.label}={node.value}
      </span>
      {node.children.length > 0 && depth < 6 && (
        <ul className="flex gap-1 border-t border-border pt-1">
          {node.children.map((c, i) => (
            <TreeNode key={i} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The recursion tree of factorial or Fibonacci: why naive Fibonacci makes so many calls. */
export function RecursionTree({
  fn: fnStart,
  n: nStart,
  caption,
}: {
  fn: "factorial" | "fibonacci";
  n: number;
  caption: string;
}) {
  const [fn, setFn] = useState(fnStart);
  const [n, setN] = useState(nStart);
  const tree = useMemo(() => callTree(fn, n), [fn, n]);
  return (
    <WidgetShell
      title={`Recursion tree: ${fn}(${n})`}
      caption={caption}
      readouts={
        <>
          <Readout label="Result" value={String(tree.value)} />
          <Readout label="Function calls" value={String(countCalls(tree))} />
          <Readout
            label="Base case"
            value={fn === "factorial" ? "fact(1) = 1" : "fib(0) = 0, fib(1) = 1"}
          />
        </>
      }
      controls={
        <>
          <Slider
            label="n"
            value={n}
            min={1}
            max={fn === "factorial" ? 8 : 6}
            step={1}
            unit=""
            onChange={setN}
          />
          <div className="flex gap-2">
            <WidgetButton
              onClick={() => {
                setFn("factorial");
                setN(Math.min(n, 8));
              }}
            >
              Factorial
            </WidgetButton>
            <WidgetButton
              onClick={() => {
                setFn("fibonacci");
                setN(Math.min(n, 6));
              }}
            >
              Fibonacci
            </WidgetButton>
          </div>
        </>
      }
    >
      <div className="overflow-x-auto p-3">
        <ul className="flex justify-center">
          <TreeNode node={tree} depth={0} />
        </ul>
      </div>
    </WidgetShell>
  );
}

/** The ecological pyramid of energy: only a fraction passes to each trophic level. */
export function EnergyPyramid({
  producerEnergy,
  efficiency: effStart,
  caption,
}: {
  producerEnergy: number;
  efficiency: number;
  caption: string;
}) {
  const [eff, setEff] = useState(effStart);
  const names = ["Producers", "Primary consumers", "Secondary consumers", "Tertiary consumers"];
  const levels = energyPyramid(producerEnergy, eff, 4);
  const colors = ["#10b981", "#84cc16", "#f59e0b", "#e1306c"];
  return (
    <WidgetShell
      title="Pyramid of energy"
      caption={caption}
      readouts={
        <>
          <Readout label="Transfer efficiency" value={`${Math.round(eff * 100)} %`} />
          <Readout label="Reaches top carnivores" value={`${fmt(levels[3])} kJ`} />
          <Readout
            label="Lost per step (heat, respiration)"
            value={`${Math.round((1 - eff) * 100)} %`}
          />
        </>
      }
      controls={
        <Slider
          label="Energy passed to the next level"
          value={eff}
          min={0.05}
          max={0.25}
          step={0.01}
          unit=""
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setEff}
        />
      }
    >
      <div
        className="flex flex-col-reverse items-center gap-1 p-3"
        role="img"
        aria-label={`Energy at each level: ${levels.map((l) => fmt(l)).join(", ")} kilojoules`}
      >
        {levels.map((e, i) => (
          <div
            key={i}
            className="flex h-9 items-center justify-center rounded-md px-2 text-xs font-semibold text-white"
            style={{
              width: `${Math.max(18, (Math.log10(e + 1) / Math.log10(producerEnergy + 1)) * 100)}%`,
              background: colors[i],
            }}
          >
            {names[i]}: {fmt(e)} kJ
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

/** Exponential against logistic population growth, with a carrying capacity. */
export function PopulationGrowth({
  initial,
  rate: rStart,
  capacity: kStart,
  caption,
}: {
  initial: number;
  rate: number;
  capacity: number;
  caption: string;
}) {
  const [r, setR] = useState(rStart);
  const [k, setK] = useState(kStart);
  const tMax = 40;
  const scale = makeGraphScale({ xMin: 0, xMax: tMax, yMin: 0, yMax: k * 1.6 });
  return (
    <WidgetShell
      title="Population growth"
      caption={caption}
      readouts={
        <>
          <Readout label="Growth rate r" value={`${fmt(r * 100)} % per year`} />
          <Readout label="Doubling time ln2/r" value={`${fmt(doublingTime(r))} years`} />
          <Readout label="Carrying capacity K" value={fmt(k)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Growth rate r"
            value={r}
            min={0.02}
            max={0.5}
            step={0.01}
            unit="/yr"
            onChange={setR}
          />
          <Slider
            label="Carrying capacity K"
            value={k}
            min={200}
            max={5000}
            step={100}
            unit=""
            onChange={setK}
          />
        </>
      }
    >
      <Graph scale={scale} label="Population against time">
        <Curve scale={scale} f={(t) => exponentialGrowth(initial, r, t)} color="#e1306c" />
        <Curve scale={scale} f={(t) => logisticGrowth(initial, r, k, t)} color="#10b981" />
        <line
          x1={scale.sx(0)}
          x2={scale.sx(tMax)}
          y1={scale.sy(k)}
          y2={scale.sy(k)}
          stroke="var(--muted)"
          strokeDasharray="5 4"
        />
      </Graph>
      <Legend
        items={[
          { color: "#e1306c", label: "exponential (J-curve)" },
          { color: "#10b981", label: "logistic (S-curve)" },
          { color: "var(--muted)", label: "carrying capacity K", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

/** How much rain a roof can collect in a year: V = area × rainfall × runoff coefficient. */
export function RainwaterHarvesting({
  areaM2: aStart,
  rainfallMm: rStart,
  runoff: cStart,
  caption,
}: {
  areaM2: number;
  rainfallMm: number;
  runoff: number;
  caption: string;
}) {
  const [area, setArea] = useState(aStart);
  const [rain, setRain] = useState(rStart);
  const [c, setC] = useState(cStart);
  const litres = rainwaterLitres(area, rain, c);
  const perDay = litres / 365;
  const people = perDay / 135; // 135 L per person per day (urban Indian norm)
  return (
    <WidgetShell
      title="Rainwater harvesting"
      caption={caption}
      readouts={
        <>
          <Readout label="Collected per year" value={`${fmt(litres)} L`} />
          <Readout label="Per day (average)" value={`${fmt(perDay)} L`} />
          <Readout label="Daily needs of" value={`${fmt(people)} people (135 L each)`} />
          <Readout label="V = A × R × C" value={`${area} × ${rain / 1000} × ${c}`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Roof / catchment area A"
            value={area}
            min={20}
            max={1000}
            step={10}
            unit="m²"
            onChange={setArea}
          />
          <Slider
            label="Annual rainfall R"
            value={rain}
            min={100}
            max={3000}
            step={50}
            unit="mm"
            onChange={setRain}
          />
          <Slider
            label="Runoff coefficient C"
            value={c}
            min={0.3}
            max={0.95}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setC}
          />
        </>
      }
    >
      <div
        className="flex items-end justify-center gap-6 p-4"
        role="img"
        aria-label={`${fmt(litres)} litres collected per year`}
      >
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-24 rounded-b-xl border-2 border-t-0 border-primary bg-primary/20"
            style={{ height: `${Math.min(160, 20 + litres / 1000)}px` }}
          />
          <span className="text-xs text-muted">{fmt(litres / 1000)} m³ a year</span>
        </div>
      </div>
    </WidgetShell>
  );
}

const MAPS: ComplexMap[] = ["z^2", "exp(z)", "1/z", "mobius", "sin(z)"];

/** A complex map w = f(z): a grid in the z-plane and its image, with the Cauchy–Riemann check. */
export function ComplexMapping({ map: mapStart, caption }: { map: ComplexMap; caption: string }) {
  const [map, setMap] = useState<ComplexMap>(mapStart);
  const [px, setPx] = useState(0.6);
  const [py, setPy] = useState(0.4);
  const z = makeGraphScale({ xMin: -2, xMax: 2, yMin: -1.2, yMax: 1.2 });
  const w = makeGraphScale({ xMin: -3, xMax: 3, yMin: -1.8, yMax: 1.8 });
  const grid: { pts: { re: number; im: number }[]; horizontal: boolean }[] = [];
  for (let k = -4; k <= 4; k++) {
    const c = k * 0.25;
    grid.push({
      pts: Array.from({ length: 81 }, (_, i) => ({ re: -1 + (2 * i) / 80, im: c })),
      horizontal: true,
    });
    grid.push({
      pts: Array.from({ length: 81 }, (_, i) => ({ re: c, im: -1 + (2 * i) / 80 })),
      horizontal: false,
    });
  }
  const line = (scale: typeof z, pts: { re: number; im: number }[]) =>
    pts
      .filter(
        (p) =>
          Number.isFinite(p.re) &&
          Number.isFinite(p.im) &&
          Math.abs(p.re) < 50 &&
          Math.abs(p.im) < 50,
      )
      .map((p) => `${scale.sx(p.re)},${scale.sy(p.im)}`)
      .join(" ");
  const cr = cauchyRiemann(map, { re: px, im: py });
  const image = applyMap(map, { re: px, im: py });
  return (
    <WidgetShell
      title={`Complex mapping w = ${map === "mobius" ? "(z − 1)/(z + 1)" : map}`}
      caption={caption}
      readouts={
        <>
          <Readout label="z" value={`${fmt(px)} + ${fmt(py)}i`} />
          <Readout label="w = f(z)" value={`${fmt(image.re)} + ${fmt(image.im)}i`} />
          <Readout label="uₓ = v_y ?" value={`${fmt(cr.ux)} = ${fmt(cr.vy)}`} />
          <Readout label="u_y = −vₓ ?" value={`${fmt(cr.uy)} = ${fmt(-cr.vx)}`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Point z: real part"
            value={px}
            min={-1}
            max={1}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setPx}
          />
          <Slider
            label="Point z: imaginary part"
            value={py}
            min={-1}
            max={1}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setPy}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {MAPS.map((m) => (
              <WidgetButton key={m} onClick={() => setMap(m)}>
                {m === "mobius" ? "Möbius" : m}
              </WidgetButton>
            ))}
          </div>
        </>
      }
    >
      <div className="grid gap-1 sm:grid-cols-2">
        <Graph scale={z} label="Grid in the z-plane">
          {grid.map((g, i) => (
            <polyline
              key={i}
              points={line(z, g.pts)}
              fill="none"
              stroke={g.horizontal ? "#3b82f6" : "#f59e0b"}
              strokeWidth={1.5}
            />
          ))}
          <circle cx={z.sx(px)} cy={z.sy(py)} r={6} fill="#e1306c" />
        </Graph>
        <Graph scale={w} label="Its image in the w-plane">
          {grid.map((g, i) => (
            <polyline
              key={i}
              points={line(
                w,
                g.pts.map((p) => applyMap(map, p)),
              )}
              fill="none"
              stroke={g.horizontal ? "#3b82f6" : "#f59e0b"}
              strokeWidth={1.5}
            />
          ))}
          {Number.isFinite(image.re) && (
            <circle cx={w.sx(image.re)} cy={w.sy(image.im)} r={6} fill="#e1306c" />
          )}
        </Graph>
      </div>
      <Legend
        items={[
          { color: "#3b82f6", label: "lines y = constant" },
          {
            color: "#f59e0b",
            label: "lines x = constant (images still cross at right angles: conformal)",
          },
        ]}
      />
    </WidgetShell>
  );
}

/** The residue theorem: move a circular contour and see which poles it encloses. */
export function ResidueContour({ poles, caption }: { poles: Pole[]; caption: string }) {
  const [cx, setCx] = useState(0);
  const [radius, setRadius] = useState(1.2);
  const scale = makeGraphScale({ xMin: -3, xMax: 3, yMin: -1.8, yMax: 1.8 });
  const integral = contourIntegral(cx, 0, radius, poles);
  const inside = poles.filter((p) => windingNumber(cx, 0, radius, p));
  return (
    <WidgetShell
      title="Residue theorem: ∮ f(z) dz = 2πi Σ Res"
      caption={caption}
      readouts={
        <>
          <Readout label="Poles inside" value={String(inside.length)} />
          <Readout
            label="Σ residues"
            value={`${fmt(inside.reduce((s, p) => s + p.residue.re, 0))} + ${fmt(inside.reduce((s, p) => s + p.residue.im, 0))}i`}
          />
          <Readout label="∮ f dz" value={`${fmt(integral.re)} + ${fmt(integral.im)}i`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Contour centre (real axis)"
            value={cx}
            min={-2}
            max={2}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setCx}
          />
          <Slider
            label="Contour radius"
            value={radius}
            min={0.2}
            max={2.5}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setRadius}
          />
        </>
      }
    >
      <Graph scale={scale} label={`Contour enclosing ${inside.length} poles`}>
        <circle
          cx={scale.sx(cx)}
          cy={scale.sy(0)}
          r={scale.sx(radius) - scale.sx(0)}
          fill="var(--primary)"
          fillOpacity={0.08}
          stroke="var(--primary)"
          strokeWidth={2.5}
        />
        {poles.map((p, i) => {
          const inn = windingNumber(cx, 0, radius, p) === 1;
          return (
            <g key={i}>
              <text
                x={scale.sx(p.re)}
                y={scale.sy(p.im) + 5}
                textAnchor="middle"
                fontSize="18"
                fontWeight="bold"
                fill={inn ? "#e1306c" : "var(--muted)"}
              >
                ×
              </text>
              <text
                x={scale.sx(p.re) + 10}
                y={scale.sy(p.im) - 8}
                fontSize="11"
                fill="var(--muted)"
              >
                Res {fmt(p.residue.re)}
              </text>
            </g>
          );
        })}
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "contour (anticlockwise)" },
          { color: "#e1306c", label: "poles inside count; poles outside don't" },
        ]}
      />
    </WidgetShell>
  );
}
