/*
 * Electronics and communication models for Wave 2 widgets (V3 · Step 8): digital logic,
 * signals, filters, modulation, transmission lines, CMOS and microprocessors. Pure and
 * tested in eceModels.test.ts.
 */

// ---------------------------------------------------------------- digital logic

/** Minimal sum of products for a 2–4 variable function given its minterms (Quine–McCluskey). */
export function minimiseSop(vars: string[], minterms: number[], dontCares: number[] = []): string {
  const n = vars.length;
  const ones = new Set(minterms);
  if (ones.size === 0) return "0";
  if (ones.size + dontCares.length === 1 << n && minterms.length) {
    const all = [...Array(1 << n).keys()].every((m) => ones.has(m) || dontCares.includes(m));
    if (all) return "1";
  }
  type Imp = { mask: number; value: number; covers: number[] };
  let current: Imp[] = [...new Set([...minterms, ...dontCares])].map((m) => ({
    mask: 0,
    value: m,
    covers: [m],
  }));
  const primes: Imp[] = [];
  while (current.length) {
    const next = new Map<string, Imp>();
    const used = new Set<number>();
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i];
        const b = current[j];
        if (a.mask !== b.mask) continue;
        const diff = a.value ^ b.value;
        if (diff && (diff & (diff - 1)) === 0) {
          const imp = {
            mask: a.mask | diff,
            value: a.value & ~diff,
            covers: [...new Set([...a.covers, ...b.covers])],
          };
          next.set(`${imp.mask}:${imp.value}`, imp);
          used.add(i);
          used.add(j);
        }
      }
    }
    current.forEach((imp, i) => {
      if (!used.has(i) && !primes.some((p) => p.mask === imp.mask && p.value === imp.value))
        primes.push(imp);
    });
    current = [...next.values()];
  }
  // Cover the minterms: essential primes first, then greedily the biggest.
  const chosen: Imp[] = [];
  const left = new Set(minterms);
  for (const m of minterms) {
    const covering = primes.filter((p) => p.covers.includes(m));
    if (covering.length === 1 && !chosen.includes(covering[0])) {
      chosen.push(covering[0]);
      covering[0].covers.forEach((c) => left.delete(c));
    }
  }
  while (left.size) {
    const best = primes
      .filter((p) => !chosen.includes(p))
      .sort(
        (a, b) =>
          b.covers.filter((c) => left.has(c)).length - a.covers.filter((c) => left.has(c)).length,
      )[0];
    chosen.push(best);
    best.covers.forEach((c) => left.delete(c));
  }
  const term = (p: Imp) =>
    vars
      .map((v, i) => {
        const bit = 1 << (n - 1 - i);
        if (p.mask & bit) return "";
        return p.value & bit ? v : `${v}'`;
      })
      .join("") || "1";
  return chosen.map(term).sort().join(" + ");
}

/** Gray-code order of the rows/columns of a K-map. */
export const GRAY2 = [0, 1, 3, 2];

export type FlipFlop = "SR" | "JK" | "D" | "T";

/** Next state of a flip-flop for the given inputs (SR with S=R=1 is invalid → null). */
export function nextState(ff: FlipFlop, q: number, a: number, b = 0): number | null {
  switch (ff) {
    case "D":
      return a;
    case "T":
      return a ? 1 - q : q;
    case "JK":
      return a && b ? 1 - q : a ? 1 : b ? 0 : q;
    case "SR":
      return a && b ? null : a ? 1 : b ? 0 : q;
  }
}

/** States of an n-bit counter (up or down, binary or ring) over a number of clock pulses. */
export function counterSequence(
  bits: number,
  pulses: number,
  kind: "up" | "down" | "ring" | "johnson",
) {
  const states: number[] = [];
  let s = kind === "ring" ? 1 : 0;
  const mod = 1 << bits;
  for (let i = 0; i <= pulses; i++) {
    states.push(s);
    if (kind === "up") s = (s + 1) % mod;
    else if (kind === "down") s = (s - 1 + mod) % mod;
    else if (kind === "ring") s = ((s << 1) | (s >> (bits - 1))) & (mod - 1);
    else s = ((s << 1) | ((~s >> (bits - 1)) & 1)) & (mod - 1);
  }
  return states;
}

// ---------------------------------------------------------------- signals

export function convolve(x: number[], h: number[]): number[] {
  const y = Array(x.length + h.length - 1).fill(0);
  x.forEach((xv, i) => h.forEach((hv, j) => (y[i + j] += xv * hv)));
  return y;
}

/** The frequency a sampled sinusoid appears to have (folded into 0 … fs/2). */
export function aliasFrequency(f: number, fs: number): number {
  const r = ((f % fs) + fs) % fs;
  return r > fs / 2 ? fs - r : r;
}

/** DFT magnitudes |X[k]| for k = 0 … N−1 (direct sum; N is small in widgets). */
export function dftMagnitude(x: number[]): number[] {
  const N = x.length;
  return Array.from({ length: N }, (_, k) => {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      re += x[n] * Math.cos((2 * Math.PI * k * n) / N);
      im -= x[n] * Math.sin((2 * Math.PI * k * n) / N);
    }
    return Math.hypot(re, im);
  });
}

export type Window = "rectangular" | "hann" | "hamming" | "blackman";
export function windowFn(kind: Window, n: number, N: number): number {
  const t = (2 * Math.PI * n) / (N - 1);
  switch (kind) {
    case "rectangular":
      return 1;
    case "hann":
      return 0.5 - 0.5 * Math.cos(t);
    case "hamming":
      return 0.54 - 0.46 * Math.cos(t);
    case "blackman":
      return 0.42 - 0.5 * Math.cos(t) + 0.08 * Math.cos(2 * t);
  }
}

/** Windowed-sinc low-pass FIR taps (cutoff as a fraction of the sampling rate, 0 … 0.5). */
export function firLowpass(taps: number, cutoff: number, win: Window): number[] {
  const M = taps - 1;
  const h = Array.from({ length: taps }, (_, n) => {
    const k = n - M / 2;
    const sinc = k === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * k) / (Math.PI * k);
    return sinc * windowFn(win, n, taps);
  });
  const sum = h.reduce((a, b) => a + b, 0);
  return h.map((v) => v / sum);
}

/** Magnitude response |H(e^{jω})| of FIR taps at normalised frequency f (cycles/sample). */
export function firResponse(h: number[], f: number): number {
  let re = 0;
  let im = 0;
  h.forEach((v, n) => {
    re += v * Math.cos(2 * Math.PI * f * n);
    im -= v * Math.sin(2 * Math.PI * f * n);
  });
  return Math.hypot(re, im);
}

/** Butterworth low-pass magnitude |H| = 1/√(1 + (ω/ωc)^(2N)). */
export function butterworth(w: number, wc: number, order: number): number {
  return 1 / Math.sqrt(1 + (w / wc) ** (2 * order));
}

/** Chebyshev type I magnitude with ripple ε. */
export function chebyshev(w: number, wc: number, order: number, eps: number): number {
  const x = w / wc;
  const T = Math.abs(x) <= 1 ? Math.cos(order * Math.acos(x)) : Math.cosh(order * Math.acosh(x));
  return 1 / Math.sqrt(1 + eps * eps * T * T);
}

export type C = { re: number; im: number };

/** |H(jω)| (continuous) or |H(e^{jω})| (discrete) from poles and zeros, gain 1. */
export function poleZeroResponse(poles: C[], zeros: C[], w: number, domain: "s" | "z"): number {
  const p = domain === "s" ? { re: 0, im: w } : { re: Math.cos(w), im: Math.sin(w) };
  const dist = (c: C) => Math.hypot(p.re - c.re, p.im - c.im);
  const num = zeros.reduce((s, z) => s * dist(z), 1);
  const den = poles.reduce((s, q) => s * dist(q), 1);
  return den === 0 ? Infinity : num / den;
}

export function isStable(poles: C[], domain: "s" | "z"): boolean {
  return poles.every((p) => (domain === "s" ? p.re < 0 : Math.hypot(p.re, p.im) < 1));
}

// ---------------------------------------------------------------- communication

export function amSignal(t: number, fc: number, fm: number, m: number): number {
  return (1 + m * Math.cos(2 * Math.PI * fm * t)) * Math.cos(2 * Math.PI * fc * t);
}

export function fmSignal(t: number, fc: number, fm: number, beta: number): number {
  return Math.cos(2 * Math.PI * fc * t + beta * Math.sin(2 * Math.PI * fm * t));
}

/** Carson's rule bandwidth: 2(Δf + fm) = 2 fm (β + 1). */
export function carsonBandwidth(fm: number, beta: number): number {
  return 2 * fm * (beta + 1);
}

/** Power efficiency of AM with modulation index m: m² / (2 + m²). */
export function amEfficiency(m: number): number {
  return (m * m) / (2 + m * m);
}

/** Uniform quantiser output and the theoretical SQNR (6.02 n + 1.76 dB for a full-scale sine). */
export function quantise(x: number, bits: number): number {
  const levels = 2 ** bits;
  const step = 2 / levels;
  const q = Math.floor((x + 1) / step);
  return Math.min(levels - 1, Math.max(0, q)) * step - 1 + step / 2;
}

export function sqnrDb(bits: number): number {
  return 6.02 * bits + 1.76;
}

export type Scheme = "BPSK" | "QPSK" | "16-QAM";

export function constellation(scheme: Scheme): C[] {
  if (scheme === "BPSK")
    return [
      { re: -1, im: 0 },
      { re: 1, im: 0 },
    ];
  if (scheme === "QPSK")
    return [-1, 1].flatMap((a) => [-1, 1].map((b) => ({ re: a / Math.SQRT2, im: b / Math.SQRT2 })));
  const lv = [-3, -1, 1, 3].map((v) => v / Math.sqrt(10));
  return lv.flatMap((a) => lv.map((b) => ({ re: a, im: b })));
}

export function bitsPerSymbol(scheme: Scheme): number {
  return { BPSK: 1, QPSK: 2, "16-QAM": 4 }[scheme];
}

/** A seeded pseudo-random generator (so the widget's noise cloud is the same every render). */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------------------------------------------------------------- transmission lines and waves

export function reflectionCoefficient(zl: C, z0: number): C {
  const num = { re: zl.re - z0, im: zl.im };
  const den = { re: zl.re + z0, im: zl.im };
  const d = den.re * den.re + den.im * den.im;
  return {
    re: (num.re * den.re + num.im * den.im) / d,
    im: (num.im * den.re - num.re * den.im) / d,
  };
}

export function vswr(gamma: C): number {
  const g = Math.hypot(gamma.re, gamma.im);
  return g >= 1 ? Infinity : (1 + g) / (1 - g);
}

/** |V(d)| / |V+| at distance d (in wavelengths) from the load on a lossless line. */
export function standingWaveVoltage(gamma: C, dLambda: number): number {
  const phase = 4 * Math.PI * dLambda;
  // 1 + Γ e^{-j2βd}
  const re = 1 + gamma.re * Math.cos(phase) + gamma.im * Math.sin(phase);
  const im = gamma.im * Math.cos(phase) - gamma.re * Math.sin(phase);
  return Math.hypot(re, im);
}

/** Cut-off frequency of the TE_mn / TM_mn mode of an a × b rectangular waveguide (air). */
export function waveguideCutoff(aM: number, bM: number, m: number, n: number): number {
  const c = 299792458;
  return (c / 2) * Math.sqrt((m / aM) ** 2 + (n / bM) ** 2);
}

/** Skin depth δ = 1/√(π f μ σ). */
export function skinDepth(fHz: number, sigma: number, muR = 1): number {
  return 1 / Math.sqrt(Math.PI * fHz * 4e-7 * Math.PI * muR * sigma);
}

/** Polarisation of a wave with Ex, Ey amplitudes and phase difference δ (degrees). */
export function polarisationKind(
  ex: number,
  ey: number,
  deltaDeg: number,
): "linear" | "circular" | "elliptical" {
  const d = ((deltaDeg % 360) + 360) % 360;
  if (ex === 0 || ey === 0 || d === 0 || d === 180) return "linear";
  if (Math.abs(ex - ey) < 1e-9 && (d === 90 || d === 270)) return "circular";
  return "elliptical";
}

// ---------------------------------------------------------------- circuits

/** Series RLC: resonant frequency, Q and current magnitude at f (V source of amplitude V). */
export function seriesRlc(r: number, l: number, c: number, f: number, v = 1) {
  const f0 = 1 / (2 * Math.PI * Math.sqrt(l * c));
  const x = 2 * Math.PI * f * l - 1 / (2 * Math.PI * f * c);
  return {
    f0,
    q: (1 / r) * Math.sqrt(l / c),
    current: v / Math.hypot(r, x),
    bandwidth: r / (2 * Math.PI * l),
  };
}

/** Power delivered to RL from a source with internal resistance Rs. */
export function loadPower(v: number, rs: number, rl: number): number {
  return (v * v * rl) / (rs + rl) ** 2;
}

/** Single-pole high-pass and low-pass corners: an amplifier's mid-band gain and response. */
export function amplifierGainDb(f: number, midGainDb: number, fl: number, fh: number): number {
  const low = f / Math.sqrt(f * f + fl * fl);
  const high = 1 / Math.sqrt(1 + (f / fh) ** 2);
  return midGainDb + 20 * Math.log10(low * high);
}

/** Differential amplifier output: Ad·vd + Acm·vcm, and CMRR in dB. */
export function diffAmp(v1: number, v2: number, ad: number, acm: number) {
  const vd = v1 - v2;
  const vcm = (v1 + v2) / 2;
  return { out: ad * vd + acm * vcm, cmrrDb: 20 * Math.log10(Math.abs(ad / acm)) };
}

/** R-2R / weighted DAC output for a digital code: Vref · code / 2^n. */
export function dacOutput(code: number, bits: number, vref: number): number {
  return (vref * code) / 2 ** bits;
}

/** Successive-approximation ADC: the trial code after each bit decision. */
export function sarAdc(vin: number, bits: number, vref: number) {
  let code = 0;
  const trials: { bit: number; trial: number; keep: boolean }[] = [];
  for (let b = bits - 1; b >= 0; b--) {
    const trial = code | (1 << b);
    const keep = dacOutput(trial, bits, vref) <= vin;
    trials.push({ bit: b, trial, keep });
    if (keep) code = trial;
  }
  return { code, trials };
}

// ---------------------------------------------------------------- MOS and CMOS

/** Long-channel NMOS drain current (square law) in mA for k' W/L in mA/V². */
export function nmosCurrent(
  vgs: number,
  vds: number,
  vth: number,
  k: number,
  lambda = 0,
): { id: number; region: string } {
  if (vgs <= vth) return { id: 0, region: "cut-off" };
  const vov = vgs - vth;
  if (vds < vov) return { id: k * (vov * vds - (vds * vds) / 2), region: "triode (linear)" };
  return { id: 0.5 * k * vov * vov * (1 + lambda * vds), region: "saturation" };
}

/** CMOS inverter output voltage for an input, solving NMOS current = PMOS current. */
export function inverterVout(
  vin: number,
  vdd: number,
  vtn: number,
  vtp: number,
  kn: number,
  kp: number,
): number {
  let lo = 0;
  let hi = vdd;
  const diff = (vout: number) =>
    // A little channel-length modulation (λ = 0.05/V) makes the transition steep but unique.
    nmosCurrent(vin, vout, vtn, kn, 0.05).id -
    nmosCurrent(vdd - vin, vdd - vout, Math.abs(vtp), kp, 0.05).id;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Dynamic power P = α C V² f. */
export function dynamicPower(alpha: number, cF: number, v: number, fHz: number): number {
  return alpha * cF * v * v * fHz;
}

// ---------------------------------------------------------------- microprocessors

/** 8086 physical address = segment × 16 + offset (20 bits). */
export function physicalAddress(segment: number, offset: number): number {
  return ((segment << 4) + offset) & 0xfffff;
}

/** Which memory chip an address selects when chips of `chipBytes` are placed from address 0. */
export function chipSelect(address: number, chipBytes: number, chips: number) {
  const chip = Math.floor(address / chipBytes);
  return { chip: chip < chips ? chip : -1, offset: address % chipBytes };
}

/** A tiny accumulator machine (8085-style) for teaching loops and flags. */
export type Instr = {
  op: "MVI" | "ADD" | "SUB" | "DCR" | "JNZ" | "HLT";
  reg?: "A" | "B" | "C";
  value?: number;
  target?: number;
};

export function runAccumulator(program: Instr[], maxSteps = 200) {
  const r = { A: 0, B: 0, C: 0 };
  let zero = false;
  let pc = 0;
  const trace: { pc: number; instr: string; A: number; B: number; C: number; Z: boolean }[] = [];
  for (let s = 0; s < maxSteps && pc < program.length; s++) {
    const ins = program[pc];
    let nextPc = pc + 1;
    switch (ins.op) {
      case "MVI":
        r[ins.reg!] = ins.value! & 255;
        break;
      case "ADD":
        r.A = (r.A + r[ins.reg!]) & 255;
        zero = r.A === 0;
        break;
      case "SUB":
        r.A = (r.A - r[ins.reg!]) & 255;
        zero = r.A === 0;
        break;
      case "DCR":
        r[ins.reg!] = (r[ins.reg!] - 1) & 255;
        zero = r[ins.reg!] === 0;
        break;
      case "JNZ":
        if (!zero) nextPc = ins.target!;
        break;
      case "HLT":
        nextPc = program.length;
        break;
    }
    const text = `${ins.op}${ins.reg ? ` ${ins.reg}` : ""}${ins.value !== undefined ? `, ${ins.value}` : ""}${ins.target !== undefined ? ` ${ins.target}` : ""}`;
    trace.push({ pc, instr: text, ...r, Z: zero });
    pc = nextPc;
  }
  return { ...r, trace };
}
