"use client";

import { useState } from "react";
import { Readout, Slider, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import { Choice, StepNav, TraceTable } from "@/visuals/wave2/ui2";
import {
  amplifierGainDb,
  chipSelect,
  dacOutput,
  diffAmp,
  dynamicPower,
  inverterVout,
  loadPower,
  nmosCurrent,
  physicalAddress,
  polarisationKind,
  reflectionCoefficient,
  runAccumulator,
  sarAdc,
  seriesRlc,
  skinDepth,
  standingWaveVoltage,
  vswr,
  waveguideCutoff,
  type Instr,
} from "@/visuals/wave2/eceModels";

const fmt = (v: number, d = 3) => (Number.isFinite(v) ? Number(v.toPrecision(d)).toString() : "∞");

/** Series RLC resonance: current against frequency. */
export function RlcResonance({
  resistance,
  inductanceMh,
  capacitanceUf,
  caption,
}: {
  resistance: number;
  inductanceMh: number;
  capacitanceUf: number;
  caption: string;
}) {
  const [r, setR] = useState(resistance);
  const l = inductanceMh / 1000;
  const c = capacitanceUf / 1e6;
  const { f0, q, bandwidth } = seriesRlc(r, l, c, 1);
  const scale = makeGraphScale({ xMin: 0, xMax: 2.5 * f0, yMin: 0, yMax: 1.1 / r });
  return (
    <WidgetShell
      title="Series RLC resonance"
      caption={caption}
      readouts={
        <>
          <Readout label="f₀ = 1/(2π√LC)" value={`${fmt(f0)} Hz`} />
          <Readout label="Q = (1/R)√(L/C)" value={fmt(q)} />
          <Readout label="Bandwidth R/(2πL)" value={`${fmt(bandwidth)} Hz`} />
          <Readout label="Current at f₀ (1 V)" value={`${fmt(1000 / r)} mA`} />
        </>
      }
      controls={
        <Slider
          label="Resistance R"
          value={r}
          min={1}
          max={200}
          step={1}
          unit="Ω"
          onChange={setR}
        />
      }
    >
      <Graph scale={scale} label={`Current peaks at ${fmt(f0)} hertz`}>
        <Curve scale={scale} f={(f) => (f > 0 ? seriesRlc(r, l, c, f).current : 0)} />
        <line
          x1={scale.sx(f0)}
          x2={scale.sx(f0)}
          y1={scale.sy(0)}
          y2={scale.sy(1.1 / r)}
          stroke="#e1306c"
          strokeDasharray="5 4"
        />
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "current (A) against frequency (Hz)" },
          { color: "#e1306c", label: "resonance f₀", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

/** Maximum power transfer: power in the load against load resistance. */
export function MaxPowerTransfer({
  sourceV,
  sourceR,
  caption,
}: {
  sourceV: number;
  sourceR: number;
  caption: string;
}) {
  const [rl, setRl] = useState(sourceR / 2);
  const pMax = loadPower(sourceV, sourceR, sourceR);
  const scale = makeGraphScale({ xMin: 0, xMax: 4 * sourceR, yMin: 0, yMax: pMax * 1.15 });
  const p = loadPower(sourceV, sourceR, rl);
  return (
    <WidgetShell
      title="Maximum power transfer"
      caption={caption}
      readouts={
        <>
          <Readout label="Power in the load" value={`${fmt(p)} W`} />
          <Readout label="Maximum (at R_L = R_s)" value={`${fmt(pMax)} W = V²/4R_s`} />
          <Readout label="Efficiency" value={`${fmt((100 * rl) / (rl + sourceR))} %`} />
        </>
      }
      controls={
        <Slider
          label="Load resistance R_L"
          value={rl}
          min={0.1}
          max={4 * sourceR}
          step={sourceR / 50}
          unit="Ω"
          format={(v) => v.toFixed(1)}
          onChange={setRl}
        />
      }
    >
      <Graph scale={scale} label="Load power against load resistance">
        <Curve scale={scale} f={(x) => loadPower(sourceV, sourceR, x)} />
        <circle cx={scale.sx(rl)} cy={scale.sy(p)} r={7} fill="#e1306c" />
        <line
          x1={scale.sx(sourceR)}
          x2={scale.sx(sourceR)}
          y1={scale.sy(0)}
          y2={scale.sy(pMax * 1.15)}
          stroke="#10b981"
          strokeDasharray="5 4"
        />
      </Graph>
      <Legend
        items={[
          {
            color: "#10b981",
            label: "R_L = R_s (maximum power, but only 50% efficiency)",
            dashed: true,
          },
        ]}
      />
    </WidgetShell>
  );
}

/** Amplifier frequency response (Bode magnitude) with lower and upper cut-offs. */
export function AmplifierBode({
  midGainDb,
  lowCutHz,
  highCutHz,
  caption,
}: {
  midGainDb: number;
  lowCutHz: number;
  highCutHz: number;
  caption: string;
}) {
  const [fl, setFl] = useState(lowCutHz);
  const [fh, setFh] = useState(highCutHz);
  const scale = makeGraphScale({ xMin: 0, xMax: 7, yMin: midGainDb - 40, yMax: midGainDb + 5 });
  return (
    <WidgetShell
      title="Amplifier frequency response"
      caption={caption}
      readouts={
        <>
          <Readout label="Mid-band gain" value={`${midGainDb} dB`} />
          <Readout label="Bandwidth f_H − f_L" value={`${fmt(fh - fl)} Hz`} />
          <Readout label="Gain at the cut-offs" value={`${midGainDb - 3} dB (−3 dB)`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Lower cut-off f_L"
            value={fl}
            min={1}
            max={1000}
            step={1}
            unit="Hz"
            onChange={setFl}
          />
          <Slider
            label="Upper cut-off f_H"
            value={fh}
            min={2000}
            max={1000000}
            step={1000}
            unit="Hz"
            onChange={setFh}
          />
        </>
      }
    >
      <Graph scale={scale} label="Gain in dB against log frequency">
        <Curve scale={scale} f={(lg) => amplifierGainDb(10 ** lg, midGainDb, fl, fh)} />
      </Graph>
      <Legend
        items={[{ color: "var(--primary)", label: "gain (dB) against log₁₀ f (1 Hz … 10 MHz)" }]}
      />
    </WidgetShell>
  );
}

/** Differential amplifier: differential and common-mode gain, CMRR. */
export function DiffAmp({
  ad: a0,
  acm: c0,
  caption,
}: {
  ad: number;
  acm: number;
  caption: string;
}) {
  const [v1, setV1] = useState(1.01);
  const [v2, setV2] = useState(1.0);
  const r = diffAmp(v1, v2, a0, c0);
  return (
    <WidgetShell
      title="Differential amplifier"
      caption={caption}
      readouts={
        <>
          <Readout label="v_d = v₁ − v₂" value={`${fmt(v1 - v2)} V`} />
          <Readout label="v_cm = (v₁ + v₂)/2" value={`${fmt((v1 + v2) / 2)} V`} />
          <Readout label="Output A_d·v_d + A_cm·v_cm" value={`${fmt(r.out)} V`} />
          <Readout label="CMRR" value={`${fmt(r.cmrrDb)} dB`} />
        </>
      }
      controls={
        <>
          <Slider
            label="v₁"
            value={v1}
            min={0}
            max={2}
            step={0.005}
            unit="V"
            format={(v) => v.toFixed(3)}
            onChange={setV1}
          />
          <Slider
            label="v₂"
            value={v2}
            min={0}
            max={2}
            step={0.005}
            unit="V"
            format={(v) => v.toFixed(3)}
            onChange={setV2}
          />
        </>
      }
    >
      <p className="p-3 text-sm text-muted">
        A_d = {a0}, A_cm = {c0}. A good differential amplifier amplifies the difference and ignores
        what both inputs share (noise picked up on both wires).
      </p>
    </WidgetShell>
  );
}

/** DAC output and successive-approximation ADC conversion. */
export function AdcDac({
  bits: b0,
  vref,
  vin: v0,
  caption,
}: {
  bits: number;
  vref: number;
  vin: number;
  caption: string;
}) {
  const [bits, setBits] = useState(b0);
  const [vin, setVin] = useState(v0);
  const r = sarAdc(vin, bits, vref);
  return (
    <WidgetShell
      title={`${bits}-bit successive-approximation ADC`}
      caption={caption}
      readouts={
        <>
          <Readout label="Code" value={`${r.code} (${r.code.toString(2).padStart(bits, "0")})`} />
          <Readout label="DAC of that code" value={`${fmt(dacOutput(r.code, bits, vref), 4)} V`} />
          <Readout label="Resolution (1 LSB)" value={`${fmt(vref / 2 ** bits, 4)} V`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Input voltage"
            value={vin}
            min={0}
            max={vref}
            step={vref / 500}
            unit="V"
            format={(v) => v.toFixed(3)}
            onChange={setVin}
          />
          <Slider label="Bits" value={bits} min={2} max={10} step={1} unit="" onChange={setBits} />
        </>
      }
    >
      <TraceTable
        head={["bit tried", "trial code", "DAC voltage", "keep?"]}
        rows={r.trials.map((t) => [
          t.bit,
          t.trial.toString(2).padStart(bits, "0"),
          fmt(dacOutput(t.trial, bits, vref), 4),
          t.keep ? "1 (≤ input)" : "0 (too big)",
        ])}
      />
    </WidgetShell>
  );
}

/** 8086 segment:offset to physical address. */
export function SegmentAddress({
  segment,
  offset,
  caption,
}: {
  segment: number;
  offset: number;
  caption: string;
}) {
  const [seg, setSeg] = useState(segment);
  const [off, setOff] = useState(offset);
  const hex = (v: number, d: number) => v.toString(16).toUpperCase().padStart(d, "0");
  return (
    <WidgetShell
      title="8086 memory segmentation"
      caption={caption}
      readouts={
        <>
          <Readout label="Logical address" value={`${hex(seg, 4)}:${hex(off, 4)}`} />
          <Readout label="Segment × 16" value={`${hex(seg << 4, 5)}H`} />
          <Readout label="Physical address" value={`${hex(physicalAddress(seg, off), 5)}H`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Segment (hex)"
            value={seg}
            min={0}
            max={0xffff}
            step={0x10}
            unit=""
            format={(v) => `${hex(v, 4)}H`}
            onChange={setSeg}
          />
          <Slider
            label="Offset (hex)"
            value={off}
            min={0}
            max={0xffff}
            step={1}
            unit=""
            format={(v) => `${hex(v, 4)}H`}
            onChange={setOff}
          />
        </>
      }
    >
      <p className="p-3 font-mono text-sm">
        {hex(seg, 4)}0 + {hex(off, 4)} = {hex(physicalAddress(seg, off), 5)} (20-bit address, 1 MB
        space)
      </p>
    </WidgetShell>
  );
}

/** Memory chip selection by address decoding. */
export function AddressDecoder({
  chipKb,
  chips,
  caption,
}: {
  chipKb: number;
  chips: number;
  caption: string;
}) {
  const bytes = chipKb * 1024;
  const [addr, setAddr] = useState(Math.floor(bytes * 1.5));
  const r = chipSelect(addr, bytes, chips);
  const hex = (v: number) => v.toString(16).toUpperCase();
  return (
    <WidgetShell
      title={`Address decoding: ${chips} × ${chipKb} KB chips`}
      caption={caption}
      readouts={
        <>
          <Readout label="Address" value={`${hex(addr)}H`} />
          <Readout
            label="Chip selected"
            value={r.chip >= 0 ? `chip ${r.chip}` : "none (unmapped)"}
          />
          <Readout label="Address inside the chip" value={`${hex(r.offset)}H`} />
          <Readout label="Address lines to each chip" value={String(Math.log2(bytes))} />
        </>
      }
      controls={
        <Slider
          label="Address"
          value={addr}
          min={0}
          max={bytes * (chips + 1) - 1}
          step={64}
          unit=""
          format={(v) => `${hex(v)}H`}
          onChange={setAddr}
        />
      }
    >
      <div className="flex gap-1 p-3">
        {Array.from({ length: chips }, (_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-md border p-2 text-center text-xs ${i === r.chip ? "border-[#e1306c] bg-[#e1306c]/15 font-bold" : "border-border"}`}
          >
            chip {i}
            <span className="block font-mono text-[10px] text-muted">
              {hex(i * bytes)}–{hex((i + 1) * bytes - 1)}H
            </span>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

const PROGRAMS: Record<string, { label: string; code: Instr[] }> = {
  multiply: {
    label: "Multiply 5 × 3 by repeated addition",
    code: [
      { op: "MVI", reg: "A", value: 0 },
      { op: "MVI", reg: "B", value: 5 },
      { op: "MVI", reg: "C", value: 3 },
      { op: "ADD", reg: "B" },
      { op: "DCR", reg: "C" },
      { op: "JNZ", target: 3 },
      { op: "HLT" },
    ],
  },
  countdown: {
    label: "Count down from 4",
    code: [
      { op: "MVI", reg: "C", value: 4 },
      { op: "DCR", reg: "C" },
      { op: "JNZ", target: 1 },
      { op: "HLT" },
    ],
  },
};

/** A tiny 8085-style accumulator machine, instruction by instruction. */
export function AccumulatorMachine({ program, caption }: { program: string; caption: string }) {
  const [p, setP] = useState(program in PROGRAMS ? program : "multiply");
  const r = runAccumulator(PROGRAMS[p].code);
  const [i, setI] = useState(0);
  const k = Math.min(i, r.trace.length - 1);
  const s = r.trace[k];
  return (
    <WidgetShell
      title="Accumulator machine (8085 style)"
      caption={caption}
      readouts={
        <>
          <Readout label="Executed" value={`${s.pc}: ${s.instr}`} />
          <Readout label="A  B  C" value={`${s.A}  ${s.B}  ${s.C}`} />
          <Readout label="Zero flag" value={s.Z ? "1" : "0"} />
        </>
      }
      controls={
        <>
          <Choice
            options={Object.keys(PROGRAMS)}
            value={p}
            onChange={(v) => {
              setP(v);
              setI(0);
            }}
            labels={Object.fromEntries(Object.entries(PROGRAMS).map(([key, v]) => [key, v.label]))}
          />
          <StepNav index={k} count={r.trace.length} onChange={setI} />
        </>
      }
    >
      <ol className="p-3 font-mono text-sm" start={0}>
        {PROGRAMS[p].code.map((ins, j) => (
          <li key={j} className={j === s.pc ? "font-bold text-primary" : ""}>
            {j}: {ins.op} {ins.reg ?? ""}
            {ins.value !== undefined ? `, ${ins.value}` : ""}
            {ins.target !== undefined ? ` ${ins.target}` : ""}
          </li>
        ))}
      </ol>
    </WidgetShell>
  );
}

/** Standing waves on a transmission line for a given load. */
export function TransmissionLine({
  loadOhms,
  z0,
  caption,
}: {
  loadOhms: number;
  z0: number;
  caption: string;
}) {
  const [rl, setRl] = useState(loadOhms);
  const [xl, setXl] = useState(0);
  const g = reflectionCoefficient({ re: rl, im: xl }, z0);
  const mag = Math.hypot(g.re, g.im);
  const scale = makeGraphScale({ xMin: 0, xMax: 1, yMin: 0, yMax: 2.1 });
  return (
    <WidgetShell
      title={`Transmission line (Z₀ = ${z0} Ω)`}
      caption={caption}
      readouts={
        <>
          <Readout label="|Γ|" value={fmt(mag)} />
          <Readout label="VSWR" value={fmt(vswr(g))} />
          <Readout label="Power reflected" value={`${fmt(100 * mag * mag)} %`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Load resistance R_L"
            value={rl}
            min={0}
            max={300}
            step={1}
            unit="Ω"
            onChange={setRl}
          />
          <Slider
            label="Load reactance X_L"
            value={xl}
            min={-200}
            max={200}
            step={1}
            unit="Ω"
            onChange={setXl}
          />
        </>
      }
    >
      <Graph scale={scale} label="Voltage magnitude along the line">
        <Curve scale={scale} f={(d) => standingWaveVoltage(g, d)} />
        <line
          x1={scale.sx(0)}
          x2={scale.sx(1)}
          y1={scale.sy(1)}
          y2={scale.sy(1)}
          stroke="var(--muted)"
          strokeDasharray="5 4"
        />
      </Graph>
      <Legend
        items={[
          {
            color: "var(--primary)",
            label: "|V|/|V⁺| against distance from the load (wavelengths)",
          },
          { color: "var(--muted)", label: "matched line (flat)", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

/** Polarisation: the path traced by the E-field tip. */
export function PolarisationWidget({
  ex: e0,
  ey: y0,
  phaseDeg,
  caption,
}: {
  ex: number;
  ey: number;
  phaseDeg: number;
  caption: string;
}) {
  const [ex, setEx] = useState(e0);
  const [ey, setEy] = useState(y0);
  const [d, setD] = useState(phaseDeg);
  const scale = makeGraphScale({ xMin: -1.6, xMax: 1.6, yMin: -1.2, yMax: 1.2 });
  const pts = Array.from({ length: 121 }, (_, i) => {
    const t = (2 * Math.PI * i) / 120;
    return `${scale.sx(ex * Math.cos(t))},${scale.sy(ey * Math.cos(t + (d * Math.PI) / 180))}`;
  });
  return (
    <WidgetShell
      title={`${polarisationKind(ex, ey, d)} polarisation`}
      caption={caption}
      readouts={<Readout label="Kind" value={polarisationKind(ex, ey, d)} />}
      controls={
        <>
          <Slider
            label="Eₓ amplitude"
            value={ex}
            min={0}
            max={1}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setEx}
          />
          <Slider
            label="E_y amplitude"
            value={ey}
            min={0}
            max={1}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setEy}
          />
          <Slider
            label="Phase difference δ"
            value={d}
            min={0}
            max={180}
            step={5}
            unit="°"
            onChange={setD}
          />
        </>
      }
    >
      <Graph scale={scale} label={`Tip of E traces a ${polarisationKind(ex, ey, d)} path`}>
        <polyline points={pts.join(" ")} fill="none" stroke="var(--primary)" strokeWidth={3} />
      </Graph>
    </WidgetShell>
  );
}

/** Rectangular waveguide cut-off frequencies. */
export function WaveguideCutoff({
  widthMm,
  heightMm,
  caption,
}: {
  widthMm: number;
  heightMm: number;
  caption: string;
}) {
  const [a, setA] = useState(widthMm);
  const [b, setB] = useState(heightMm);
  const modes = [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [0, 2],
  ]
    .map(([m, n]) => ({ m, n, fc: waveguideCutoff(a / 1000, b / 1000, m, n) / 1e9 }))
    .sort((x, y) => x.fc - y.fc);
  return (
    <WidgetShell
      title={`Rectangular waveguide ${a} × ${b} mm`}
      caption={caption}
      readouts={
        <>
          <Readout
            label="Dominant mode"
            value={`TE${modes[0].m}${modes[0].n} at ${fmt(modes[0].fc)} GHz`}
          />
          <Readout
            label="Single-mode band"
            value={`${fmt(modes[0].fc)} – ${fmt(modes[1].fc)} GHz`}
          />
        </>
      }
      controls={
        <>
          <Slider
            label="Broad wall a"
            value={a}
            min={5}
            max={60}
            step={0.5}
            unit="mm"
            onChange={setA}
          />
          <Slider
            label="Narrow wall b"
            value={b}
            min={2}
            max={30}
            step={0.5}
            unit="mm"
            onChange={setB}
          />
        </>
      }
    >
      <TraceTable
        head={["mode", "cut-off (GHz)"]}
        rows={modes.map((md) => [
          `TE${md.m}${md.n}${md.m && md.n ? " / TM" + md.m + md.n : ""}`,
          fmt(md.fc),
        ])}
      />
    </WidgetShell>
  );
}

/** Skin depth against frequency for common conductors. */
export function SkinDepth({ caption }: { caption: string }) {
  const [metal, setMetal] = useState<"copper" | "aluminium" | "iron">("copper");
  const props = {
    copper: { sigma: 5.8e7, mu: 1 },
    aluminium: { sigma: 3.5e7, mu: 1 },
    iron: { sigma: 1e7, mu: 100 },
  }[metal];
  const scale = makeGraphScale({ xMin: 1, xMax: 10, yMin: 0, yMax: 4 });
  const [lg, setLg] = useState(6);
  const d = skinDepth(10 ** lg, props.sigma, props.mu);
  return (
    <WidgetShell
      title={`Skin depth in ${metal}`}
      caption={caption}
      readouts={
        <>
          <Readout label="Frequency" value={`10^${lg} Hz`} />
          <Readout
            label="Skin depth δ = 1/√(πfμσ)"
            value={d >= 1e-3 ? `${fmt(d * 1000)} mm` : `${fmt(d * 1e6)} µm`}
          />
        </>
      }
      controls={
        <>
          <Choice
            options={["copper", "aluminium", "iron"] as const}
            value={metal}
            onChange={setMetal}
          />
          <Slider
            label="log₁₀ frequency"
            value={lg}
            min={1}
            max={10}
            step={0.5}
            unit=""
            onChange={setLg}
          />
        </>
      }
    >
      <Graph scale={scale} label="Skin depth (log mm) against log frequency">
        <Curve
          scale={scale}
          f={(x) => Math.log10(skinDepth(10 ** x, props.sigma, props.mu) * 1000) + 2}
        />
        <circle cx={scale.sx(lg)} cy={scale.sy(Math.log10(d * 1000) + 2)} r={6} fill="#e1306c" />
      </Graph>
      <Legend
        items={[
          {
            color: "var(--primary)",
            label: "log₁₀(δ in mm) + 2 against log₁₀ f: halves every ×4 in frequency",
          },
        ]}
      />
    </WidgetShell>
  );
}

/** NMOS I–V characteristics. */
export function MosfetIv({ vth: t0, k: k0, caption }: { vth: number; k: number; caption: string }) {
  const [vth, setVth] = useState(t0);
  const [vgs, setVgs] = useState(2);
  const scale = makeGraphScale({
    xMin: 0,
    xMax: 5,
    yMin: 0,
    yMax: 0.5 * k0 * (5 - vth) ** 2 * 1.1 + 0.01,
  });
  const curves = [1.5, 2, 2.5, 3, 4];
  return (
    <WidgetShell
      title="NMOS I_D – V_DS characteristics"
      caption={caption}
      readouts={
        <>
          <Readout label={`At V_GS = ${vgs} V`} value={nmosCurrent(vgs, 5, vth, k0).region} />
          <Readout
            label="Saturation current ½k(V_GS−V_th)²"
            value={`${fmt(nmosCurrent(vgs, 5, vth, k0).id)} mA`}
          />
        </>
      }
      controls={
        <>
          <Slider
            label="Threshold V_th"
            value={vth}
            min={0.3}
            max={1.5}
            step={0.05}
            unit="V"
            format={(v) => v.toFixed(2)}
            onChange={setVth}
          />
          <Slider
            label="Highlighted V_GS"
            value={vgs}
            min={0}
            max={5}
            step={0.1}
            unit="V"
            format={(v) => v.toFixed(1)}
            onChange={setVgs}
          />
        </>
      }
    >
      <Graph scale={scale} label="Drain current against drain-source voltage">
        {curves.map((v) => (
          <Curve
            key={v}
            scale={scale}
            f={(x) => nmosCurrent(v, x, vth, k0, 0.02).id}
            color="var(--muted)"
            width={1.5}
          />
        ))}
        <Curve scale={scale} f={(x) => nmosCurrent(vgs, x, vth, k0, 0.02).id} color="#e1306c" />
        <Curve
          scale={scale}
          f={(x) => (x > 0 ? 0.5 * k0 * x * x : 0)}
          color="#10b981"
          dashed
          width={1.5}
        />
      </Graph>
      <Legend
        items={[
          { color: "#e1306c", label: "highlighted V_GS" },
          { color: "#10b981", label: "V_DS = V_GS − V_th (edge of saturation)", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

/** CMOS inverter voltage transfer characteristic. */
export function CmosInverter({ vdd, caption }: { vdd: number; caption: string }) {
  const [ratio, setRatio] = useState(1);
  const vt = 0.2 * vdd;
  const scale = makeGraphScale({ xMin: 0, xMax: vdd, yMin: 0, yMax: vdd * 1.05 });
  const vout = (vin: number) => inverterVout(vin, vdd, vt, -vt, 1, ratio);
  let vm = vdd / 2;
  for (let i = 0, lo = 0, hi = vdd; i < 40; i++) {
    vm = (lo + hi) / 2;
    if (vout(vm) > vm) lo = vm;
    else hi = vm;
  }
  return (
    <WidgetShell
      title="CMOS inverter transfer characteristic"
      caption={caption}
      readouts={
        <>
          <Readout label="Switching threshold V_M" value={`${fmt(vm)} V`} />
          <Readout label="k_p / k_n" value={fmt(ratio)} />
          <Readout
            label="Symmetric?"
            value={Math.abs(vm - vdd / 2) < 0.05 * vdd ? "yes (V_M ≈ V_DD/2)" : "no"}
          />
        </>
      }
      controls={
        <Slider
          label="PMOS : NMOS strength k_p / k_n"
          value={ratio}
          min={0.2}
          max={5}
          step={0.1}
          unit=""
          format={(v) => v.toFixed(1)}
          onChange={setRatio}
        />
      }
    >
      <Graph scale={scale} label={`Output against input; switches at ${fmt(vm)} volts`}>
        <Curve scale={scale} f={vout} />
        <Curve scale={scale} f={(x) => x} color="var(--muted)" dashed width={1.2} />
        <circle cx={scale.sx(vm)} cy={scale.sy(vm)} r={6} fill="#e1306c" />
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "V_out against V_in" },
          { color: "#e1306c", label: "V_M where V_out = V_in" },
        ]}
      />
    </WidgetShell>
  );
}

/** Dynamic power of CMOS logic. */
export function CmosPower({
  capacitancePf,
  voltage,
  frequencyMhz,
  activity,
  caption,
}: {
  capacitancePf: number;
  voltage: number;
  frequencyMhz: number;
  activity: number;
  caption: string;
}) {
  const [v, setV] = useState(voltage);
  const [f, setF] = useState(frequencyMhz);
  const p = dynamicPower(activity, capacitancePf * 1e-12, v, f * 1e6);
  return (
    <WidgetShell
      title="Dynamic power P = α C V² f"
      caption={caption}
      readouts={
        <>
          <Readout label="Power" value={p >= 1e-3 ? `${fmt(p * 1000)} mW` : `${fmt(p * 1e6)} µW`} />
          <Readout label="Halving V gives" value={`${fmt(p * 250)} mW (¼ of the power)`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Supply voltage V"
            value={v}
            min={0.5}
            max={5}
            step={0.1}
            unit="V"
            format={(x) => x.toFixed(1)}
            onChange={setV}
          />
          <Slider
            label="Clock frequency f"
            value={f}
            min={1}
            max={3000}
            step={1}
            unit="MHz"
            onChange={setF}
          />
        </>
      }
    >
      <p className="p-3 text-sm text-muted">
        α = {activity}, C = {capacitancePf} pF. Power grows with the square of the voltage, which is
        why chips lower their supply voltage.
      </p>
    </WidgetShell>
  );
}
