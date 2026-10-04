"use client";

import { useMemo, useState } from "react";
import { Readout, Slider, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import { Choice, TraceTable } from "@/visuals/wave2/ui2";
import {
  aliasFrequency,
  amEfficiency,
  amSignal,
  bitsPerSymbol,
  butterworth,
  carsonBandwidth,
  chebyshev,
  constellation,
  convolve,
  counterSequence,
  dftMagnitude,
  firLowpass,
  firResponse,
  fmSignal,
  gaussian,
  GRAY2,
  isStable,
  minimiseSop,
  nextState,
  poleZeroResponse,
  quantise,
  seededRandom,
  sqnrDb,
  windowFn,
  type C,
  type FlipFlop,
  type Scheme,
  type Window,
} from "@/visuals/wave2/eceModels";

/** A clickable 2–4 variable Karnaugh map with its minimal sum of products. */
export function KarnaughMap({
  variables,
  minterms,
  caption,
}: {
  variables: number;
  minterms: number[];
  caption: string;
}) {
  const n = Math.min(4, Math.max(2, variables));
  const vars = ["A", "B", "C", "D"].slice(0, n);
  const [ones, setOnes] = useState(new Set(minterms.filter((m) => m < 1 << n)));
  const rowBits = Math.floor(n / 2);
  const colBits = n - rowBits;
  const rows = rowBits === 1 ? [0, 1] : GRAY2;
  const cols = colBits === 1 ? [0, 1] : GRAY2;
  const toggle = (m: number) =>
    setOnes((s) => {
      const t = new Set(s);
      if (t.has(m)) t.delete(m);
      else t.add(m);
      return t;
    });
  const sop = minimiseSop(
    vars,
    [...ones].sort((a, b) => a - b),
  );
  const bin = (v: number, bits: number) => v.toString(2).padStart(bits, "0");
  return (
    <WidgetShell
      title={`${n}-variable Karnaugh map`}
      caption={caption}
      readouts={
        <>
          <Readout label="Minterms" value={`Σm(${[...ones].sort((a, b) => a - b).join(", ")})`} />
          <Readout label="Minimal SOP" value={`F = ${sop}`} />
        </>
      }
    >
      <div className="overflow-x-auto p-3">
        <table className="mx-auto border-collapse text-center font-mono text-sm">
          <thead>
            <tr>
              <th className="px-2 text-xs text-muted">
                {vars.slice(0, rowBits).join("")}\{vars.slice(rowBits).join("")}
              </th>
              {cols.map((c) => (
                <th key={c} className="px-3 text-xs text-muted">
                  {bin(c, colBits)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <th className="pr-2 text-xs text-muted">{bin(r, rowBits)}</th>
                {cols.map((c) => {
                  const m = (r << colBits) | c;
                  return (
                    <td key={c} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => toggle(m)}
                        aria-pressed={ones.has(m)}
                        aria-label={`minterm ${m}`}
                        className={`size-11 rounded-md border font-bold ${ones.has(m) ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface"}`}
                      >
                        {ones.has(m) ? 1 : 0}
                        <span className="block text-[9px] font-normal opacity-70">m{m}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-center text-xs text-muted">
          Tap cells to set 1s. Rows and columns are in Gray-code order.
        </p>
      </div>
    </WidgetShell>
  );
}

/** Flip-flop behaviour over a sequence of clock pulses. */
export function FlipFlopWidget({ type: t0, caption }: { type: FlipFlop; caption: string }) {
  const [type, setType] = useState<FlipFlop>(t0);
  const inputs = [
    [1, 0],
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 1],
    [0, 0],
  ];
  let q = 0;
  const rows = inputs.map(([a, b], i) => {
    const next = nextState(type, q, a, b);
    const row = [
      i + 1,
      type === "D" || type === "T" ? a : `${a}${b}`,
      q,
      next === null ? "invalid" : next,
    ];
    if (next !== null) q = next;
    return row;
  });
  const names: Record<FlipFlop, string> = { SR: "S R", JK: "J K", D: "D", T: "T" };
  return (
    <WidgetShell
      title={`${type} flip-flop`}
      caption={caption}
      readouts={
        <Readout
          label="Characteristic"
          value={
            { SR: "Q⁺ = S + R'Q (S·R = 0)", JK: "Q⁺ = JQ' + K'Q", D: "Q⁺ = D", T: "Q⁺ = T ⊕ Q" }[
              type
            ]
          }
        />
      }
      controls={
        <Choice options={["SR", "JK", "D", "T"] as const} value={type} onChange={setType} />
      }
    >
      <TraceTable head={["clock", names[type], "Q", "Q⁺"]} rows={rows} />
    </WidgetShell>
  );
}

/** Counter and shift-register sequences. */
export function CounterWidget({
  bits: b0,
  kind: k0,
  caption,
}: {
  bits: number;
  kind: "up" | "down" | "ring" | "johnson";
  caption: string;
}) {
  const [bits, setBits] = useState(b0);
  const [kind, setKind] = useState(k0);
  const seq = counterSequence(bits, 2 * bits + 4, kind);
  const period = kind === "ring" ? bits : kind === "johnson" ? 2 * bits : 2 ** bits;
  return (
    <WidgetShell
      title={`${bits}-bit ${kind} counter`}
      caption={caption}
      readouts={<Readout label="States before repeating (mod)" value={String(period)} />}
      controls={
        <>
          <Slider
            label="Flip-flops"
            value={bits}
            min={2}
            max={4}
            step={1}
            unit=""
            onChange={setBits}
          />
          <Choice
            options={["up", "down", "ring", "johnson"] as const}
            value={kind}
            onChange={setKind}
          />
        </>
      }
    >
      <TraceTable
        head={["clock", "Q (binary)", "decimal"]}
        rows={seq.map((s, i) => [i, s.toString(2).padStart(bits, "0"), s])}
      />
    </WidgetShell>
  );
}

/** Discrete convolution y = x * h, shift by shift. */
export function ConvolutionWidget({
  x,
  h,
  caption,
}: {
  x: number[];
  h: number[];
  caption: string;
}) {
  const y = convolve(x, h);
  const [n, setN] = useState(0);
  const max = Math.max(1, ...y.map(Math.abs), ...x.map(Math.abs));
  const scale = makeGraphScale({
    xMin: -0.5,
    xMax: y.length - 0.5,
    yMin: Math.min(0, ...y) - 0.5,
    yMax: max + 0.5,
  });
  const products = x
    .map((xv, k) => (n - k >= 0 && n - k < h.length ? `${xv}·${h[n - k]}` : null))
    .filter(Boolean);
  return (
    <WidgetShell
      title="Convolution y[n] = Σ x[k] h[n − k]"
      caption={caption}
      readouts={
        <>
          <Readout label={`y[${n}]`} value={`${products.join(" + ") || "0"} = ${y[n]}`} />
          <Readout label="Output length" value={`${x.length} + ${h.length} − 1 = ${y.length}`} />
        </>
      }
      controls={
        <Slider
          label="Output sample n"
          value={n}
          min={0}
          max={y.length - 1}
          step={1}
          unit=""
          onChange={setN}
        />
      }
    >
      <Graph scale={scale} label={`Output sequence ${y.join(", ")}`}>
        {y.map((v, i) => (
          <g key={i}>
            <line
              x1={scale.sx(i)}
              x2={scale.sx(i)}
              y1={scale.sy(0)}
              y2={scale.sy(v)}
              stroke={i === n ? "#e1306c" : "var(--primary)"}
              strokeWidth={3}
            />
            <circle
              cx={scale.sx(i)}
              cy={scale.sy(v)}
              r={5}
              fill={i === n ? "#e1306c" : "var(--primary)"}
            />
          </g>
        ))}
      </Graph>
      <p className="px-3 pb-2 font-mono text-xs text-muted">
        x = [{x.join(", ")}] · h = [{h.join(", ")}] · y = [{y.join(", ")}]
      </p>
    </WidgetShell>
  );
}

/** Sampling a sinusoid: when it aliases. */
export function SamplingWidget({
  signalHz,
  sampleHz,
  caption,
}: {
  signalHz: number;
  sampleHz: number;
  caption: string;
}) {
  const [f, setF] = useState(signalHz);
  const [fs, setFs] = useState(sampleHz);
  const alias = aliasFrequency(f, fs);
  const T = 2 / Math.max(1, Math.min(f, alias || f));
  const scale = makeGraphScale({ xMin: 0, xMax: T, yMin: -1.2, yMax: 1.2 });
  const samples = Array.from({ length: Math.floor(T * fs) + 1 }, (_, i) => i / fs);
  return (
    <WidgetShell
      title="Sampling and aliasing"
      caption={caption}
      readouts={
        <>
          <Readout label="Nyquist rate 2f" value={`${2 * f} Hz`} />
          <Readout label="Sampled at" value={`${fs} Hz (${fs >= 2 * f ? "enough" : "too slow"})`} />
          <Readout label="Appears as" value={`${alias} Hz`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Signal frequency f"
            value={f}
            min={1}
            max={50}
            step={1}
            unit="Hz"
            onChange={setF}
          />
          <Slider
            label="Sampling rate fs"
            value={fs}
            min={5}
            max={120}
            step={1}
            unit="Hz"
            onChange={setFs}
          />
        </>
      }
    >
      <Graph scale={scale} label={`A ${f} Hz sine sampled at ${fs} Hz looks like ${alias} Hz`}>
        <Curve
          scale={scale}
          f={(t) => Math.sin(2 * Math.PI * f * t)}
          color="var(--muted)"
          width={1.5}
        />
        {alias !== f && (
          <Curve
            scale={scale}
            f={(t) => Math.sin(2 * Math.PI * alias * t) * (((f % fs) + fs) % fs > fs / 2 ? -1 : 1)}
            color="#e1306c"
            width={2}
            dashed
          />
        )}
        {samples.map((t, i) => (
          <circle
            key={i}
            cx={scale.sx(t)}
            cy={scale.sy(Math.sin(2 * Math.PI * f * t))}
            r={4}
            fill="var(--primary)"
          />
        ))}
      </Graph>
      <Legend
        items={[
          { color: "var(--muted)", label: "real signal" },
          { color: "var(--primary)", label: "samples" },
          { color: "#e1306c", label: "what the samples look like (alias)", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

/** Poles and zeros and the frequency response they give. */
export function PoleZero({
  domain: d0,
  poles: p0,
  zeros: z0,
  caption,
}: {
  domain: "s" | "z";
  poles: C[];
  zeros: C[];
  caption: string;
}) {
  const [domain, setDomain] = useState(d0);
  const [radius, setRadius] = useState(
    domain === "z" ? Math.hypot(p0[0]?.re ?? 0.8, p0[0]?.im ?? 0) : Math.abs(p0[0]?.re ?? 1),
  );
  const angle = Math.atan2(p0[0]?.im ?? 0.5, p0[0]?.re ?? (domain === "z" ? 0.5 : -1));
  const poles: C[] =
    domain === "z"
      ? [
          { re: radius * Math.cos(angle), im: radius * Math.sin(angle) },
          { re: radius * Math.cos(angle), im: -radius * Math.sin(angle) },
        ]
      : [
          { re: -radius, im: Math.abs(p0[0]?.im ?? 2) },
          { re: -radius, im: -Math.abs(p0[0]?.im ?? 2) },
        ];
  const zeros = z0;
  const wMax = domain === "z" ? Math.PI : 6;
  const resp = (w: number) => poleZeroResponse(poles, zeros, w, domain);
  const peak = Math.max(...Array.from({ length: 200 }, (_, i) => resp((i / 199) * wMax)));
  const plane = makeGraphScale({ xMin: -2, xMax: 2, yMin: -1.6, yMax: 1.6 });
  const freq = makeGraphScale({ xMin: 0, xMax: wMax, yMin: 0, yMax: Math.min(peak * 1.1, 1e3) });
  return (
    <WidgetShell
      title={domain === "s" ? "s-plane poles and zeros" : "z-plane poles and zeros"}
      caption={caption}
      readouts={
        <>
          <Readout
            label="Stable?"
            value={
              isStable(poles, domain)
                ? "yes"
                : domain === "s"
                  ? "no: a pole in the right half"
                  : "no: a pole outside the unit circle"
            }
          />
          <Readout
            label="Poles"
            value={poles
              .map((p) => `${p.re.toFixed(2)}${p.im >= 0 ? "+" : "−"}${Math.abs(p.im).toFixed(2)}j`)
              .join(", ")}
          />
        </>
      }
      controls={
        <>
          <Choice
            options={["s", "z"] as const}
            value={domain}
            onChange={setDomain}
            labels={{ s: "Continuous (s)", z: "Discrete (z)" }}
          />
          <Slider
            label={domain === "s" ? "Damping (−Re of poles)" : "Pole radius |p|"}
            value={radius}
            min={domain === "s" ? -0.5 : 0.1}
            max={domain === "s" ? 2 : 1.2}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setRadius}
          />
        </>
      }
    >
      <div className="grid sm:grid-cols-2">
        <Graph scale={plane} label="Pole–zero plot">
          {domain === "z" && (
            <circle
              cx={plane.sx(0)}
              cy={plane.sy(0)}
              r={plane.sx(1) - plane.sx(0)}
              fill="none"
              stroke="var(--muted)"
              strokeDasharray="4 4"
            />
          )}
          {poles.map((p, i) => (
            <text
              key={i}
              x={plane.sx(p.re)}
              y={plane.sy(p.im) + 6}
              textAnchor="middle"
              fontSize="18"
              fontWeight="bold"
              fill="#e1306c"
            >
              ×
            </text>
          ))}
          {zeros.map((z, i) => (
            <circle
              key={i}
              cx={plane.sx(z.re)}
              cy={plane.sy(z.im)}
              r={6}
              fill="none"
              stroke="#10b981"
              strokeWidth={2.5}
            />
          ))}
        </Graph>
        <Graph scale={freq} label="Magnitude response">
          <Curve scale={freq} f={resp} />
        </Graph>
      </div>
      <Legend
        items={[
          { color: "#e1306c", label: "poles ×" },
          { color: "#10b981", label: "zeros ○" },
          {
            color: "var(--primary)",
            label: domain === "s" ? "|H(jω)|" : "|H(e^jω)| for ω from 0 to π",
          },
        ]}
      />
    </WidgetShell>
  );
}

/** AM and FM waveforms. */
export function ModulationWidget({
  kind: k0,
  index,
  caption,
}: {
  kind: "am" | "fm";
  index: number;
  caption: string;
}) {
  const [kind, setKind] = useState(k0);
  const [m, setM] = useState(index);
  const fc = 20;
  const fm = 2;
  const scale = makeGraphScale({ xMin: 0, xMax: 1, yMin: -2.7, yMax: 2.7 });
  return (
    <WidgetShell
      title={kind === "am" ? "Amplitude modulation" : "Frequency modulation"}
      caption={caption}
      readouts={
        kind === "am" ? (
          <>
            <Readout label="Modulation index m" value={m.toFixed(2)} />
            <Readout
              label="Power efficiency m²/(2+m²)"
              value={`${(amEfficiency(Math.min(m, 1)) * 100).toFixed(1)}%`}
            />
            <Readout label="Bandwidth" value={`2fm = ${2 * fm} Hz`} />
            <Readout label="Over-modulated?" value={m > 1 ? "yes: envelope distorts" : "no"} />
          </>
        ) : (
          <>
            <Readout label="Modulation index β" value={m.toFixed(2)} />
            <Readout
              label="Carson bandwidth 2fm(β+1)"
              value={`${carsonBandwidth(fm, m).toFixed(1)} Hz`}
            />
          </>
        )
      }
      controls={
        <>
          <Choice
            options={["am", "fm"] as const}
            value={kind}
            onChange={setKind}
            labels={{ am: "AM", fm: "FM" }}
          />
          <Slider
            label={kind === "am" ? "Modulation index m" : "Modulation index β"}
            value={m}
            min={0}
            max={kind === "am" ? 1.5 : 10}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setM}
          />
        </>
      }
    >
      <Graph scale={scale} label={`${kind.toUpperCase()} signal with index ${m.toFixed(2)}`}>
        <Curve
          scale={scale}
          f={(t) => (kind === "am" ? amSignal(t, fc, fm, m) : fmSignal(t, fc, fm, m))}
          width={1.5}
        />
        {kind === "am" && (
          <Curve
            scale={scale}
            f={(t) => 1 + m * Math.cos(2 * Math.PI * fm * t)}
            color="#e1306c"
            dashed
            width={1.5}
          />
        )}
        <Curve
          scale={scale}
          f={(t) => 0.25 * Math.cos(2 * Math.PI * fm * t) - 1.9}
          color="#10b981"
          width={1.5}
        />
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "modulated carrier" },
          ...(kind === "am" ? [{ color: "#e1306c", label: "envelope", dashed: true }] : []),
          { color: "#10b981", label: "message (shifted down)" },
        ]}
      />
    </WidgetShell>
  );
}

/** PCM: sampling and quantisation of a sine, and the SQNR. */
export function PcmWidget({ bits: b0, caption }: { bits: number; caption: string }) {
  const [bits, setBits] = useState(b0);
  const scale = makeGraphScale({ xMin: 0, xMax: 1, yMin: -1.1, yMax: 1.1 });
  const samples = Array.from({ length: 25 }, (_, i) => i / 24);
  return (
    <WidgetShell
      title={`Pulse-code modulation (${bits} bits)`}
      caption={caption}
      readouts={
        <>
          <Readout label="Levels 2ⁿ" value={String(2 ** bits)} />
          <Readout label="SQNR ≈ 6.02n + 1.76" value={`${sqnrDb(bits).toFixed(1)} dB`} />
          <Readout label="Step size" value={(2 / 2 ** bits).toFixed(3)} />
        </>
      }
      controls={
        <Slider
          label="Bits per sample n"
          value={bits}
          min={1}
          max={8}
          step={1}
          unit=""
          onChange={setBits}
        />
      }
    >
      <Graph scale={scale} label={`Sine quantised to ${2 ** bits} levels`}>
        <Curve
          scale={scale}
          f={(t) => Math.sin(2 * Math.PI * t)}
          color="var(--muted)"
          width={1.5}
        />
        <polyline
          points={samples
            .flatMap((t, i) => {
              const q = quantise(Math.sin(2 * Math.PI * t), bits);
              const t2 = samples[i + 1] ?? 1;
              return [`${scale.sx(t)},${scale.sy(q)}`, `${scale.sx(t2)},${scale.sy(q)}`];
            })
            .join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.5}
        />
      </Graph>
      <Legend
        items={[
          { color: "var(--muted)", label: "analogue signal" },
          { color: "var(--primary)", label: "quantised samples" },
        ]}
      />
    </WidgetShell>
  );
}

/** Digital modulation constellations with noise. */
export function ConstellationWidget({
  scheme: s0,
  noise: n0,
  caption,
}: {
  scheme: Scheme;
  noise: number;
  caption: string;
}) {
  const [scheme, setScheme] = useState<Scheme>(s0);
  const [noise, setNoise] = useState(n0);
  const ideal = constellation(scheme);
  const received = useMemo(() => {
    const rand = seededRandom(7);
    return Array.from({ length: 300 }, (_, i) => {
      const p = ideal[i % ideal.length];
      return {
        re: p.re + noise * gaussian(rand),
        im: p.im + noise * gaussian(rand),
        sent: i % ideal.length,
      };
    });
  }, [ideal, noise]);
  const errors = received.filter((r) => {
    let best = 0;
    ideal.forEach((p, k) => {
      if (
        Math.hypot(r.re - p.re, r.im - p.im) <
        Math.hypot(r.re - ideal[best].re, r.im - ideal[best].im)
      )
        best = k;
    });
    return best !== r.sent;
  }).length;
  const scale = makeGraphScale({ xMin: -1.8, xMax: 1.8, yMin: -1.4, yMax: 1.4 });
  return (
    <WidgetShell
      title={`${scheme} constellation`}
      caption={caption}
      readouts={
        <>
          <Readout label="Bits per symbol" value={String(bitsPerSymbol(scheme))} />
          <Readout
            label="Symbol errors (300 sent)"
            value={`${errors} (${((100 * errors) / 300).toFixed(1)}%)`}
          />
        </>
      }
      controls={
        <>
          <Choice
            options={["BPSK", "QPSK", "16-QAM"] as const}
            value={scheme}
            onChange={setScheme}
          />
          <Slider
            label="Noise standard deviation"
            value={noise}
            min={0}
            max={0.6}
            step={0.02}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setNoise}
          />
        </>
      }
    >
      <Graph scale={scale} label={`${scheme} received points with noise ${noise}`}>
        {received.map((r, i) => (
          <circle
            key={i}
            cx={scale.sx(r.re)}
            cy={scale.sy(r.im)}
            r={2}
            fill="var(--primary)"
            fillOpacity={0.5}
          />
        ))}
        {ideal.map((p, i) => (
          <circle key={`i${i}`} cx={scale.sx(p.re)} cy={scale.sy(p.im)} r={5} fill="#e1306c" />
        ))}
      </Graph>
      <Legend
        items={[
          { color: "#e1306c", label: "ideal symbols" },
          { color: "var(--primary)", label: "received (with noise)" },
        ]}
      />
    </WidgetShell>
  );
}

/** DFT spectrum of two sinusoids: bins, leakage and windows. */
export function DftSpectrum({ f1, f2, caption }: { f1: number; f2: number; caption: string }) {
  const [a, setA] = useState(f1);
  const [win, setWin] = useState<Window>("rectangular");
  const N = 64;
  const x = Array.from(
    { length: N },
    (_, n) =>
      (Math.sin((2 * Math.PI * a * n) / N) + 0.5 * Math.sin((2 * Math.PI * f2 * n) / N)) *
      windowFn(win, n, N),
  );
  const X = dftMagnitude(x).slice(0, N / 2);
  const max = Math.max(...X, 1);
  const scale = makeGraphScale({ xMin: -0.5, xMax: N / 2 - 0.5, yMin: 0, yMax: max * 1.1 });
  return (
    <WidgetShell
      title={`DFT magnitude (N = ${N})`}
      caption={caption}
      readouts={
        <>
          <Readout label="Tone 1 (cycles per frame)" value={a.toFixed(1)} />
          <Readout
            label="On a bin?"
            value={
              Number.isInteger(a) ? "yes: one clean spike" : "no: energy leaks into nearby bins"
            }
          />
        </>
      }
      controls={
        <>
          <Slider
            label="Tone 1 frequency (bins)"
            value={a}
            min={1}
            max={20}
            step={0.5}
            unit=""
            format={(v) => v.toFixed(1)}
            onChange={setA}
          />
          <Choice
            options={["rectangular", "hann", "hamming", "blackman"] as const}
            value={win}
            onChange={setWin}
          />
        </>
      }
    >
      <Graph scale={scale} label="Magnitude of each DFT bin">
        {X.map((v, k) => (
          <line
            key={k}
            x1={scale.sx(k)}
            x2={scale.sx(k)}
            y1={scale.sy(0)}
            y2={scale.sy(v)}
            stroke="var(--primary)"
            strokeWidth={4}
          />
        ))}
      </Graph>
    </WidgetShell>
  );
}

/** FIR low-pass design by the window method. */
export function FirDesign({
  taps: t0,
  cutoff: c0,
  caption,
}: {
  taps: number;
  cutoff: number;
  caption: string;
}) {
  const [taps, setTaps] = useState(t0);
  const [cutoff, setCutoff] = useState(c0);
  const [win, setWin] = useState<Window>("hamming");
  const h = firLowpass(taps, cutoff, win);
  const scale = makeGraphScale({ xMin: 0, xMax: 0.5, yMin: -80, yMax: 5 });
  return (
    <WidgetShell
      title={`FIR low-pass: ${taps} taps, ${win} window`}
      caption={caption}
      readouts={
        <>
          <Readout
            label="Gain at 0"
            value={`${(20 * Math.log10(firResponse(h, 0))).toFixed(2)} dB`}
          />
          <Readout
            label="Gain at 2 × cut-off"
            value={`${(20 * Math.log10(Math.max(firResponse(h, Math.min(0.5, 2 * cutoff)), 1e-6))).toFixed(1)} dB`}
          />
        </>
      }
      controls={
        <>
          <Slider label="Taps" value={taps} min={5} max={101} step={2} unit="" onChange={setTaps} />
          <Slider
            label="Cut-off (× fs)"
            value={cutoff}
            min={0.02}
            max={0.45}
            step={0.01}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setCutoff}
          />
          <Choice
            options={["rectangular", "hann", "hamming", "blackman"] as const}
            value={win}
            onChange={setWin}
          />
        </>
      }
    >
      <Graph scale={scale} label="Magnitude response in dB">
        <Curve scale={scale} f={(f) => 20 * Math.log10(Math.max(firResponse(h, f), 1e-5))} />
        <line
          x1={scale.sx(cutoff)}
          x2={scale.sx(cutoff)}
          y1={scale.sy(-80)}
          y2={scale.sy(5)}
          stroke="#e1306c"
          strokeDasharray="5 4"
        />
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "|H| in dB against frequency (× fs)" },
          { color: "#e1306c", label: "cut-off", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

/** Butterworth and Chebyshev magnitude responses. */
export function IirResponse({
  type: t0,
  order: o0,
  caption,
}: {
  type: "butterworth" | "chebyshev";
  order: number;
  caption: string;
}) {
  const [type, setType] = useState(t0);
  const [order, setOrder] = useState(o0);
  const scale = makeGraphScale({ xMin: 0, xMax: 3, yMin: 0, yMax: 1.1 });
  const f = (w: number) =>
    type === "butterworth" ? butterworth(w, 1, order) : chebyshev(w, 1, order, 0.5);
  return (
    <WidgetShell
      title={`${type === "butterworth" ? "Butterworth" : "Chebyshev type I"} low-pass, order ${order}`}
      caption={caption}
      readouts={
        <>
          <Readout label="|H| at the cut-off" value={f(1).toFixed(3)} />
          <Readout label="|H| at 2 × cut-off" value={f(2).toFixed(4)} />
          <Readout label="Roll-off" value={`${20 * order} dB/decade`} />
        </>
      }
      controls={
        <>
          <Choice
            options={["butterworth", "chebyshev"] as const}
            value={type}
            onChange={setType}
            labels={{ butterworth: "Butterworth (flat)", chebyshev: "Chebyshev (ripple)" }}
          />
          <Slider
            label="Order N"
            value={order}
            min={1}
            max={10}
            step={1}
            unit=""
            onChange={setOrder}
          />
        </>
      }
    >
      <Graph scale={scale} label="Magnitude against normalised frequency">
        <Curve scale={scale} f={f} />
        <Curve scale={scale} f={(w) => (w <= 1 ? 1 : 0)} color="var(--muted)" dashed width={1.5} />
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "|H(jω)| (ω / ωc across)" },
          { color: "var(--muted)", label: "ideal brick wall", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}
