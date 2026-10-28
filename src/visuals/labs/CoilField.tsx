"use client";

import { useMemo, useState, type PointerEvent } from "react";
import { siFormat } from "@/visuals/physics";
import { coilFieldAt, type Coil } from "@/visuals/labs/labModels";
import { ArrowMarker, makeScale, Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";

const W = 640;
const H = 300;
const PLOT_H = 150;
/** The view: 40 cm along the axis, 20 cm across. */
const VIEW = { xMin: -20, xMax: 20, yMin: -10, yMax: 10 };
const { sx, sy, ux } = makeScale(VIEW, W, H);

type Drag = { kind: "coil"; index: number } | { kind: "probe" } | null;

/**
 * One or two circular coils seen from the side (syllabus fix, Phase 7B: "magnetic field along the
 * axis of a coil", Helmholtz coils). Drag a coil or the probe along the axis (or use the sliders),
 * turn a coil, reverse its current; arrows show the field and the graph shows B along the axis.
 */
export function CoilField({
  coils: count,
  radiusCm,
  turns: initialTurns,
  current: initialCurrent,
  separationCm,
  caption,
}: {
  coils: 1 | 2;
  radiusCm: number;
  turns: number;
  current: number;
  separationCm: number;
  caption: string;
}) {
  const [two, setTwo] = useState(count === 2);
  const [positions, setPositions] = useState<[number, number]>(
    count === 2 ? [-separationCm / 2, separationCm / 2] : [0, separationCm / 2 || 10],
  );
  const [tilts, setTilts] = useState<[number, number]>([0, 0]);
  const [reversed, setReversed] = useState(false);
  const [current, setCurrent] = useState(initialCurrent);
  const [turns, setTurns] = useState(initialTurns);
  const [radius, setRadius] = useState(radiusCm);
  const [probe, setProbe] = useState(two ? 0 : radiusCm);
  const [drag, setDrag] = useState<Drag>(null);

  const coils: Coil[] = useMemo(() => {
    const list: Coil[] = [
      { x: positions[0] / 100, radius: radius / 100, turns, current, tiltDeg: tilts[0] },
    ];
    if (two)
      list.push({
        x: positions[1] / 100,
        radius: radius / 100,
        turns,
        current: reversed ? -current : current,
        tiltDeg: tilts[1],
      });
    return list;
  }, [positions, radius, turns, current, tilts, two, reversed]);

  // The field on a grid of points (arrows) and along the axis (graph).
  const arrows = useMemo(() => {
    const out: { x: number; y: number; bx: number; by: number; mag: number }[] = [];
    for (let i = 0; i <= 16; i++) {
      for (let j = 0; j <= 8; j++) {
        const x = VIEW.xMin + 1.25 + i * 2.35;
        const y = VIEW.yMin + 1 + j * 2.25;
        const [bx, by] = coilFieldAt(coils, x / 100, y / 100);
        out.push({ x, y, bx, by, mag: Math.hypot(bx, by) });
      }
    }
    return out;
  }, [coils]);
  const axis = useMemo(
    () =>
      Array.from({ length: 121 }, (_, i) => {
        const x = VIEW.xMin + (i * (VIEW.xMax - VIEW.xMin)) / 120;
        return { x, b: coilFieldAt(coils, x / 100, 0)[0] };
      }),
    [coils],
  );
  const maxMag = Math.max(...arrows.map((a) => a.mag), 1e-12);
  const maxAxis = Math.max(...axis.map((p) => Math.abs(p.b)), 1e-12);
  const [pbx, pby] = coilFieldAt(coils, probe / 100, 0);

  const toWorldX = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width === 0) return 0;
    const x = ux(((e.clientX - box.left) / box.width) * W);
    return Math.round(Math.min(18, Math.max(-18, x)) * 2) / 2;
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const x = toWorldX(e);
    if (drag.kind === "probe") setProbe(x);
    else setPositions((p) => (drag.index === 0 ? [x, p[1]] : [p[0], x]));
  };
  // The drawing keeps the pointer while dragging, so a finger can leave the coil.
  const begin = (d: NonNullable<Drag>, e: PointerEvent<SVGElement>) => {
    setDrag(d);
    e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId);
  };
  const end = () => setDrag(null);

  const plotY = (b: number) => PLOT_H / 2 - (b / maxAxis) * (PLOT_H / 2 - 12);
  const path = axis
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${plotY(p.b).toFixed(1)}`)
    .join(" ");

  return (
    <WidgetShell
      title={two ? "Magnetic field of two coils" : "Magnetic field of a coil"}
      caption={caption}
      readouts={
        <>
          <Readout label="Probe on the axis at" value={`${probe} cm`} />
          <Readout label="B at the probe" value={siFormat(Math.hypot(pbx, pby), "T")} />
          <Readout label="Bₓ (along the axis)" value={siFormat(pbx, "T")} />
          <Readout
            label={two ? "Coil gap" : "Coil centre"}
            value={two ? `${Math.abs(positions[1] - positions[0])} cm` : `${positions[0]} cm`}
          />
        </>
      }
      controls={
        <>
          <Slider
            label={two ? "Coil 1 position" : "Coil position"}
            value={positions[0]}
            min={-18}
            max={18}
            step={0.5}
            unit="cm"
            onChange={(v) => setPositions((p) => [v, p[1]])}
          />
          {two && (
            <Slider
              label="Coil 2 position"
              value={positions[1]}
              min={-18}
              max={18}
              step={0.5}
              unit="cm"
              onChange={(v) => setPositions((p) => [p[0], v])}
            />
          )}
          <Slider
            label="Probe position"
            value={probe}
            min={-18}
            max={18}
            step={0.5}
            unit="cm"
            onChange={setProbe}
          />
          <Slider
            label={two ? "Turn coil 1" : "Turn the coil"}
            value={tilts[0]}
            min={-90}
            max={90}
            step={5}
            unit="°"
            onChange={(v) => setTilts((t) => [v, t[1]])}
          />
          {two && (
            <Slider
              label="Turn coil 2"
              value={tilts[1]}
              min={-90}
              max={90}
              step={5}
              unit="°"
              onChange={(v) => setTilts((t) => [t[0], v])}
            />
          )}
          <Slider
            label="Current I"
            value={current}
            min={0.1}
            max={5}
            step={0.1}
            unit="A"
            onChange={setCurrent}
          />
          <Slider
            label="Turns N"
            value={turns}
            min={1}
            max={500}
            step={1}
            unit=""
            onChange={setTurns}
          />
          <Slider
            label="Coil radius R"
            value={radius}
            min={2}
            max={9}
            step={0.5}
            unit="cm"
            onChange={setRadius}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setTwo((t) => !t)}>
              {two ? "Use one coil" : "Add a second coil"}
            </WidgetButton>
            {two && (
              <>
                <WidgetButton onClick={() => setReversed((r) => !r)}>
                  {reversed ? "Same current in coil 2" : "Reverse coil 2's current"}
                </WidgetButton>
                <WidgetButton
                  onClick={() => {
                    // Helmholtz: gap equal to the radius, centred on the probe's zero.
                    setPositions([-radius / 2, radius / 2]);
                    setTilts([0, 0]);
                    setReversed(false);
                  }}
                >
                  Helmholtz spacing (gap = R)
                </WidgetButton>
              </>
            )}
          </div>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H + PLOT_H}`}
        className="block w-full touch-none select-none"
        role="img"
        aria-label={`${two ? "Two coils" : "A coil"} of radius ${radius} cm; field at the probe ${siFormat(Math.hypot(pbx, pby), "tesla")}`}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
      >
        <defs>
          <ArrowMarker id="cf-arrow" color="var(--primary)" size={7} />
        </defs>
        {/* The axis */}
        <line x1={0} y1={sy(0)} x2={W} y2={sy(0)} stroke="var(--border)" strokeDasharray="4 4" />
        {arrows.map((a) => {
          // Length grows with the field (square root, so weak regions still show).
          const len = 6 + 11 * Math.sqrt(a.mag / maxMag);
          const dx = (a.bx / (a.mag || 1)) * len;
          const dy = (-a.by / (a.mag || 1)) * len;
          const cx = sx(a.x);
          const cy = sy(a.y);
          return (
            <line
              key={`${a.x}:${a.y}`}
              x1={cx - dx / 2}
              y1={cy - dy / 2}
              x2={cx + dx / 2}
              y2={cy + dy / 2}
              stroke="var(--primary)"
              strokeWidth={1.4}
              opacity={0.25 + 0.75 * Math.sqrt(a.mag / maxMag)}
              markerEnd="url(#cf-arrow)"
            />
          );
        })}
        {coils.map((c, i) => {
          const t = ((c.tiltDeg ?? 0) * Math.PI) / 180;
          const r = c.radius * 100;
          const x = c.x * 100;
          // Edge-on, the coil is a line across its own axis.
          const top = { x: x - r * Math.sin(t), y: r * Math.cos(t) };
          const bottom = { x: x + r * Math.sin(t), y: -r * Math.cos(t) };
          const out = c.current > 0;
          return (
            <g
              key={i}
              onPointerDown={(e) => begin({ kind: "coil", index: i }, e)}
              className="cursor-grab"
              aria-label={`Coil ${i + 1}, drag along the axis`}
            >
              <line
                x1={sx(top.x)}
                y1={sy(top.y)}
                x2={sx(bottom.x)}
                y2={sy(bottom.y)}
                stroke="transparent"
                strokeWidth={30}
              />
              <line
                x1={sx(top.x)}
                y1={sy(top.y)}
                x2={sx(bottom.x)}
                y2={sy(bottom.y)}
                stroke="#d97706"
                strokeWidth={6}
                strokeLinecap="round"
              />
              {/* Current out of the screen at one end (dot), into it at the other (cross). */}
              {[top, bottom].map((p, k) => (
                <g key={k}>
                  <circle cx={sx(p.x)} cy={sy(p.y)} r={9} fill="var(--surface)" stroke="#d97706" />
                  <text
                    x={sx(p.x)}
                    y={sy(p.y) + 4}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#d97706"
                  >
                    {(k === 0) === out ? "•" : "×"}
                  </text>
                </g>
              ))}
              <text x={sx(x)} y={14} textAnchor="middle" fontSize={12} fill="var(--muted)">
                coil {i + 1}
              </text>
            </g>
          );
        })}
        {/* The probe */}
        <g onPointerDown={(e) => begin({ kind: "probe" }, e)} className="cursor-grab">
          <circle cx={sx(probe)} cy={sy(0)} r={16} fill="transparent" />
          <circle cx={sx(probe)} cy={sy(0)} r={6} fill="#e1306c" stroke="var(--surface)" />
        </g>
        {/* B along the axis */}
        <g transform={`translate(0 ${H})`}>
          <rect x={0} y={0} width={W} height={PLOT_H} fill="var(--surface-2)" opacity={0.5} />
          <line x1={0} y1={PLOT_H / 2} x2={W} y2={PLOT_H / 2} stroke="var(--border)" />
          <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2.5} />
          <line
            x1={sx(probe)}
            y1={0}
            x2={sx(probe)}
            y2={PLOT_H}
            stroke="#e1306c"
            strokeDasharray="3 3"
          />
          <circle cx={sx(probe)} cy={plotY(pbx)} r={4} fill="#e1306c" />
          <text x={8} y={16} fontSize={12} fill="var(--muted)">
            Bₓ along the axis (peak {siFormat(maxAxis, "T")})
          </text>
          <text x={W - 8} y={PLOT_H - 6} fontSize={12} fill="var(--muted)" textAnchor="end">
            x (−20 to 20 cm)
          </text>
        </g>
      </svg>
    </WidgetShell>
  );
}
