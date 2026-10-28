"use client";

import { useEffect, useRef, useState } from "react";
import { siFormat } from "@/visuals/physics";
import {
  channelValue,
  equivalenceVolume,
  flowMeterReading,
  G,
  heatExchanger,
  lissajousRatio,
  pendulumPeriod,
  springPeriod,
  thinLensImage,
  titrationPH,
} from "@/visuals/labs/labModels";
import { Choice } from "@/visuals/wave2/ui2";
import { ArrowMarker, Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";

/*
 * Lab simulation templates (syllabus fix, Phase 7B). Each one is a reusable experiment with
 * adjustable values; the AI only picks a template and its starting values. Maths: labModels.ts.
 */

const W = 640;
const fmt = (v: number, digits = 3) => String(Number(v.toPrecision(digits)));

/** A polyline path through points already in SVG units. */
const pathOf = (pts: readonly (readonly [number, number])[]) =>
  pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Runs `tick(dt)` every frame while `playing`. */
function useFrames(playing: boolean, tick: (dt: number) => void) {
  const ref = useRef(tick);
  useEffect(() => {
    ref.current = tick;
  });
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last: number | null = null;
    const loop = (t: number) => {
      const dt = last === null ? 0 : Math.min(0.05, (t - last) / 1000);
      last = t;
      ref.current(dt);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
}

/* ---------- Thin lens / mirror ray diagram ---------- */

export function ThinLens({
  kind,
  focalCm,
  objectCm,
  caption,
}: {
  kind: "convex-lens" | "concave-lens" | "concave-mirror" | "convex-mirror";
  focalCm: number;
  objectCm: number;
  caption: string;
}) {
  const [u, setU] = useState(objectCm);
  const [f0, setF] = useState(focalCm);
  const mirror = kind.endsWith("mirror");
  const converging = kind === "convex-lens" || kind === "concave-mirror";
  const f = converging ? f0 : -f0;
  const img = thinLensImage(u, f);
  const H = 300;
  const cx = W / 2;
  const cy = H / 2;
  const px = 4; // pixels per cm (view ±80 cm)
  const objH = 40;
  // Lens: object on the left, real image on the right. Mirror: both in front (left).
  const objX = cx - u * px;
  const imgSide = mirror ? -1 : 1;
  const imgX = cx + imgSide * img.v * px;
  const imgH = objH * img.magnification;
  const clampX = (x: number) => Math.max(-40, Math.min(W + 40, x));
  // A lens has a focus on each side; a mirror's is in front (concave) or behind (convex).
  const focusX = mirror ? [cx - f * px] : [cx - f0 * px, cx + f0 * px];
  // Two principal rays from the object's tip.
  const tip = { x: objX, y: cy - objH };
  const rays: string[] = [];
  if (!img.atInfinity) {
    const iy = cy - imgH;
    // Ray 1: parallel to the axis, then through (or away from) the focus to the image tip.
    rays.push(`M${tip.x},${tip.y} L${cx},${tip.y} L${clampX(imgX)},${iy}`);
    // Ray 2: through the centre (pole), straight on (lens) or reflected (mirror).
    rays.push(`M${tip.x},${tip.y} L${cx},${cy} L${clampX(imgX)},${iy}`);
  }
  const kindLabel = {
    "convex-lens": "Convex (converging) lens",
    "concave-lens": "Concave (diverging) lens",
    "concave-mirror": "Concave mirror",
    "convex-mirror": "Convex mirror",
  }[kind];
  return (
    <WidgetShell
      title={kindLabel}
      caption={caption}
      readouts={
        <>
          <Readout label="Object distance u" value={`${u} cm`} />
          <Readout
            label="Image distance v"
            value={img.atInfinity ? "at infinity" : `${fmt(img.v)} cm`}
          />
          <Readout
            label="Magnification m"
            value={img.atInfinity ? "none" : fmt(img.magnification)}
          />
          <Readout
            label="Image"
            value={
              img.atInfinity
                ? "no image"
                : `${img.real ? "real" : "virtual"}, ${img.upright ? "upright" : "inverted"}`
            }
          />
        </>
      }
      controls={
        <>
          <Slider
            label="Object distance u"
            value={u}
            min={2}
            max={75}
            step={1}
            unit="cm"
            onChange={setU}
          />
          <Slider
            label="Focal length |f|"
            value={f0}
            min={5}
            max={40}
            step={1}
            unit="cm"
            onChange={setF}
          />
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`${kindLabel}: object at ${u} cm, image ${img.atInfinity ? "at infinity" : `at ${fmt(img.v)} cm`}`}
      >
        <defs>
          <ArrowMarker id="tl-arrow" color="currentColor" size={10} />
        </defs>
        <line x1={0} y1={cy} x2={W} y2={cy} stroke="var(--border)" />
        {/* The lens or mirror */}
        <line x1={cx} y1={30} x2={cx} y2={H - 30} stroke="#0ea5e9" strokeWidth={mirror ? 5 : 3} />
        {focusX.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={cy} r={3.5} fill="var(--muted)" />
            <text x={x} y={cy + 18} textAnchor="middle" fontSize={12} fill="var(--muted)">
              F
            </text>
          </g>
        ))}
        {/* Object */}
        <g className="text-[var(--fg)]" color="var(--fg)">
          <line
            x1={objX}
            y1={cy}
            x2={objX}
            y2={cy - objH}
            stroke="currentColor"
            strokeWidth={3}
            markerEnd="url(#tl-arrow)"
          />
        </g>
        {rays.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#f59e0b" strokeWidth={1.6} />
        ))}
        {!img.atInfinity && Math.abs(imgX - cx) < W && (
          <g color="#e1306c">
            <line
              x1={imgX}
              y1={cy}
              x2={imgX}
              y2={cy - Math.max(-130, Math.min(130, imgH))}
              stroke="#e1306c"
              strokeWidth={3}
              strokeDasharray={img.real ? undefined : "5 4"}
              markerEnd="url(#tl-arrow)"
            />
          </g>
        )}
      </svg>
    </WidgetShell>
  );
}

/* ---------- Simple pendulum or mass on a spring ---------- */

export function Oscillation({
  system,
  lengthCm,
  massKg,
  springK,
  amplitudeDeg,
  caption,
}: {
  system: "pendulum" | "spring";
  lengthCm: number;
  massKg: number;
  springK: number;
  amplitudeDeg: number;
  caption: string;
}) {
  const [length, setLength] = useState(lengthCm);
  const [mass, setMass] = useState(massKg);
  const [k, setK] = useState(springK);
  const [amp, setAmp] = useState(amplitudeDeg);
  const [g, setG] = useState(G);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timer, setTimer] = useState<{ start: number } | null>(null);
  const period =
    system === "pendulum" ? pendulumPeriod(length / 100, g, amp) : springPeriod(mass, k);
  useFrames(playing, (dt) => setT((x) => x + dt));
  const phase = Math.cos((2 * Math.PI * t) / period);
  const H = 300;
  const top = { x: W / 2, y: 24 };
  // The student "times 10 swings" like in the lab: the stopwatch counts whole periods.
  const laps = timer ? Math.floor((t - timer.start) / period) : 0;
  return (
    <WidgetShell
      title={system === "pendulum" ? "Simple pendulum" : "Mass on a spring"}
      caption={caption}
      readouts={
        <>
          <Readout label="Period T" value={`${fmt(period)} s`} />
          <Readout
            label={system === "pendulum" ? "T² / L" : "T² / m"}
            value={
              system === "pendulum"
                ? `${fmt(period ** 2 / (length / 100))} s²/m`
                : `${fmt(period ** 2 / mass)} s²/kg`
            }
          />
          <Readout label="Stopwatch" value={timer ? `${fmt(t - timer.start, 3)} s` : "stopped"} />
          <Readout label="Full swings counted" value={String(laps)} />
        </>
      }
      controls={
        <>
          {system === "pendulum" ? (
            <>
              <Slider
                label="Length L"
                value={length}
                min={20}
                max={200}
                step={5}
                unit="cm"
                onChange={setLength}
              />
              <Slider
                label="Amplitude"
                value={amp}
                min={2}
                max={60}
                step={1}
                unit="°"
                onChange={setAmp}
              />
              <Slider
                label="Gravity g"
                value={g}
                min={1.6}
                max={24.8}
                step={0.01}
                unit="m/s²"
                onChange={setG}
              />
            </>
          ) : (
            <>
              <Slider
                label="Mass m"
                value={mass}
                min={0.05}
                max={2}
                step={0.05}
                unit="kg"
                onChange={setMass}
              />
              <Slider
                label="Spring constant k"
                value={k}
                min={2}
                max={200}
                step={1}
                unit="N/m"
                onChange={setK}
              />
            </>
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Start swinging"}
            </WidgetButton>
            <WidgetButton
              onClick={() => {
                setPlaying(true);
                setTimer(timer ? null : { start: t });
              }}
            >
              {timer ? "Stop the stopwatch" : "Start the stopwatch"}
            </WidgetButton>
          </div>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`${system}: period ${fmt(period)} seconds`}
      >
        <line
          x1={W / 2 - 80}
          y1={top.y}
          x2={W / 2 + 80}
          y2={top.y}
          stroke="var(--muted)"
          strokeWidth={4}
        />
        {system === "pendulum"
          ? (() => {
              const theta = ((amp * Math.PI) / 180) * phase;
              const r = 40 + (length / 200) * 210;
              const bob = { x: top.x + r * Math.sin(theta), y: top.y + r * Math.cos(theta) };
              return (
                <>
                  <line
                    x1={top.x}
                    y1={top.y}
                    x2={top.x}
                    y2={top.y + r + 14}
                    stroke="var(--border)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={top.x}
                    y1={top.y}
                    x2={bob.x}
                    y2={bob.y}
                    stroke="var(--fg)"
                    strokeWidth={2}
                  />
                  <circle cx={bob.x} cy={bob.y} r={14} fill="#0ea5e9" />
                </>
              );
            })()
          : (() => {
              const rest = 160;
              const y = top.y + rest + 50 * phase;
              const coils = 12;
              const pts: [number, number][] = [[top.x, top.y]];
              for (let i = 1; i < coils * 2; i++)
                pts.push([
                  top.x + (i % 2 ? 16 : -16),
                  top.y + ((y - 22 - top.y) * i) / (coils * 2),
                ]);
              pts.push([top.x, y - 22]);
              return (
                <>
                  <path d={pathOf(pts)} fill="none" stroke="var(--fg)" strokeWidth={2} />
                  <rect x={top.x - 26} y={y - 22} width={52} height={44} rx={6} fill="#0ea5e9" />
                  <line
                    x1={top.x + 60}
                    y1={top.y + rest}
                    x2={top.x + 110}
                    y2={top.y + rest}
                    stroke="var(--border)"
                    strokeDasharray="4 4"
                  />
                  <text x={top.x + 116} y={top.y + rest + 4} fontSize={12} fill="var(--muted)">
                    rest
                  </text>
                </>
              );
            })()}
      </svg>
    </WidgetShell>
  );
}

/* ---------- Acid-base titration ---------- */

const INDICATORS = {
  phenolphthalein: { low: 8.2, high: 10, from: "#ffffff", to: "#e879f9", name: "Phenolphthalein" },
  "methyl-orange": { low: 3.1, high: 4.4, from: "#ef4444", to: "#facc15", name: "Methyl orange" },
} as const;

export function Titration({
  acid,
  acidConc,
  acidVolume,
  baseConc,
  indicator,
  caption,
}: {
  acid: "strong" | "weak";
  acidConc: number;
  acidVolume: number;
  baseConc: number;
  indicator: keyof typeof INDICATORS;
  caption: string;
}) {
  const [kind, setKind] = useState(acid);
  const [conc, setConc] = useState(acidConc);
  const [base, setBase] = useState(baseConc);
  const [ind, setInd] = useState(indicator);
  const t = { acidConc: conc, acidVolume, baseConc: base, pKa: kind === "strong" ? -6 : 4.76 };
  const eq = equivalenceVolume(t);
  const maxV = Math.min(100, Math.ceil(eq * 2));
  const [added, setAdded] = useState(Math.round(eq * 0.5));
  const ph = titrationPH(t, Math.min(added, maxV));
  const indi = INDICATORS[ind];
  const colourOn =
    ph >= indi.high ? 1 : ph <= indi.low ? 0 : (ph - indi.low) / (indi.high - indi.low);
  const H = 260;
  const gx = 230;
  const gw = W - gx - 20;
  const px = (v: number) => gx + (v / maxV) * gw;
  const py = (p: number) => 20 + ((14 - p) / 14) * (H - 50);
  const curve = Array.from({ length: 161 }, (_, i) => {
    const v = (i * maxV) / 160;
    return [px(v), py(titrationPH(t, v))] as const;
  });
  return (
    <WidgetShell
      title="Acid-base titration"
      caption={caption}
      readouts={
        <>
          <Readout label="Base added" value={`${added} mL`} />
          <Readout label="pH" value={fmt(ph, 3)} />
          <Readout label="Equivalence point" value={`${fmt(eq)} mL`} />
          <Readout label="Indicator" value={colourOn > 0.5 ? "changed colour" : "not yet"} />
        </>
      }
      controls={
        <>
          <Slider
            label="NaOH added from the burette"
            value={added}
            min={0}
            max={maxV}
            step={0.5}
            unit="mL"
            onChange={setAdded}
          />
          <Slider
            label="Acid concentration"
            value={conc}
            min={0.02}
            max={0.5}
            step={0.01}
            unit="M"
            onChange={setConc}
          />
          <Slider
            label="NaOH concentration"
            value={base}
            min={0.02}
            max={0.5}
            step={0.01}
            unit="M"
            onChange={setBase}
          />
          <Choice
            options={["strong", "weak"] as const}
            value={kind}
            onChange={setKind}
            labels={{ strong: "Strong acid (HCl)", weak: "Weak acid (CH₃COOH)" }}
          />
          <Choice
            options={["phenolphthalein", "methyl-orange"] as const}
            value={ind}
            onChange={setInd}
            labels={{ phenolphthalein: "Phenolphthalein", "methyl-orange": "Methyl orange" }}
          />
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Titration: pH ${fmt(ph, 3)} after ${added} mL of base`}
      >
        {/* Burette and flask */}
        <rect x={90} y={10} width={18} height={120} fill="var(--surface-2)" stroke="var(--muted)" />
        <rect
          x={91}
          y={10 + (Math.min(added, maxV) / maxV) * 118}
          width={16}
          height={120 - (Math.min(added, maxV) / maxV) * 118}
          fill="#93c5fd"
        />
        <path
          d="M78,150 L120,150 L120,180 L170,245 L28,245 L78,180 Z"
          fill={colourOn > 0.02 ? indi.to : indi.from}
          fillOpacity={0.25 + 0.6 * colourOn}
          stroke="var(--muted)"
        />
        <text x={99} y={258} textAnchor="middle" fontSize={11} fill="var(--muted)">
          {indi.name}
        </text>
        {/* pH curve */}
        <rect x={gx} y={20} width={gw} height={H - 50} fill="none" stroke="var(--border)" />
        <line
          x1={gx}
          y1={py(7)}
          x2={gx + gw}
          y2={py(7)}
          stroke="var(--border)"
          strokeDasharray="4 4"
        />
        <rect
          x={gx}
          y={py(indi.high)}
          width={gw}
          height={py(indi.low) - py(indi.high)}
          fill={indi.to}
          opacity={0.15}
        />
        <path d={pathOf(curve)} fill="none" stroke="var(--primary)" strokeWidth={2.5} />
        <line
          x1={px(eq)}
          y1={20}
          x2={px(eq)}
          y2={H - 30}
          stroke="var(--muted)"
          strokeDasharray="3 3"
        />
        <circle cx={px(Math.min(added, maxV))} cy={py(ph)} r={5} fill="#e1306c" />
        <text x={gx + 4} y={14} fontSize={12} fill="var(--muted)">
          pH (0 to 14) against NaOH added (0 to {maxV} mL)
        </text>
      </svg>
    </WidgetShell>
  );
}

/* ---------- Double-pipe heat exchanger ---------- */

export function HeatExchanger({
  flow,
  hotIn,
  coldIn,
  hotRate,
  coldRate,
  ua,
  caption,
}: {
  flow: "parallel" | "counter";
  hotIn: number;
  coldIn: number;
  hotRate: number;
  coldRate: number;
  ua: number;
  caption: string;
}) {
  const [mode, setMode] = useState(flow);
  const [th, setTh] = useState(hotIn);
  const [tc, setTc] = useState(coldIn);
  const [ch, setCh] = useState(hotRate);
  const [cc, setCc] = useState(coldRate);
  const [conductance, setUa] = useState(ua);
  const r = heatExchanger({
    flow: mode,
    hotIn: th,
    coldIn: tc,
    hotRate: ch,
    coldRate: cc,
    ua: conductance,
  });
  const H = 260;
  const x0 = 50;
  const w = W - 80;
  const py = (T: number) => 20 + ((th + 5 - T) / (th - tc + 10)) * (H - 60);
  const hot = r.profile.map((p) => [x0 + p.x * w, py(p.hot)] as const);
  const cold = r.profile.map((p) => [x0 + p.x * w, py(p.cold)] as const);
  return (
    <WidgetShell
      title={`${mode === "parallel" ? "Parallel" : "Counter"}-flow heat exchanger`}
      caption={caption}
      readouts={
        <>
          <Readout label="Heat transferred Q" value={siFormat(r.heat, "W")} />
          <Readout label="Hot out / cold out" value={`${fmt(r.hotOut)} / ${fmt(r.coldOut)} °C`} />
          <Readout label="LMTD" value={`${fmt(r.lmtd)} K`} />
          <Readout label="Effectiveness ε" value={fmt(r.effectiveness)} />
        </>
      }
      controls={
        <>
          <Choice
            options={["parallel", "counter"] as const}
            value={mode}
            onChange={setMode}
            labels={{ parallel: "Parallel flow", counter: "Counter flow" }}
          />
          <Slider
            label="Hot fluid in"
            value={th}
            min={40}
            max={150}
            step={1}
            unit="°C"
            onChange={(v) => setTh(Math.max(v, tc + 5))}
          />
          <Slider
            label="Cold fluid in"
            value={tc}
            min={5}
            max={60}
            step={1}
            unit="°C"
            onChange={(v) => setTc(Math.min(v, th - 5))}
          />
          <Slider
            label="Hot ṁcₚ"
            value={ch}
            min={200}
            max={5000}
            step={50}
            unit="W/K"
            onChange={setCh}
          />
          <Slider
            label="Cold ṁcₚ"
            value={cc}
            min={200}
            max={5000}
            step={50}
            unit="W/K"
            onChange={setCc}
          />
          <Slider
            label="UA"
            value={conductance}
            min={100}
            max={8000}
            step={50}
            unit="W/K"
            onChange={setUa}
          />
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Temperatures along the exchanger; ${siFormat(r.heat, "watts")} transferred`}
      >
        <rect x={x0} y={20} width={w} height={H - 60} fill="none" stroke="var(--border)" />
        <path d={pathOf(hot)} fill="none" stroke="#ef4444" strokeWidth={2.5} />
        <path d={pathOf(cold)} fill="none" stroke="#3b82f6" strokeWidth={2.5} />
        <text x={x0 + 6} y={py(th) - 6} fontSize={12} fill="#ef4444">
          hot {fmt(th)} °C →
        </text>
        <text
          x={mode === "parallel" ? x0 + 6 : x0 + w - 6}
          y={py(tc) + 16}
          fontSize={12}
          fill="#3b82f6"
          textAnchor={mode === "parallel" ? "start" : "end"}
        >
          {mode === "parallel" ? `cold ${fmt(tc)} °C →` : `← cold ${fmt(tc)} °C`}
        </text>
        <text x={x0 + w / 2} y={H - 18} textAnchor="middle" fontSize={12} fill="var(--muted)">
          position along the tube (hot inlet on the left)
        </text>
      </svg>
    </WidgetShell>
  );
}

/* ---------- Venturi / orifice meter ---------- */

export function FlowMeter({
  meter,
  pipeMm,
  throatMm,
  flowLps,
  caption,
}: {
  meter: "venturi" | "orifice";
  pipeMm: number;
  throatMm: number;
  flowLps: number;
  caption: string;
}) {
  const [type, setType] = useState(meter);
  const [q, setQ] = useState(flowLps);
  const [d1, setD1] = useState(pipeMm);
  const [d2, setD2] = useState(Math.min(throatMm, pipeMm - 5));
  const cd = type === "venturi" ? 0.98 : 0.62;
  const r = flowMeterReading({ flow: q / 1000, pipeD: d1 / 1000, throatD: d2 / 1000, cd });
  const H = 240;
  const cy = 90;
  const half1 = (d1 / 200) * 60;
  const half2 = (d2 / 200) * 60;
  const topPts: [number, number][] =
    type === "venturi"
      ? [
          [20, cy - half1],
          [200, cy - half1],
          [290, cy - half2],
          [350, cy - half2],
          [520, cy - half1],
          [620, cy - half1],
        ]
      : [
          [20, cy - half1],
          [620, cy - half1],
        ];
  const bottomPts = topPts.map(([x, y]) => [x, 2 * cy - y] as [number, number]);
  const top = pathOf(topPts);
  const bottom = pathOf(bottomPts);
  // Manometer: mercury columns differ by h (drawn up to 120 px for 0.5 m).
  const hPx = Math.min(120, (r.manometer / 0.5) * 120);
  const legs = [200, 320];
  return (
    <WidgetShell
      title={type === "venturi" ? "Venturi meter" : "Orifice meter"}
      caption={caption}
      readouts={
        <>
          <Readout label="Manometer reading h" value={`${fmt(r.manometer * 100)} cm Hg`} />
          <Readout label="Pressure drop Δp" value={siFormat(r.pressureDrop, "Pa")} />
          <Readout label="Throat velocity" value={`${fmt(r.throatVelocity)} m/s`} />
          <Readout label="Reynolds number (pipe)" value={fmt(r.reynolds, 3)} />
        </>
      }
      controls={
        <>
          <Choice
            options={["venturi", "orifice"] as const}
            value={type}
            onChange={setType}
            labels={{ venturi: "Venturi (Cd ≈ 0.98)", orifice: "Orifice (Cd ≈ 0.62)" }}
          />
          <Slider
            label="Flow rate Q"
            value={q}
            min={0.2}
            max={10}
            step={0.1}
            unit="L/s"
            onChange={setQ}
          />
          <Slider
            label="Pipe diameter"
            value={d1}
            min={25}
            max={150}
            step={5}
            unit="mm"
            onChange={(v) => {
              setD1(v);
              setD2((d) => Math.min(d, v - 5));
            }}
          />
          <Slider
            label={type === "venturi" ? "Throat diameter" : "Orifice diameter"}
            value={d2}
            min={10}
            max={d1 - 5}
            step={1}
            unit="mm"
            onChange={setD2}
          />
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`${type} meter: manometer reading ${fmt(r.manometer * 100)} centimetres of mercury`}
      >
        <path
          d={`${pathOf([...topPts, ...[...bottomPts].reverse()])} Z`}
          fill="#93c5fd"
          opacity={0.35}
        />
        <path d={top} fill="none" stroke="var(--fg)" strokeWidth={2} />
        <path d={bottom} fill="none" stroke="var(--fg)" strokeWidth={2} />
        {type === "orifice" && (
          <>
            <line
              x1={320}
              y1={cy - half1}
              x2={320}
              y2={cy - half2}
              stroke="var(--fg)"
              strokeWidth={4}
            />
            <line
              x1={320}
              y1={cy + half1}
              x2={320}
              y2={cy + half2}
              stroke="var(--fg)"
              strokeWidth={4}
            />
          </>
        )}
        {/* U-tube manometer under the pipe */}
        {legs.map((x, i) => (
          <g key={x}>
            <line x1={x} y1={cy + half1} x2={x} y2={H - 10} stroke="var(--muted)" />
            <line x1={x + 12} y1={cy + half1} x2={x + 12} y2={H - 10} stroke="var(--muted)" />
            <rect
              x={x}
              y={H - 70 + (i === 0 ? hPx / 2 : -hPx / 2)}
              width={12}
              height={60 - (i === 0 ? hPx / 2 : -hPx / 2)}
              fill="#9ca3af"
            />
          </g>
        ))}
        <line x1={legs[0]} y1={H - 10} x2={legs[1] + 12} y2={H - 10} stroke="var(--muted)" />
        <text x={legs[1] + 24} y={H - 60} fontSize={12} fill="var(--muted)">
          h = {fmt(r.manometer * 100)} cm of mercury
        </text>
      </svg>
    </WidgetShell>
  );
}

/* ---------- Oscilloscope ---------- */

export function Oscilloscope({
  mode,
  freqA,
  freqB,
  amplitudeA,
  amplitudeB,
  phaseDeg,
  caption,
}: {
  mode: "yt" | "xy";
  freqA: number;
  freqB: number;
  amplitudeA: number;
  amplitudeB: number;
  phaseDeg: number;
  caption: string;
}) {
  const [view, setView] = useState(mode);
  const [fa, setFa] = useState(freqA);
  const [fb, setFb] = useState(freqB);
  const [aa, setAa] = useState(amplitudeA);
  const [ab, setAb] = useState(amplitudeB);
  const [phase, setPhase] = useState(phaseDeg);
  const [timeDiv, setTimeDiv] = useState(1);
  const H = 300;
  const div = H / 8;
  const vPerDiv = 1;
  const a = { amplitude: aa, frequency: fa, phaseDeg: 0 };
  const b = { amplitude: ab, frequency: fb, phaseDeg: phase };
  const slow = Math.min(fa, fb);
  // Ten horizontal divisions of `timeDiv` ms each (Y-T); one slow period, many samples (X-Y).
  const samples = 600;
  const toY = (v: number) => H / 2 - (v / vPerDiv) * div;
  const ratio = lissajousRatio(fa, fb);
  const traces =
    view === "yt"
      ? [a, b].map((c) =>
          Array.from({ length: samples + 1 }, (_, i) => {
            const t = (i / samples) * 10 * (timeDiv / 1000);
            return [(i / samples) * W, toY(channelValue(c, t))] as const;
          }),
        )
      : [
          Array.from({ length: samples * 4 + 1 }, (_, i) => {
            const t = (i / (samples * 4)) * (ratio ? ratio[1] / fb : 4 / slow);
            return [W / 2 + (channelValue(a, t) / vPerDiv) * div, toY(channelValue(b, t))] as const;
          }),
        ];
  return (
    <WidgetShell
      title="Oscilloscope"
      caption={caption}
      readouts={
        <>
          <Readout label="CH1" value={`${fa} Hz, ${fmt(aa * 2)} Vpp`} />
          <Readout label="CH2" value={`${fb} Hz, ${fmt(ab * 2)} Vpp`} />
          <Readout label="Phase (CH2 − CH1)" value={`${phase}°`} />
          <Readout
            label={view === "yt" ? "Time/div" : "Lissajous ratio"}
            value={
              view === "yt" ? `${timeDiv} ms` : ratio ? `${ratio[0]} : ${ratio[1]}` : "not steady"
            }
          />
        </>
      }
      controls={
        <>
          <Choice
            options={["yt", "xy"] as const}
            value={view}
            onChange={setView}
            labels={{ yt: "Y-T (time)", xy: "X-Y (Lissajous)" }}
          />
          <Slider
            label="CH1 frequency"
            value={fa}
            min={50}
            max={1000}
            step={50}
            unit="Hz"
            onChange={setFa}
          />
          <Slider
            label="CH2 frequency"
            value={fb}
            min={50}
            max={1000}
            step={50}
            unit="Hz"
            onChange={setFb}
          />
          <Slider
            label="CH1 amplitude"
            value={aa}
            min={0.5}
            max={3.5}
            step={0.5}
            unit="V"
            onChange={setAa}
          />
          <Slider
            label="CH2 amplitude"
            value={ab}
            min={0.5}
            max={3.5}
            step={0.5}
            unit="V"
            onChange={setAb}
          />
          <Slider
            label="CH2 phase"
            value={phase}
            min={0}
            max={360}
            step={15}
            unit="°"
            onChange={setPhase}
          />
          {view === "yt" && (
            <Slider
              label="Time/div"
              value={timeDiv}
              min={0.5}
              max={10}
              step={0.5}
              unit="ms"
              onChange={setTimeDiv}
            />
          )}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full bg-[#0b1a12]"
        role="img"
        aria-label={`Oscilloscope in ${view === "yt" ? "time" : "X-Y"} mode`}
      >
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`v${i}`} x1={(i * W) / 10} y1={0} x2={(i * W) / 10} y2={H} stroke="#1f3d2c" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * div} x2={W} y2={i * div} stroke="#1f3d2c" />
        ))}
        {traces.map((pts, i) => (
          <path
            key={i}
            d={pathOf(pts)}
            fill="none"
            stroke={i === 0 ? "#facc15" : "#22d3ee"}
            strokeWidth={2}
          />
        ))}
        <text x={8} y={16} fontSize={12} fill="#86efac">
          1 V/div
        </text>
      </svg>
    </WidgetShell>
  );
}
