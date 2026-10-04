"use client";

import { useState } from "react";
import { fmt } from "@/visuals/mathTools";
import { ArrowMarker, Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import {
  conicName,
  conicPoints,
  incline,
  projectile,
  resultant,
  roulette,
  solidViews,
  type Force,
  type Roulette,
  type Solid,
} from "@/visuals/wave1/otherModels";

const FORCE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#a855f7"];

/** Concurrent coplanar forces and their resultant (components and the polygon of forces). */
export function ForceResultant({ forces: start, caption }: { forces: Force[]; caption: string }) {
  const [forces, setForces] = useState(start);
  const r = resultant(forces);
  const maxF = Math.max(...forces.map((f) => f.magnitude), r.magnitude, 1);
  const S = 150;
  const k = 120 / maxF;
  const tip = (f: Force) => ({
    x: S + f.magnitude * k * Math.cos((f.angleDeg * Math.PI) / 180),
    y: S - f.magnitude * k * Math.sin((f.angleDeg * Math.PI) / 180),
  });
  const set = (i: number, patch: Partial<Force>) =>
    setForces((list) => list.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <WidgetShell
      title="Resultant of concurrent forces"
      caption={caption}
      readouts={
        <>
          <Readout label="ΣFx" value={`${fmt(r.fx)} N`} />
          <Readout label="ΣFy" value={`${fmt(r.fy)} N`} />
          <Readout label="Resultant R" value={`${fmt(r.magnitude)} N`} />
          <Readout label="Direction θ" value={`${fmt(r.angleDeg)}°`} />
        </>
      }
      controls={
        <>
          {forces.map((f, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border border-border p-2">
              <Slider
                label={`F${i + 1} magnitude`}
                value={f.magnitude}
                min={0}
                max={100}
                step={1}
                unit="N"
                onChange={(v) => set(i, { magnitude: v })}
              />
              <Slider
                label={`F${i + 1} angle`}
                value={f.angleDeg}
                min={0}
                max={359}
                step={1}
                unit="°"
                onChange={(v) => set(i, { angleDeg: v })}
              />
            </div>
          ))}
        </>
      }
    >
      <svg
        viewBox="0 0 300 300"
        className="mx-auto block w-full max-w-sm"
        role="img"
        aria-label={`Resultant ${fmt(r.magnitude)} newtons at ${fmt(r.angleDeg)} degrees`}
      >
        <defs>
          {FORCE_COLORS.map((c, i) => (
            <ArrowMarker key={c} id={`fr-${i}`} color={c} />
          ))}
          <ArrowMarker id="fr-r" color="#e1306c" />
        </defs>
        <line x1={0} x2={300} y1={S} y2={S} stroke="var(--border)" />
        <line x1={S} x2={S} y1={0} y2={300} stroke="var(--border)" />
        {forces.map((f, i) => {
          const t = tip(f);
          return f.magnitude > 0 ? (
            <line
              key={i}
              x1={S}
              y1={S}
              x2={t.x}
              y2={t.y}
              stroke={FORCE_COLORS[i]}
              strokeWidth={3}
              markerEnd={`url(#fr-${i})`}
            />
          ) : null;
        })}
        {r.magnitude > 0.01 && (
          <line
            x1={S}
            y1={S}
            x2={S + r.fx * k}
            y2={S - r.fy * k}
            stroke="#e1306c"
            strokeWidth={4}
            strokeDasharray="8 4"
            markerEnd="url(#fr-r)"
          />
        )}
      </svg>
      <Legend
        items={[
          ...forces.map((_, i) => ({ color: FORCE_COLORS[i], label: `F${i + 1}` })),
          { color: "#e1306c", label: "resultant R", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

/** A block on a rough incline: friction needed against friction available. */
export function InclineFriction({
  angleDeg,
  muStatic,
  muKinetic,
  caption,
}: {
  angleDeg: number;
  muStatic: number;
  muKinetic: number;
  caption: string;
}) {
  const [angle, setAngle] = useState(angleDeg);
  const [mus, setMus] = useState(muStatic);
  const r = incline(angle, mus, Math.min(muKinetic, mus));
  const a = (angle * Math.PI) / 180;
  const L = 240;
  const x0 = 30;
  const y0 = 220;
  const top = { x: x0 + L * Math.cos(a), y: y0 - L * Math.sin(a) };
  const mid = { x: x0 + 0.55 * L * Math.cos(a), y: y0 - 0.55 * L * Math.sin(a) };
  const rot = -angle;
  return (
    <WidgetShell
      title="Block on an inclined plane"
      caption={caption}
      readouts={
        <>
          <Readout label="Slides?" value={r.slides ? "yes" : "no, held by friction"} />
          <Readout label="Acceleration" value={`${fmt(r.acceleration)} m/s²`} />
          <Readout label="Angle of repose tan⁻¹ μs" value={`${fmt(r.angleOfRepose)}°`} />
          <Readout
            label="Friction needed / available (N per kg)"
            value={`${fmt(r.frictionNeeded)} / ${fmt(r.frictionAvailable)}`}
          />
        </>
      }
      controls={
        <>
          <Slider
            label="Incline angle θ"
            value={angle}
            min={0}
            max={60}
            step={1}
            unit="°"
            onChange={setAngle}
          />
          <Slider
            label="Static friction μs"
            value={mus}
            min={0}
            max={1}
            step={0.02}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setMus}
          />
        </>
      }
    >
      <svg
        viewBox="0 0 300 240"
        className="mx-auto block w-full max-w-md"
        role="img"
        aria-label={`Incline at ${angle} degrees; the block ${r.slides ? "slides" : "stays"}`}
      >
        <polygon
          points={`${x0},${y0} ${top.x},${y0} ${top.x},${top.y}`}
          fill="var(--surface-2)"
          stroke="var(--muted)"
        />
        <g transform={`translate(${mid.x} ${mid.y}) rotate(${rot})`}>
          <rect
            x={-20}
            y={-30}
            width={40}
            height={30}
            rx={4}
            fill={r.slides ? "#e1306c" : "var(--primary)"}
          />
        </g>
        <text x={x0 + 40} y={y0 - 8} fontSize="12" fill="var(--muted)">
          θ = {angle}°
        </text>
      </svg>
    </WidgetShell>
  );
}

/** Projectile motion: trajectory, range and maximum height. */
export function ProjectileWidget({
  speed: vStart,
  angleDeg,
  caption,
}: {
  speed: number;
  angleDeg: number;
  caption: string;
}) {
  const [v, setV] = useState(vStart);
  const [angle, setAngle] = useState(angleDeg);
  const p = projectile(v, angle);
  const maxRange = (40 * 40) / 9.81;
  const scale = makeGraphScale({
    xMin: 0,
    xMax: maxRange * 1.05,
    yMin: 0,
    yMax: ((40 * 40) / (2 * 9.81)) * 1.1,
  });
  const points = Array.from({ length: 81 }, (_, i) => p.at((p.flight * i) / 80));
  return (
    <WidgetShell
      title="Projectile motion"
      caption={caption}
      readouts={
        <>
          <Readout label="Range u² sin2θ / g" value={`${fmt(p.range)} m`} />
          <Readout label="Max height u² sin²θ / 2g" value={`${fmt(p.maxHeight)} m`} />
          <Readout label="Time of flight" value={`${fmt(p.flight)} s`} />
          <Readout label="Horizontal speed" value={`${fmt(p.vx)} m/s (constant)`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Launch speed u"
            value={v}
            min={5}
            max={40}
            step={1}
            unit="m/s"
            onChange={setV}
          />
          <Slider
            label="Launch angle θ"
            value={angle}
            min={5}
            max={85}
            step={1}
            unit="°"
            onChange={setAngle}
          />
        </>
      }
    >
      <Graph scale={scale} label={`Trajectory with range ${fmt(p.range)} metres`}>
        <polyline
          points={points.map((q) => `${scale.sx(q.x)},${scale.sy(Math.max(0, q.y))}`).join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3}
        />
        <circle cx={scale.sx(p.range / 2)} cy={scale.sy(p.maxHeight)} r={5} fill="#e1306c" />
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "path (height against distance, m)" },
          { color: "#e1306c", label: "highest point" },
        ]}
      />
    </WidgetShell>
  );
}

/** Conics by the eccentricity method: a point whose distance to the focus is e × its distance to the directrix. */
export function ConicEccentricity({
  eccentricity,
  distance,
  caption,
}: {
  eccentricity: number;
  distance: number;
  caption: string;
}) {
  const [e, setE] = useState(eccentricity);
  const d = distance;
  const pts = conicPoints(e, d);
  const scale = makeGraphScale({ xMin: -d * 1.6, xMax: d * 4, yMin: -d * 2, yMax: d * 2 });
  const pick = pts[Math.floor(pts.length / 6)] ?? { x: 0, y: 0 };
  return (
    <WidgetShell
      title={`Conic by eccentricity: ${conicName(e)}`}
      caption={caption}
      readouts={
        <>
          <Readout label="Eccentricity e" value={e.toFixed(2)} />
          <Readout label="Curve" value={conicName(e)} />
          <Readout
            label="PF ÷ PD for the marked point"
            value={fmt(Math.hypot(pick.x, pick.y) / (pick.x + d))}
          />
        </>
      }
      controls={
        <Slider
          label="Eccentricity e"
          value={e}
          min={0.2}
          max={1.8}
          step={0.05}
          unit=""
          format={(v) => v.toFixed(2)}
          onChange={setE}
        />
      }
    >
      <Graph scale={scale} label={`A ${conicName(e)} with eccentricity ${e.toFixed(2)}`}>
        <line
          x1={scale.sx(-d)}
          x2={scale.sx(-d)}
          y1={scale.sy(-d * 2)}
          y2={scale.sy(d * 2)}
          stroke="#f59e0b"
          strokeWidth={2}
        />
        <polyline
          points={pts.map((p) => `${scale.sx(p.x)},${scale.sy(p.y)}`).join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3}
        />
        <circle cx={scale.sx(0)} cy={scale.sy(0)} r={5} fill="#e1306c" />
        <line
          x1={scale.sx(0)}
          y1={scale.sy(0)}
          x2={scale.sx(pick.x)}
          y2={scale.sy(pick.y)}
          stroke="#e1306c"
          strokeDasharray="4 3"
        />
        <line
          x1={scale.sx(-d)}
          y1={scale.sy(pick.y)}
          x2={scale.sx(pick.x)}
          y2={scale.sy(pick.y)}
          stroke="#f59e0b"
          strokeDasharray="4 3"
        />
      </Graph>
      <Legend
        items={[
          { color: "#f59e0b", label: "directrix (PD dashed)" },
          { color: "#e1306c", label: "focus F (PF dashed)" },
          { color: "var(--primary)", label: "locus where PF = e·PD" },
        ]}
      />
    </WidgetShell>
  );
}

/** Cycloid, epicycloid, hypocycloid and involute traced by a rolling circle or unwinding string. */
export function RouletteCurves({
  curve: curveStart,
  caption,
}: {
  curve: Roulette;
  caption: string;
}) {
  const [curve, setCurve] = useState<Roulette>(curveStart);
  const [turn, setTurn] = useState(360);
  const r = 1;
  const base = curve === "involute" ? 1 : 3;
  const thetaMax =
    curve === "cycloid"
      ? (turn * Math.PI) / 180
      : curve === "involute"
        ? (turn * Math.PI) / 180
        : ((turn * Math.PI) / 180) * (base / r);
  const pts = Array.from({ length: 241 }, (_, i) => roulette(curve, (thetaMax * i) / 240, r, base));
  const scale =
    curve === "cycloid"
      ? makeGraphScale({ xMin: -0.5, xMax: 2 * Math.PI + 0.5, yMin: -0.5, yMax: 3 })
      : makeGraphScale({ xMin: -6.5, xMax: 6.5, yMin: -5, yMax: 5 });
  return (
    <WidgetShell
      title={`Engineering curves: ${curve}`}
      caption={caption}
      readouts={<Readout label="Rolled / unwound" value={`${turn}°`} />}
      controls={
        <>
          <Slider
            label="How far it has rolled"
            value={turn}
            min={10}
            max={360}
            step={5}
            unit="°"
            onChange={setTurn}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {(["cycloid", "epicycloid", "hypocycloid", "involute"] as const).map((c) => (
              <WidgetButton key={c} onClick={() => setCurve(c)}>
                {c}
              </WidgetButton>
            ))}
          </div>
        </>
      }
    >
      <Graph scale={scale} label={`${curve} traced up to ${turn} degrees`}>
        {curve === "cycloid" ? (
          <line
            x1={scale.sx(-0.5)}
            x2={scale.sx(7)}
            y1={scale.sy(0)}
            y2={scale.sy(0)}
            stroke="#f59e0b"
            strokeWidth={2}
          />
        ) : (
          <circle
            cx={scale.sx(0)}
            cy={scale.sy(0)}
            r={scale.sx(base) - scale.sx(0)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
          />
        )}
        <polyline
          points={pts.map((p) => `${scale.sx(p.x)},${scale.sy(p.y)}`).join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3}
        />
      </Graph>
      <Legend
        items={[
          {
            color: "#f59e0b",
            label: curve === "cycloid" ? "straight line it rolls on" : "base / directing circle",
          },
          { color: "var(--primary)", label: "traced curve" },
        ]}
      />
    </WidgetShell>
  );
}

/** First-angle orthographic views (front view above the XY line, top view below) of simple solids. */
export function OrthographicViews({
  solid: solidStart,
  caption,
}: {
  solid: Solid;
  caption: string;
}) {
  const [solid, setSolid] = useState<Solid>(solidStart);
  const base = 60;
  const height = 90;
  const v = solidViews(solid, base, height);
  const cx = 150;
  const xy = 130; // XY reference line
  const front = v.front.map((p) => `${cx + p.x},${xy - 10 - p.y}`).join(" ");
  const topY = xy + 20 + base / 2;
  return (
    <WidgetShell
      title={`Orthographic projection (first angle): ${solid}`}
      caption={caption}
      readouts={
        <>
          <Readout
            label="Front view (elevation)"
            value={v.front.length === 3 ? "triangle" : "rectangle"}
          />
          <Readout
            label="Top view (plan)"
            value={`${v.top.shape}${v.top.apex ? " with apex point" : ""}`}
          />
        </>
      }
      controls={
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {(["prism", "pyramid", "cylinder", "cone"] as const).map((s) => (
            <WidgetButton key={s} onClick={() => setSolid(s)}>
              {s}
            </WidgetButton>
          ))}
        </div>
      }
    >
      <svg
        viewBox="0 0 300 250"
        className="mx-auto block w-full max-w-md"
        role="img"
        aria-label={`Front and top views of a ${solid}`}
      >
        <line x1={20} x2={280} y1={xy} y2={xy} stroke="var(--muted)" />
        <text x={24} y={xy - 4} fontSize="11" fill="var(--muted)">
          X
        </text>
        <text x={268} y={xy - 4} fontSize="11" fill="var(--muted)">
          Y
        </text>
        <polygon points={front} fill="none" stroke="var(--primary)" strokeWidth={2.5} />
        {v.top.shape === "square" ? (
          <rect
            x={cx - base / 2}
            y={topY - base / 2}
            width={base}
            height={base}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
          />
        ) : (
          <circle cx={cx} cy={topY} r={base / 2} fill="none" stroke="#10b981" strokeWidth={2.5} />
        )}
        {v.top.apex && v.top.shape === "square" && (
          <>
            <line
              x1={cx - base / 2}
              y1={topY - base / 2}
              x2={cx + base / 2}
              y2={topY + base / 2}
              stroke="#10b981"
            />
            <line
              x1={cx + base / 2}
              y1={topY - base / 2}
              x2={cx - base / 2}
              y2={topY + base / 2}
              stroke="#10b981"
            />
          </>
        )}
        {v.top.apex && <circle cx={cx} cy={topY} r={3} fill="#10b981" />}
        {[-base / 2, base / 2].map((dx) => (
          <line
            key={dx}
            x1={cx + dx}
            x2={cx + dx}
            y1={xy - 10}
            y2={topY}
            stroke="var(--muted)"
            strokeDasharray="3 3"
          />
        ))}
        <text x={cx + base / 2 + 8} y={xy - 40} fontSize="11" fill="var(--primary)">
          Front view
        </text>
        <text x={cx + base / 2 + 8} y={topY + 4} fontSize="11" fill="#10b981">
          Top view
        </text>
      </svg>
    </WidgetShell>
  );
}
