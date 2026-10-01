"use client";

import { useState } from "react";
import { parallelPlate, siFormat } from "@/visuals/physics";
import { ArrowMarker, Readout, Slider, WidgetShell } from "@/visuals/ui";

const W = 640;
const H = 260;

/** A parallel-plate capacitor: change the plates, gap, dielectric and voltage. */
export function Capacitor({
  areaCm2: initialArea,
  gapMm: initialGap,
  kappa: initialKappa,
  voltage: initialV,
  caption,
}: {
  areaCm2: number;
  gapMm: number;
  kappa: number;
  voltage: number;
  caption: string;
}) {
  const [area, setArea] = useState(initialArea);
  const [gap, setGap] = useState(initialGap);
  const [kappa, setKappa] = useState(initialKappa);
  const [volts, setVolts] = useState(initialV);
  const c = parallelPlate({ areaM2: area * 1e-4, gapM: gap * 1e-3, kappa, volts });

  // Drawing: plate length grows with area, gap with separation; line count with field strength.
  const plateLen = 80 + (area / 500) * 360;
  const gapPx = 30 + (gap / 10) * 150;
  const left = W / 2 - plateLen / 2;
  const top = H / 2 - gapPx / 2;
  const lineCount = Math.max(2, Math.min(18, Math.round(Math.log10(c.field) * 3)));

  return (
    <WidgetShell
      title="Parallel-plate capacitor"
      caption={caption}
      readouts={
        <>
          <Readout label="Capacitance C" value={siFormat(c.capacitance, "F")} />
          <Readout label="Charge Q = CV" value={siFormat(c.charge, "C")} />
          <Readout label="Field E = V/d" value={siFormat(c.field, "V/m")} />
          <Readout label="Energy ½CV²" value={siFormat(c.energy, "J")} />
        </>
      }
      controls={
        <>
          <Slider
            label="Plate area A"
            value={area}
            min={10}
            max={500}
            step={10}
            unit="cm²"
            onChange={setArea}
          />
          <Slider
            label="Gap d"
            value={gap}
            min={0.5}
            max={10}
            step={0.5}
            unit="mm"
            onChange={setGap}
          />
          <Slider
            label="Dielectric constant κ"
            value={kappa}
            min={1}
            max={10}
            step={0.5}
            unit=""
            onChange={setKappa}
          />
          <Slider
            label="Voltage V"
            value={volts}
            min={1}
            max={100}
            step={1}
            unit="V"
            onChange={setVolts}
          />
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Capacitor with capacitance ${siFormat(c.capacitance, "F")}`}
      >
        <defs>
          <ArrowMarker id="cap-arrow" color="var(--muted)" />
        </defs>
        {kappa > 1 && (
          <rect
            x={left}
            y={top}
            width={plateLen}
            height={gapPx}
            fill="var(--primary)"
            opacity={0.06 + kappa * 0.025}
          />
        )}
        {Array.from({ length: lineCount }, (_, i) => {
          const x = left + ((i + 0.5) / lineCount) * plateLen;
          return (
            <line
              key={i}
              x1={x}
              y1={top + 6}
              x2={x}
              y2={top + gapPx - 8}
              stroke="var(--muted)"
              strokeWidth="1.5"
              markerEnd="url(#cap-arrow)"
            />
          );
        })}
        <rect x={left} y={top - 10} width={plateLen} height={10} rx="2" fill="#e1306c" />
        <rect x={left} y={top + gapPx} width={plateLen} height={10} rx="2" fill="#3b82f6" />
        <text x={left - 10} y={top - 2} textAnchor="end" fill="#e1306c" fontWeight="700">
          +Q
        </text>
        <text x={left - 10} y={top + gapPx + 10} textAnchor="end" fill="#3b82f6" fontWeight="700">
          −Q
        </text>
        <text x={left + plateLen + 12} y={H / 2 + 5} fill="var(--muted)" fontSize="14">
          d = {gap} mm
        </text>
        {kappa > 1 && (
          <text
            x={W / 2}
            y={top + gapPx / 2 + 5}
            textAnchor="middle"
            fill="var(--primary)"
            fontSize="13"
            fontWeight="600"
          >
            dielectric κ = {kappa}
          </text>
        )}
      </svg>
    </WidgetShell>
  );
}
