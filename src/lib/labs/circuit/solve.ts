import {
  splitRef,
  terminalsOf,
  type Circuit,
  type CircuitComponent,
} from "@/lib/labs/circuit/model";
import { buildNets } from "@/lib/labs/circuit/validate";

/*
 * Live readings for a lab circuit (syllabus fix, Phase 7C): modified nodal analysis, the method
 * circuit simulators use. DC circuits are solved with diodes as real exponential curves (Newton's
 * method); AC circuits as phasors at the source frequency (meters read RMS). Parts Prism cannot
 * model (transistors, ICs, boards) mean no live readings, only the diagram.
 */

type C = { re: number; im: number };
const c = (re: number, im = 0): C => ({ re, im });
const add = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im });
const sub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im });
const mul = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const div = (a: C, b: C): C => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
const abs = (a: C) => Math.hypot(a.re, a.im);

/** Solves A x = b (complex) by Gaussian elimination; null when singular. */
export function solveLinear(A: C[][], b: C[]): C[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (abs(M[r][col]) > abs(M[pivot][col])) pivot = r;
    if (abs(M[pivot][col]) < 1e-15) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = div(M[r][col], M[col][col]);
      if (f.re === 0 && f.im === 0) continue;
      for (let k = col; k <= n; k++) M[r][k] = sub(M[r][k], mul(f, M[col][k]));
    }
  }
  return M.map((row, i) => div(row[n], row[i]));
}

/** A student's changes on the interactive circuit. */
export type Overrides = Record<
  string,
  { value?: number; frequency?: number; closed?: boolean; position?: number }
>;

export type Reading = {
  /** DC: signed. AC: RMS magnitude. */
  value: number;
  unit: "A" | "V";
};

export type Solution =
  | {
      ok: true;
      ac: boolean;
      frequency: number;
      readings: Record<string, Reading>;
      approximate: boolean;
    }
  | { ok: false; reason: "unsupported" | "singular" | "no-converge"; detail?: string };

const UNSUPPORTED = new Set([
  "transistor-npn",
  "transistor-pnp",
  "transformer",
  "ic",
  "microcontroller",
  "sensor",
  "module",
]);

const DEFAULTS: Record<string, number> = {
  battery: 5,
  "dc-supply": 5,
  "ac-supply": 5,
  "function-generator": 1,
  "solar-cell": 0.03,
  resistor: 1000,
  rheostat: 100,
  potentiometer: 10_000,
  bulb: 50,
  capacitor: 1e-6,
  "electrolytic-capacitor": 100e-6,
  inductor: 0.01,
  zener: 5.1,
  motor: 10,
  fuse: 1,
};

const VT = 0.02585;
/** Diode curves: saturation current and ideality, so Si ≈ 0.65 V and an LED ≈ 2 V at 10 mA. */
const DIODE: Record<string, { is: number; n: number }> = {
  diode: { is: 1e-14, n: 1 },
  zener: { is: 1e-14, n: 1 },
  photodiode: { is: 1e-14, n: 1 },
  led: { is: 1e-19, n: 2 },
  "solar-cell": { is: 1e-9, n: 1.5 },
};

/** A diode junction's current and slope at v; past a large exponent it continues as a line. */
function junction(v: number, is: number, nvt: number): { i: number; g: number } {
  const CAP = 50;
  const arg = v / nvt;
  if (arg <= CAP) {
    const ex = Math.exp(arg);
    return { i: is * (ex - 1), g: (is * ex) / nvt };
  }
  const ex = Math.exp(CAP);
  return { i: is * (ex * (1 + arg - CAP) - 1), g: (is * ex) / nvt };
}

export function valueOf(comp: CircuitComponent, o?: Overrides[string]): number {
  return o?.value ?? comp.value ?? DEFAULTS[comp.type] ?? 1;
}

export function solveCircuit(circuit: Circuit, overrides: Overrides = {}): Solution {
  const bad = circuit.components.find((p) => UNSUPPORTED.has(p.type));
  if (bad) return { ok: false, reason: "unsupported", detail: bad.type };

  const nets = buildNets(circuit);
  const net = (comp: CircuitComponent, t: string) => nets.netOf.get(`${comp.id}.${t}`)!;
  const acSource = circuit.components.find(
    (p) => p.type === "ac-supply" || p.type === "function-generator",
  );
  const ac = Boolean(acSource);
  const frequency = acSource
    ? (overrides[acSource.id]?.frequency ??
      acSource.frequency ??
      (acSource.type === "ac-supply" ? 50 : 1000))
    : 0;
  const w = 2 * Math.PI * frequency;

  // Ground: the first source's negative side.
  const firstSource = circuit.components.find(
    (p) => terminalsOf(p).includes("-") || p.type === "ac-supply",
  );
  const groundNet = firstSource ? net(firstSource, terminalsOf(firstSource)[1]) : 0;
  const nodeIndex = new Map<number, number>();
  nets.members.forEach((_, i) => {
    if (i !== groundNet) nodeIndex.set(i, nodeIndex.size);
  });
  const N = nodeIndex.size;

  // Voltage-source-like branches: sources, ammeters (0 V), and their unknown currents.
  const branches: { comp: CircuitComponent; p: number; n: number; e: C }[] = [];
  const diodes: { comp: CircuitComponent; a: number; k: number; reverse?: number }[] = [];
  const admittances: { a: number; b: number; y: C }[] = [];
  const currents: { p: number; n: number; i: number }[] = [];
  const probes: { comp: CircuitComponent; a: number; b: number; r?: number }[] = [];
  let approximate = false;

  const y = (z: C) => div(c(1), z);
  for (const p of circuit.components) {
    const o = overrides[p.id];
    const t = terminalsOf(p);
    const a = net(p, t[0]);
    const b = net(p, t[1]);
    switch (p.type) {
      case "battery":
      case "dc-supply":
        branches.push({ comp: p, p: a, n: b, e: c(ac ? 0 : valueOf(p, o)) });
        break;
      case "ac-supply":
      case "function-generator":
        branches.push({ comp: p, p: a, n: b, e: c(valueOf(p, o)) });
        break;
      case "solar-cell":
        if (!ac) {
          currents.push({ p: a, n: b, i: valueOf(p, o) });
          diodes.push({ comp: p, a, k: b });
        }
        break;
      case "resistor":
      case "rheostat":
      case "bulb":
      case "motor":
        admittances.push({ a, b, y: c(1 / Math.max(valueOf(p, o), 1e-6)) });
        break;
      case "potentiometer": {
        const R = valueOf(p, o);
        const f = Math.min(0.999, Math.max(0.001, o?.position ?? 0.5));
        const wiper = net(p, "wiper");
        admittances.push({ a, b: wiper, y: c(1 / (R * f)) });
        admittances.push({ a: wiper, b, y: c(1 / (R * (1 - f))) });
        break;
      }
      case "fuse":
        admittances.push({ a, b, y: c(1e5) });
        break;
      case "switch":
        if (o?.closed !== false) admittances.push({ a, b, y: c(1e5) });
        break;
      case "capacitor":
      case "electrolytic-capacitor":
        admittances.push({ a, b, y: ac ? y(c(0, -1 / (w * valueOf(p, o)))) : c(1e-12) });
        break;
      case "inductor":
        admittances.push({ a, b, y: ac ? y(c(1e-3, w * valueOf(p, o))) : c(1e3) });
        break;
      case "diode":
      case "led":
      case "zener":
      case "photodiode":
        if (ac) {
          approximate = true;
          admittances.push({ a, b, y: c(1e-9) });
        } else
          diodes.push({
            comp: p,
            a,
            k: b,
            reverse: p.type === "zener" ? valueOf(p, o) : undefined,
          });
        break;
      case "ammeter":
        branches.push({ comp: p, p: a, n: b, e: c(0) });
        break;
      case "galvanometer":
        admittances.push({ a, b, y: c(1 / 50) });
        probes.push({ comp: p, a, b, r: 50 });
        break;
      case "voltmeter":
        admittances.push({ a, b, y: c(1e-7) });
        probes.push({ comp: p, a, b });
        break;
      case "oscilloscope":
        admittances.push({ a, b, y: c(1e-6) });
        probes.push({ comp: p, a, b });
        break;
    }
  }

  const M = N + branches.length;
  const vAt = (x: C[], netId: number) => (netId === groundNet ? c(0) : x[nodeIndex.get(netId)!]);
  let volts = new Map<number, number>();
  let x: C[] | null = null;
  const maxIter = diodes.length ? 200 : 1;
  for (let iter = 0; iter < maxIter; iter++) {
    const A: C[][] = Array.from({ length: M }, () => Array.from({ length: M }, () => c(0)));
    const z: C[] = Array.from({ length: M }, () => c(0));
    const stamp = (a: number, b: number, v: C) => {
      const ia = nodeIndex.get(a);
      const ib = nodeIndex.get(b);
      if (ia !== undefined) A[ia][ia] = add(A[ia][ia], v);
      if (ib !== undefined) A[ib][ib] = add(A[ib][ib], v);
      if (ia !== undefined && ib !== undefined) {
        A[ia][ib] = sub(A[ia][ib], v);
        A[ib][ia] = sub(A[ib][ia], v);
      }
    };
    const inject = (node: number, i: number) => {
      const k = nodeIndex.get(node);
      if (k !== undefined) z[k] = add(z[k], c(i));
    };
    for (let k = 0; k < N; k++) A[k][k] = add(A[k][k], c(1e-12));
    for (const e of admittances) stamp(e.a, e.b, e.y);
    for (const s of currents) {
      inject(s.p, s.i);
      inject(s.n, -s.i);
    }
    for (const d of diodes) {
      const { is, n } = DIODE[d.comp.type];
      const vd = (volts.get(d.a) ?? 0) - (volts.get(d.k) ?? 0);
      const nvt = n * VT;
      const fwd = junction(vd, is, nvt);
      let i = fwd.i;
      let g = fwd.g;
      if (d.reverse) {
        // Zener breakdown: a mirrored diode switched on at -Vz.
        const rev = junction(-vd - d.reverse, is * 1e3, nvt);
        i -= rev.i;
        g += rev.g;
      }
      g += 1e-12;
      stamp(d.a, d.k, c(g));
      const ieq = i - g * vd;
      inject(d.a, -ieq);
      inject(d.k, ieq);
    }
    branches.forEach((br, j) => {
      const k = N + j;
      const ip = nodeIndex.get(br.p);
      const im = nodeIndex.get(br.n);
      if (ip !== undefined) {
        A[ip][k] = add(A[ip][k], c(1));
        A[k][ip] = add(A[k][ip], c(1));
      }
      if (im !== undefined) {
        A[im][k] = sub(A[im][k], c(1));
        A[k][im] = sub(A[k][im], c(1));
      }
      z[k] = br.e;
    });
    x = solveLinear(A, z);
    if (!x) return { ok: false, reason: "singular" };
    const next = new Map<number, number>();
    let change = 0;
    for (const [netId] of nodeIndex) {
      let v = vAt(x, netId).re;
      const prev = volts.get(netId) ?? 0;
      // Damping keeps Newton's method from jumping past a diode's knee.
      if (diodes.length && Math.abs(v - prev) > 0.3) v = prev + Math.sign(v - prev) * 0.3;
      change = Math.max(change, Math.abs(v - prev));
      next.set(netId, v);
    }
    next.set(groundNet, 0);
    volts = next;
    if (diodes.length && change < 1e-9 && iter > 0) break;
    if (diodes.length && iter === maxIter - 1) return { ok: false, reason: "no-converge" };
  }
  if (!x) return { ok: false, reason: "singular" };

  const readings: Record<string, Reading> = {};
  const value = (v: C) => (ac ? abs(v) : v.re);
  branches.forEach((br, j) => {
    if (br.comp.type === "ammeter") readings[br.comp.id] = { value: value(x![N + j]), unit: "A" };
  });
  for (const pr of probes) {
    const v = sub(vAt(x, pr.a), vAt(x, pr.b));
    readings[pr.comp.id] = pr.r
      ? { value: value(v) / pr.r, unit: "A" }
      : { value: value(v), unit: "V" };
  }
  return { ok: true, ac, frequency, readings, approximate };
}

/** The live graph: sweep one value across its slider range and read two meters at each point. */
export function sweep(
  circuit: Circuit,
  overrides: Overrides,
  steps = 40,
): { x: number; y: number }[] {
  const plot = circuit.plot;
  if (!plot) return [];
  const comp = circuit.components.find((p) => p.id === plot.sweep);
  if (!comp) return [];
  const param = plot.param ?? "value";
  const base = param === "frequency" ? (comp.frequency ?? 1000) : valueOf(comp, overrides[comp.id]);
  const lo = comp.adjust?.min ?? (param === "frequency" ? base / 10 : 0);
  const hi = comp.adjust?.max ?? base * 2;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const v = lo + ((hi - lo) * i) / steps;
    const o: Overrides = { ...overrides, [comp.id]: { ...overrides[comp.id], [param]: v } };
    const s = solveCircuit(circuit, o);
    if (!s.ok) continue;
    const yv = s.readings[plot.y]?.value;
    const xv = plot.x === comp.id ? v : s.readings[plot.x]?.value;
    if (Number.isFinite(xv) && Number.isFinite(yv)) points.push({ x: xv!, y: yv! });
  }
  return points;
}

/** Which component terminals a wire joins, for labels like "Battery (+) to Rheostat (1)". */
export function describeWire(circuit: Circuit, i: number): string {
  const w = circuit.connections[i];
  const name = (ref: string) => {
    const { comp, terminal } = splitRef(ref);
    const p = circuit.components.find((q) => q.id === comp);
    return `${p?.label ?? comp} (${terminal})`;
  };
  return `${name(w.from)} → ${name(w.to)}`;
}
