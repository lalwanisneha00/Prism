"use client";

import { useEffect, useRef, useState } from "react";
import { siFormat } from "@/visuals/physics";
import { LabPlot } from "@/visuals/labs/LabPlot";
import {
  eOverM,
  hallCoefficient,
  hallVoltage,
  hysteresisLoop,
  loopArea,
  ringDiameter,
  ringIntensity,
  thomsonBeam,
} from "@/visuals/labs/physicsLabModels";
import { Choice } from "@/visuals/wave2/ui2";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";

/*
 * Physics lab simulations added in the syllabus fix (Phase 7C fixes) for experiments that had none:
 * Newton's rings, the Hall effect, the B-H hysteresis loop and Thomson's e/m tube. Each shows the
 * apparatus as the student sees it, live readings, and the graph the lab asks for.
 */

const W = 640;
const fmt = (v: number, digits = 3) => String(Number(v.toPrecision(digits)));

/** Runs `tick(dt)` every frame while `playing`, unless the reader prefers less motion. */
function useFrames(playing: boolean, tick: (dt: number) => void) {
  const ref = useRef(tick);
  useEffect(() => {
    ref.current = tick;
  });
  useEffect(() => {
    if (!playing || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
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

/** The colour of light of a wavelength (nm), as an "r, g, b" string. */
export function lightColour(nm: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) [r, g, b] = [(440 - nm) / 60, 0, 1];
  else if (nm < 490) [r, g, b] = [0, (nm - 440) / 50, 1];
  else if (nm < 510) [r, g, b] = [0, 1, (510 - nm) / 20];
  else if (nm < 580) [r, g, b] = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) [r, g, b] = [1, (645 - nm) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  const c = (v: number) => Math.round(255 * Math.min(1, Math.max(0, v)) ** 0.8);
  return `${c(r)}, ${c(g)}, ${c(b)}`;
}

/** An "r, g, b" colour darkened towards black (k = 0 black, 1 full colour), as an opaque fill. */
function shade(rgb: string, k: number) {
  const [r, g, b] = rgb.split(",").map((v) => Math.round(Number(v) * k));
  return `rgb(${r}, ${g}, ${b})`;
}

/* ---------- Newton's rings ---------- */

export function NewtonRings({
  wavelengthNm,
  radiusCm,
  mu,
  caption,
}: {
  wavelengthNm: number;
  radiusCm: number;
  mu: number;
  caption: string;
}) {
  const [nm, setNm] = useState(wavelengthNm);
  const [R, setR] = useState(radiusCm);
  const [m, setMu] = useState(mu);
  const [n, setN] = useState(8);
  const lambda = nm * 1e-9;
  const Rm = R / 100;
  const dn = ringDiameter(n, lambda, Rm, m);
  // The view shows out to the 20th ring of the starting settings, so changing λ or R visibly
  // squeezes or spreads the rings.
  const viewR = ringDiameter(22, wavelengthNm * 1e-9, radiusCm / 100, mu) / 2;
  const H = 300;
  const cx = 150;
  const cy = H / 2;
  const fieldPx = 128;
  const px = fieldPx / viewR;
  const colour = lightColour(nm);
  // Rings drawn as thin annuli whose brightness follows the interference pattern.
  const annuli = Array.from({ length: 150 }, (_, i) => {
    const r = ((i + 0.5) / 150) * viewR;
    return { r: r * px, a: ringIntensity(r, lambda, Rm, m) };
  });
  // Microscope reading: the scale reads 20.000 mm at the centre of the rings.
  const centreMm = 20;
  const left = centreMm - (dn / 2) * 1000;
  const right = centreMm + (dn / 2) * 1000;
  const sampleNs = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  const d2 = (k: number) => (ringDiameter(k, lambda, Rm, m) * 1000) ** 2;
  // Lens edge height in the side view: a flatter lens (larger R) sits closer to the plate.
  const edgeY = 170 - Math.min(40, 3000 / R);
  return (
    <WidgetShell
      title="Newton's rings"
      caption={caption}
      readouts={
        <>
          <Readout label={`Left reading (ring ${n})`} value={`${left.toFixed(3)} mm`} />
          <Readout label={`Right reading (ring ${n})`} value={`${right.toFixed(3)} mm`} />
          <Readout label={`Diameter D${n}`} value={`${(dn * 1000).toFixed(3)} mm`} />
          <Readout label={`D${n}² (mm²)`} value={fmt(d2(n), 4)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Dark ring number n"
            value={n}
            min={1}
            max={20}
            step={1}
            unit=""
            onChange={setN}
          />
          <Slider
            label="Wavelength λ"
            value={nm}
            min={400}
            max={700}
            step={1}
            unit="nm"
            onChange={setNm}
          />
          <Slider
            label="Radius of curvature R"
            value={R}
            min={50}
            max={400}
            step={5}
            unit="cm"
            onChange={setR}
          />
          <Slider
            label="Film refractive index μ (1 = air)"
            value={m}
            min={1}
            max={1.6}
            step={0.01}
            unit=""
            onChange={setMu}
          />
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Rings seen in the microscope; cross-wire on dark ring ${n}, diameter ${(dn * 1000).toFixed(2)} mm`}
      >
        <defs>
          <clipPath id="nr-eyepiece">
            <circle cx={cx} cy={cy} r={fieldPx} />
          </clipPath>
          <radialGradient id="nr-vignette" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.75" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.55} />
          </radialGradient>
        </defs>
        {/* Eyepiece view */}
        <circle cx={cx} cy={cy} r={fieldPx + 8} fill="#1f2937" />
        <g clipPath="url(#nr-eyepiece)">
          <rect
            x={cx - fieldPx}
            y={cy - fieldPx}
            width={2 * fieldPx}
            height={2 * fieldPx}
            fill="#050505"
          />
          {annuli
            .slice()
            .reverse()
            .map((a, i) => (
              <circle key={i} cx={cx} cy={cy} r={a.r} fill={shade(colour, 0.06 + 0.94 * a.a)} />
            ))}
          {/* the dark centre is drawn by the pattern itself; overlay the cross-wires */}
          {[left, right].map((reading, i) => {
            const x = cx + ((reading - centreMm) / 1000) * px;
            return (
              <line
                key={i}
                x1={x}
                x2={x}
                y1={cy - fieldPx}
                y2={cy + fieldPx}
                stroke="#fff"
                strokeWidth={1.6}
                strokeDasharray={i ? "5 4" : undefined}
              />
            );
          })}
          <line
            x1={cx - fieldPx}
            x2={cx + fieldPx}
            y1={cy}
            y2={cy}
            stroke="#fff"
            strokeWidth={1}
            opacity={0.6}
          />
          <circle cx={cx} cy={cy} r={fieldPx} fill="url(#nr-vignette)" />
        </g>
        <text x={cx} y={H - 4} textAnchor="middle" fontSize={16} fill="var(--muted)">
          View through the travelling microscope
        </text>

        {/* Side view: lens on glass plate, light from the inclined plate */}
        <g transform="translate(330 40)">
          <text x={140} y={0} textAnchor="middle" fontSize={18} fontWeight={700} fill="var(--fg)">
            Side view
          </text>
          <rect x={20} y={170} width={240} height={14} rx={2} fill="#bfdbfe" stroke="#60a5fa" />
          <text x={140} y={202} textAnchor="middle" fontSize={16} fill="var(--muted)">
            Glass plate
          </text>
          <path
            d={`M40 120 L240 120 L240 ${edgeY} Q140 ${340 - edgeY} 40 ${edgeY} Z`}
            fill="#e0f2fe"
            stroke="#38bdf8"
            strokeWidth={1.5}
          />
          <text x={140} y={112} textAnchor="middle" fontSize={16} fill="var(--muted)">
            Plano-convex lens (R = {R} cm)
          </text>
          <text x={140} y={164} textAnchor="middle" fontSize={15} fill="var(--muted)">
            air film
          </text>
          {/* Light from the 45° plate down onto the lens */}
          <line
            x1={140}
            y1={20}
            x2={140}
            y2={168}
            stroke={`rgb(${colour})`}
            strokeWidth={4}
            opacity={0.8}
          />
          <line x1={90} y1={70} x2={190} y2={30} stroke="var(--muted)" strokeWidth={3} />
          <text x={196} y={34} fontSize={15} fill="var(--muted)">
            45° plate
          </text>
          <line
            x1={20}
            y1={50}
            x2={140}
            y2={50}
            stroke={`rgb(${colour})`}
            strokeWidth={4}
            opacity={0.8}
          />
          <text x={20} y={42} fontSize={15} fill="var(--muted)">
            from lamp
          </text>
        </g>
      </svg>
      <div className="border-t border-border p-2">
        <LabPlot
          title="D² against ring number n (a straight line; slope = 4λR/μ)"
          xLabel="Ring number n"
          yLabel="D² (mm²)"
          series={[
            {
              points: [
                [0, 0],
                [20, d2(20)],
              ],
              colour: "var(--primary)",
              label: "D² = 4nλR/μ",
            },
            {
              points: sampleNs.map((k) => [k, d2(k)] as [number, number]),
              colour: "var(--fg)",
              dots: true,
            },
          ]}
          at={{ x: n, y: d2(n), colour: "#e1306c" }}
        />
      </div>
    </WidgetShell>
  );
}

/* ---------- Hall effect ---------- */

export function HallEffect({
  carrier,
  currentMa,
  fieldT,
  thicknessMm,
  densityE21,
  caption,
}: {
  carrier: "n" | "p";
  currentMa: number;
  fieldT: number;
  thicknessMm: number;
  densityE21: number;
  caption: string;
}) {
  const [type, setType] = useState(carrier);
  const [I, setI] = useState(currentMa);
  const [B, setB] = useState(fieldT);
  const [t, setT] = useState(thicknessMm);
  const [playing, setPlaying] = useState(true);
  const [clock, setClock] = useState(0);
  useFrames(playing, (dt) => setClock((c) => c + dt));
  const n = densityE21 * 1e21;
  const vh = hallVoltage(I / 1000, B, t / 1000, n);
  const rh = hallCoefficient(n, type);
  // Electrons (n-type) gather on the top face here, holes (p-type) too: the sign of V_H shows which.
  const sign = type === "n" ? -1 : 1;
  const H = 340;
  const slab = { x: 120, y: 90, w: 380, h: 120 };
  const deflect = Math.min(1, B * (I / 10) * 2.2);
  const carriers = Array.from({ length: 14 }, (_, k) => {
    const lane = (k % 5) / 4;
    const speed = 30 + I * 9;
    // Electrons drift against the current (right to left), holes with it.
    const travel = ((clock * speed + k * 53) % slab.w) / slab.w;
    const along = type === "n" ? 1 - travel : travel;
    const y0 = slab.y + 18 + lane * (slab.h - 36);
    const y = y0 - deflect * travel * (y0 - slab.y - 10);
    return { x: slab.x + along * slab.w, y };
  });
  const piled = Math.round(Math.min(9, (Math.abs(vh) * 1000) / 4));
  const needle = Math.max(-1, Math.min(1, (sign * vh * 1000) / 60));
  const curveI = [0, 2, 4, 6, 8, 10];
  return (
    <WidgetShell
      title="Hall effect"
      caption={caption}
      readouts={
        <>
          <Readout label="Hall voltage V_H" value={`${(sign * vh * 1000).toFixed(2)} mV`} />
          <Readout label="Hall coefficient R_H" value={`${rh.toExponential(2)} m³/C`} />
          <Readout
            label="Carriers"
            value={type === "n" ? "electrons (n-type)" : "holes (p-type)"}
          />
          <Readout label="Carrier density n" value={`${fmt(n, 2)} m⁻³`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Current I"
            value={I}
            min={0.5}
            max={10}
            step={0.1}
            unit="mA"
            onChange={setI}
          />
          <Slider
            label="Magnetic field B"
            value={B}
            min={0.05}
            max={1}
            step={0.01}
            unit="T"
            onChange={setB}
          />
          <Slider
            label="Thickness t"
            value={t}
            min={0.2}
            max={2}
            step={0.05}
            unit="mm"
            onChange={setT}
          />
          <Choice
            options={["n", "p"] as const}
            value={type}
            onChange={setType}
            labels={{ n: "n-type (electrons)", p: "p-type (holes)" }}
          />
          <WidgetButton onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause the carriers" : "Move the carriers"}
          </WidgetButton>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Hall voltage ${(sign * vh * 1000).toFixed(2)} millivolts`}
      >
        {/* Field into the page, shown as crosses behind the slab */}
        {Array.from({ length: 7 }, (_, i) =>
          Array.from({ length: 3 }, (_, j) => (
            <text
              key={`${i}-${j}`}
              x={110 + i * 66}
              y={66 + j * 110}
              fontSize={20}
              fill="#3b82f6"
              opacity={0.25 + B * 0.6}
              textAnchor="middle"
            >
              ⊗
            </text>
          )),
        )}
        <text x={20} y={26} fontSize={16} fontWeight={700} fill="#3b82f6">
          B = {B.toFixed(2)} T (into the page)
        </text>
        {/* Slab */}
        <rect
          x={slab.x + 10}
          y={slab.y - 10}
          width={slab.w}
          height={slab.h}
          rx={6}
          fill="#cbd5e1"
          opacity={0.6}
        />
        <rect
          x={slab.x}
          y={slab.y}
          width={slab.w}
          height={slab.h}
          rx={6}
          fill={type === "n" ? "#dbeafe" : "#fde68a"}
          stroke="var(--fg)"
          strokeWidth={1.5}
        />
        <text
          x={slab.x}
          y={slab.y + slab.h + 26}
          textAnchor="start"
          fontSize={16}
          fill="var(--muted)"
        >
          Semiconductor slab, thickness {t} mm
        </text>
        {/* Charges piling up on the top and bottom faces */}
        {Array.from({ length: piled }, (_, k) => {
          const x = slab.x + 30 + k * 38;
          const topCharge = type === "n" ? "−" : "+";
          const bottomCharge = type === "n" ? "+" : "−";
          return (
            <g key={k} fontSize={20} fontWeight={700} textAnchor="middle">
              <text x={x} y={slab.y + 16} fill={topCharge === "−" ? "#2563eb" : "#dc2626"}>
                {topCharge}
              </text>
              <text
                x={x}
                y={slab.y + slab.h - 4}
                fill={bottomCharge === "−" ? "#2563eb" : "#dc2626"}
              >
                {bottomCharge}
              </text>
            </g>
          );
        })}
        {carriers.map((c, k) => (
          <g key={k}>
            <circle cx={c.x} cy={c.y} r={7} fill={type === "n" ? "#2563eb" : "#dc2626"} />
            <text
              x={c.x}
              y={c.y + 4}
              textAnchor="middle"
              fontSize={15}
              fontWeight={700}
              fill="#fff"
            >
              {type === "n" ? "−" : "+"}
            </text>
          </g>
        ))}
        {/* Current leads */}
        <line
          x1={40}
          y1={slab.y + slab.h / 2}
          x2={slab.x}
          y2={slab.y + slab.h / 2}
          stroke="#e08a00"
          strokeWidth={4}
        />
        <line
          x1={slab.x + slab.w}
          y1={slab.y + slab.h / 2}
          x2={W - 30}
          y2={slab.y + slab.h / 2}
          stroke="#e08a00"
          strokeWidth={4}
        />
        <path
          d={`M${W - 44} ${slab.y + slab.h / 2 - 7} L${W - 30} ${slab.y + slab.h / 2} L${W - 44} ${slab.y + slab.h / 2 + 7}`}
          fill="none"
          stroke="#e08a00"
          strokeWidth={3}
        />
        <text x={44} y={slab.y + slab.h / 2 - 10} fontSize={16} fontWeight={700} fill="#e08a00">
          I = {I.toFixed(1)} mA →
        </text>
        {/* Hall voltmeter across top and bottom */}
        <line
          x1={slab.x + slab.w / 2}
          y1={slab.y}
          x2={slab.x + slab.w / 2}
          y2={slab.y - 30}
          stroke="var(--fg)"
          strokeWidth={2}
        />
        <line
          x1={slab.x + slab.w / 2}
          y1={slab.y + slab.h}
          x2={slab.x + slab.w / 2}
          y2={H - 30}
          stroke="var(--fg)"
          strokeWidth={2}
        />
        <g transform={`translate(${slab.x + slab.w / 2 + 170} ${H - 46})`}>
          <rect
            x={-46}
            y={-30}
            width={92}
            height={56}
            rx={8}
            fill="var(--surface)"
            stroke="var(--fg)"
            strokeWidth={1.5}
          />
          <path d="M-34 10 A36 36 0 0 1 34 10" fill="none" stroke="var(--border)" strokeWidth={2} />
          <line
            x1={0}
            y1={14}
            x2={Math.sin(needle * 1.1) * 32}
            y2={14 - Math.cos(needle * 1.1) * 32}
            stroke="#dc2626"
            strokeWidth={2.5}
          />
          <text x={0} y={22} textAnchor="middle" fontSize={14} fill="var(--muted)">
            mV
          </text>
        </g>
        <line
          x1={slab.x + slab.w / 2}
          y1={H - 30}
          x2={slab.x + slab.w / 2 + 124}
          y2={H - 30}
          stroke="var(--fg)"
          strokeWidth={2}
        />
        <text
          x={slab.x + slab.w / 2 + 170}
          y={H - 84}
          textAnchor="middle"
          fontSize={16}
          fontWeight={700}
          fill="var(--fg)"
        >
          V_H
        </text>
      </svg>
      <div className="border-t border-border p-2">
        <LabPlot
          title="Hall voltage against current (straight line; slope = R_H·B/t)"
          xLabel="Current I (mA)"
          yLabel="V_H (mV)"
          series={[
            {
              points: curveI.map(
                (i) => [i, hallVoltage(i / 1000, B, t / 1000, n) * 1000] as [number, number],
              ),
              colour: "var(--primary)",
              label: `at B = ${B.toFixed(2)} T`,
            },
          ]}
          at={{ x: I, y: vh * 1000, colour: "#e1306c" }}
        />
      </div>
    </WidgetShell>
  );
}

/* ---------- B-H hysteresis loop ---------- */

const MATERIALS = {
  "soft-iron": { label: "Soft iron", bs: 1.6, br: 1.0, hc: 80 },
  steel: { label: "Hard steel", bs: 1.4, br: 1.0, hc: 4000 },
  ferrite: { label: "Ferrite", bs: 0.45, br: 0.25, hc: 300 },
} as const;
type Material = keyof typeof MATERIALS;

export function Hysteresis({ material, caption }: { material: Material; caption: string }) {
  const [mat, setMat] = useState<Material>(material);
  const { bs, br, hc, label } = MATERIALS[mat];
  const loop = hysteresisLoop(bs, br, hc);
  const a = hc / Math.atanh(br / bs);
  const hMax = hc + 3 * a;
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  useFrames(playing, (dt) => setPhase((p) => (p + dt * 0.9) % (2 * Math.PI)));
  const h = hMax * Math.sin(phase);
  const rising = Math.cos(phase) >= 0;
  const b = rising ? loop.rising(h) : loop.falling(h);
  const hs = Array.from({ length: 121 }, (_, i) => -hMax + (2 * hMax * i) / 120);
  const loss = loopArea(bs, br, hc, hMax);
  const m = b / bs;
  return (
    <WidgetShell
      title={`B-H loop: ${label}`}
      caption={caption}
      readouts={
        <>
          <Readout label="H now" value={siFormat(h, "A/m")} />
          <Readout label="B now" value={`${b.toFixed(2)} T`} />
          <Readout label="Retentivity Br" value={`${br} T`} />
          <Readout label="Coercivity Hc" value={siFormat(hc, "A/m")} />
          <Readout label="Energy lost per cycle" value={siFormat(loss, "J/m³")} />
        </>
      }
      controls={
        <>
          <Choice
            options={Object.keys(MATERIALS) as Material[]}
            value={mat}
            onChange={setMat}
            labels={Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, v.label]))}
          />
          <Slider
            label="Magnetising field H (drag to sweep)"
            value={Math.round((h / hMax) * 100)}
            min={-100}
            max={100}
            step={1}
            unit="% of max"
            onChange={(v) => {
              setPlaying(false);
              // Keep the branch the field is moving along.
              const target = Math.asin(v / 100);
              setPhase(rising ? (target + 2 * Math.PI) % (2 * Math.PI) : Math.PI - target);
            }}
          />
          <WidgetButton onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause the AC field" : "Run the AC field"}
          </WidgetButton>
        </>
      }
    >
      <div className="grid gap-0 sm:grid-cols-[1fr_1.4fr]">
        <svg
          viewBox="0 0 300 230"
          className="block w-full"
          role="img"
          aria-label={`Magnetic domains, ${Math.round(Math.abs(m) * 100)}% aligned`}
        >
          <text x={150} y={22} textAnchor="middle" fontSize={18} fontWeight={700} fill="var(--fg)">
            Domains in the sample
          </text>
          <rect
            x={30}
            y={40}
            width={240}
            height={140}
            rx={10}
            fill="var(--surface-2)"
            stroke="var(--border)"
          />
          {Array.from({ length: 18 }, (_, k) => {
            const col = k % 6;
            const row = Math.floor(k / 6);
            const base = ((k * 137) % 360) * (Math.PI / 180);
            const target = m >= 0 ? 0 : Math.PI;
            const w = Math.min(1, Math.abs(m) ** 0.7);
            const ang = base + (((target - base + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * w;
            const x = 55 + col * 38;
            const y = 70 + row * 42;
            return (
              <g key={k} transform={`translate(${x} ${y}) rotate(${(ang * 180) / Math.PI})`}>
                <line
                  x1={-12}
                  y1={0}
                  x2={10}
                  y2={0}
                  stroke={w > 0.8 ? "var(--primary)" : "var(--fg)"}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <path
                  d="M6 -5 L13 0 L6 5"
                  fill="none"
                  stroke={w > 0.8 ? "var(--primary)" : "var(--fg)"}
                  strokeWidth={2.5}
                />
              </g>
            );
          })}
          <text x={150} y={205} textAnchor="middle" fontSize={16} fill="var(--muted)">
            H {h >= 0 ? "→" : "←"} {siFormat(Math.abs(h), "A/m")}
          </text>
        </svg>
        <div className="border-t border-border p-2 sm:border-t-0 sm:border-l">
          <LabPlot
            xLabel="H (A/m)"
            yLabel="B (T)"
            xRange={[-hMax, hMax]}
            yRange={[-bs * 1.05, bs * 1.05]}
            series={[
              {
                points: hs.map((x) => [x, loop.rising(x)] as [number, number]),
                colour: "var(--primary)",
                label: "H increasing",
              },
              {
                points: hs.map((x) => [x, loop.falling(x)] as [number, number]),
                colour: "#e08a00",
                label: "H decreasing",
              },
              {
                points: [
                  [0, br],
                  [0, -br],
                  [hc, 0],
                  [-hc, 0],
                ],
                colour: "var(--fg)",
                dots: true,
              },
            ]}
            at={{ x: h, y: b, colour: "#e1306c" }}
          />
        </div>
      </div>
    </WidgetShell>
  );
}

/* ---------- Thomson's e/m tube ---------- */

export function EmThomson({
  anodeV,
  plateV,
  plateGapMm,
  fieldMt,
  caption,
}: {
  anodeV: number;
  plateV: number;
  plateGapMm: number;
  fieldMt: number;
  caption: string;
}) {
  const [Va, setVa] = useState(anodeV);
  const [Vp, setVp] = useState(plateV);
  const [gap, setGap] = useState(plateGapMm);
  const [Bm, setB] = useState(fieldMt);
  const L = 0.05;
  const S = 0.15;
  const E = Vp / (gap / 1000);
  const B = Bm / 1000;
  const beam = thomsonBeam(Va, E, B, L, S);
  const H = 280;
  const x0 = 120;
  const cy = 140;
  const sx = (x: number) => x0 + (x / (L + S)) * 440;
  const sy = (y: number) => cy - y * 1800; // exaggerated a little so mm show
  // The beam stops where it hits a plate (inside the plates) or the screen's edge.
  let hit = false;
  const pts: [number, number][] = [];
  for (const [x, y] of beam.points) {
    if (x <= L && Math.abs(y) > gap / 2000) {
      hit = true;
      break;
    }
    pts.push([sx(x), Math.max(30, Math.min(H - 30, sy(y)))]);
  }
  const spotOnScreen = !hit && Math.abs(sy(beam.spot) - cy) < cy - 30;
  const ratio = eOverM(Va, E, B);
  const vNeeded = E / (B || 1e-12);
  return (
    <WidgetShell
      title="e/m by Thomson's method"
      caption={caption}
      readouts={
        <>
          <Readout label="Electric field E = V/d" value={siFormat(E, "V/m")} />
          <Readout label="Beam speed v (from V)" value={siFormat(beam.v, "m/s")} />
          <Readout
            label="Spot deflection"
            value={hit ? "beam hits a plate" : `${(beam.spot * 1000).toFixed(1)} mm`}
          />
          <Readout
            label="e/m = E²/(2VB²)"
            value={
              beam.balanced && B > 0 ? `${ratio.toExponential(3)} C/kg` : "balance the beam first"
            }
          />
        </>
      }
      controls={
        <>
          <Slider
            label="Accelerating voltage V"
            value={Va}
            min={500}
            max={3000}
            step={10}
            unit="V"
            onChange={setVa}
          />
          <Slider
            label="Plate voltage"
            value={Vp}
            min={0}
            max={1000}
            step={5}
            unit="V"
            onChange={setVp}
          />
          <Slider
            label="Magnetic field B (from the coils)"
            value={Bm}
            min={0}
            max={3}
            step={0.01}
            unit="mT"
            onChange={setB}
          />
          <Slider
            label="Plate gap d"
            value={gap}
            min={5}
            max={30}
            step={1}
            unit="mm"
            onChange={setGap}
          />
          <WidgetButton
            onClick={() => setB(Math.min(3, Math.max(0, Math.round((E / beam.v) * 1e5) / 100)))}
          >
            Balance the beam (set B = E/v)
          </WidgetButton>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={
          beam.balanced
            ? "Beam undeflected: forces balance"
            : `Beam deflected ${(beam.spot * 1000).toFixed(1)} mm`
        }
      >
        <defs>
          <filter id="em-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {/* Glass tube */}
        <path
          d={`M30 ${cy - 40} Q30 ${cy - 60} 70 ${cy - 60} L560 ${cy - 110} Q600 ${cy - 112} 600 ${cy - 70} L600 ${cy + 70} Q600 ${cy + 112} 560 ${cy + 110} L70 ${cy + 60} Q30 ${cy + 60} 30 ${cy + 40} Z`}
          fill="var(--surface-2)"
          stroke="var(--border)"
          strokeWidth={2}
        />
        {/* Gun */}
        <rect x={40} y={cy - 12} width={60} height={24} rx={4} fill="#64748b" />
        <text x={70} y={cy + 36} textAnchor="middle" fontSize={16} fill="var(--muted)">
          gun
        </text>
        {/* Magnetic field region */}
        <circle
          cx={sx(L / 2)}
          cy={cy}
          r={70}
          fill="#3b82f6"
          opacity={0.06 + Bm * 0.05}
          stroke="#3b82f6"
          strokeDasharray="4 4"
        />
        {Bm > 0 &&
          [-1, 0, 1].flatMap((i) =>
            [-1, 1].map((j) => (
              <text
                key={`${i}${j}`}
                x={sx(L / 2) + i * 34}
                y={cy + j * 46 + 5}
                textAnchor="middle"
                fontSize={18}
                fill="#3b82f6"
              >
                ⊗
              </text>
            )),
          )}
        {/* Plates */}
        <rect
          x={sx(0)}
          y={cy - (gap / 2) * 1.8 - 8}
          width={sx(L) - sx(0)}
          height={8}
          fill="#dc2626"
        />
        <rect x={sx(0)} y={cy + (gap / 2) * 1.8} width={sx(L) - sx(0)} height={8} fill="#2563eb" />
        <text
          x={sx(L / 2)}
          y={cy - (gap / 2) * 1.8 - 14}
          textAnchor="middle"
          fontSize={16}
          fontWeight={700}
          fill="#dc2626"
        >
          + plate
        </text>
        <text
          x={sx(L / 2)}
          y={cy + (gap / 2) * 1.8 + 24}
          textAnchor="middle"
          fontSize={16}
          fontWeight={700}
          fill="#2563eb"
        >
          − plate
        </text>
        {/* Screen */}
        <rect x={sx(L + S)} y={cy - 100} width={8} height={200} fill="#86efac" opacity={0.8} />
        <text x={sx(L + S) - 6} y={cy - 106} textAnchor="end" fontSize={16} fill="var(--muted)">
          screen
        </text>
        {/* Beam */}
        <path
          d={`M100 ${cy} ${pts.map(([x, y]) => `L${x} ${y}`).join(" ")}`}
          fill="none"
          stroke="#22c55e"
          strokeWidth={6}
          opacity={0.5}
          filter="url(#em-glow)"
        />
        <path
          d={`M100 ${cy} ${pts.map(([x, y]) => `L${x} ${y}`).join(" ")}`}
          fill="none"
          stroke="#16a34a"
          strokeWidth={2}
        />
        {spotOnScreen && (
          <circle cx={sx(L + S) + 4} cy={sy(beam.spot)} r={7} fill="#4ade80" stroke="#15803d" />
        )}
        <line
          x1={sx(L + S) - 14}
          x2={sx(L + S) + 22}
          y1={cy}
          y2={cy}
          stroke="var(--muted)"
          strokeDasharray="3 3"
        />
        <text
          x={W / 2}
          y={H - 10}
          textAnchor="middle"
          fontSize={16}
          fontWeight={600}
          fill={beam.balanced ? "var(--success, #16a34a)" : "var(--muted)"}
        >
          {beam.balanced
            ? "Balanced: eE = evB, so the beam goes straight"
            : `Speed for a straight beam: v = E/B = ${B > 0 ? siFormat(vNeeded, "m/s") : "∞ (no B)"}`}
        </text>
      </svg>
    </WidgetShell>
  );
}
