/*
 * The maths behind the lab simulation templates (syllabus fix, Phase 7B). Pure functions in SI
 * units, tested in labModels.test.ts. The widgets only draw what these return.
 */

export const MU0 = 4e-7 * Math.PI;
export const G = 9.81;

/* ---------- Magnetic field of one or two circular coils (Biot–Savart, summed numerically) ---------- */

export type Coil = {
  /** Centre on the x axis, metres. */
  x: number;
  /** Radius, metres. */
  radius: number;
  turns: number;
  /** Amperes; a negative current flows the other way round. */
  current: number;
  /** Angle between the coil's axis and the x axis, degrees (0 = facing along x), turned in the x-y plane. */
  tiltDeg?: number;
};

const SEGMENTS = 96;

/** The field (Bx, By) in tesla at a point (x, y) of the plane through the coils' axis. */
export function coilFieldAt(coils: readonly Coil[], x: number, y: number): [number, number] {
  let bx = 0;
  let by = 0;
  for (const c of coils) {
    const tilt = ((c.tiltDeg ?? 0) * Math.PI) / 180;
    // The coil's axis n = (cos t, sin t, 0); two directions u, w span its plane.
    const ux = -Math.sin(tilt);
    const uy = Math.cos(tilt);
    const k = (MU0 * c.turns * c.current) / (4 * Math.PI);
    const dPhi = (2 * Math.PI) / SEGMENTS;
    for (let i = 0; i < SEGMENTS; i++) {
      const phi = (i + 0.5) * dPhi;
      const cos = Math.cos(phi);
      const sin = Math.sin(phi);
      // Point on the loop: centre + R (cos φ u + sin φ w), with w = (0, 0, 1).
      const px = c.x + c.radius * cos * ux;
      const py = c.radius * cos * uy;
      const pz = c.radius * sin;
      // dl = R dφ (−sin φ u + cos φ w)
      const dlx = -c.radius * dPhi * sin * ux;
      const dly = -c.radius * dPhi * sin * uy;
      const dlz = c.radius * dPhi * cos;
      const rx = x - px;
      const ry = y - py;
      const rz = -pz;
      const r2 = rx * rx + ry * ry + rz * rz;
      if (r2 < 1e-10) continue;
      const r3 = r2 * Math.sqrt(r2);
      // dB = k (dl × r) / r³; only the in-plane components are needed.
      bx += (k * (dly * rz - dlz * ry)) / r3;
      by += (k * (dlz * rx - dlx * rz)) / r3;
    }
  }
  return [bx, by];
}

/** The textbook on-axis field of one coil: B = μ₀NIR² / 2(R² + x²)^{3/2}. */
export function coilAxialField(c: Coil, x: number): number {
  const d = x - c.x;
  return (MU0 * c.turns * c.current * c.radius ** 2) / (2 * (c.radius ** 2 + d ** 2) ** 1.5);
}

/* ---------- Thin lens or spherical mirror (real-is-positive) ---------- */

export type ImageResult = {
  /** Image distance (positive = real image on the far side of a lens / in front of a mirror). */
  v: number;
  magnification: number;
  real: boolean;
  upright: boolean;
  /** True when the object sits at the focus: the rays leave parallel and no image forms. */
  atInfinity: boolean;
};

/** 1/f = 1/u + 1/v with the object distance u > 0 and f > 0 for a converging lens or concave mirror. */
export function thinLensImage(u: number, f: number): ImageResult {
  if (Math.abs(u - f) < 1e-9) {
    return { v: Infinity, magnification: Infinity, real: false, upright: false, atInfinity: true };
  }
  const v = (u * f) / (u - f);
  const m = -v / u;
  return { v, magnification: m, real: v > 0, upright: m > 0, atInfinity: false };
}

/* ---------- Oscillations ---------- */

/** Period of a simple pendulum, with the large-swing correction (exact to about 0.1% up to 60°). */
export function pendulumPeriod(length: number, g: number, amplitudeDeg: number): number {
  const t0 = 2 * Math.PI * Math.sqrt(length / g);
  const a = (amplitudeDeg * Math.PI) / 180;
  return t0 * (1 + a ** 2 / 16 + (11 * a ** 4) / 3072);
}

/** Period of a mass on a spring, T = 2π√(m/k). */
export function springPeriod(mass: number, k: number): number {
  return 2 * Math.PI * Math.sqrt(mass / k);
}

/* ---------- Acid-base titration (exact charge balance) ---------- */

export type Titration = {
  /** Acid concentration, mol/L. */
  acidConc: number;
  /** Acid volume in the flask, mL. */
  acidVolume: number;
  /** Base (NaOH) concentration in the burette, mol/L. */
  baseConc: number;
  /** pKa of the acid; a strong acid uses a very low pKa. */
  pKa: number;
};

const KW = 1e-14;

/** pH after adding `added` mL of base: solves [H⁺] + [Na⁺] = [OH⁻] + [A⁻] by bisection. */
export function titrationPH(t: Titration, added: number): number {
  const total = t.acidVolume + added;
  const acid = (t.acidConc * t.acidVolume) / total;
  const sodium = (t.baseConc * added) / total;
  const ka = 10 ** -t.pKa;
  // The balance falls as [H⁺] falls, so bisect on log[H⁺] between pH 0 and 14.
  const excess = (logH: number) => {
    const h = 10 ** logH;
    return h + sodium - KW / h - (acid * ka) / (ka + h);
  };
  let lo = -14;
  let hi = 0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (excess(mid) > 0) hi = mid;
    else lo = mid;
  }
  return -(lo + hi) / 2;
}

/** Base volume (mL) that exactly neutralises the acid. */
export function equivalenceVolume(t: Titration): number {
  return (t.acidConc * t.acidVolume) / t.baseConc;
}

/* ---------- Double-pipe heat exchanger (ε-NTU, with temperatures along the length) ---------- */

export type Exchanger = {
  flow: "parallel" | "counter";
  hotIn: number;
  coldIn: number;
  /** Heat capacity rates ṁc_p, W/K. */
  hotRate: number;
  coldRate: number;
  /** Overall conductance UA, W/K. */
  ua: number;
};

export type ExchangerResult = {
  effectiveness: number;
  heat: number;
  hotOut: number;
  coldOut: number;
  /** Log-mean temperature difference, K (Q = UA × LMTD). */
  lmtd: number;
  /** Temperatures at evenly spaced points from the hot inlet (x = 0) to the far end (x = 1). */
  profile: { x: number; hot: number; cold: number }[];
};

export function heatExchanger(e: Exchanger, points = 41): ExchangerResult {
  const cMin = Math.min(e.hotRate, e.coldRate);
  const cMax = Math.max(e.hotRate, e.coldRate);
  const cr = cMin / cMax;
  const ntu = e.ua / cMin;
  let eff: number;
  if (e.flow === "parallel") eff = (1 - Math.exp(-ntu * (1 + cr))) / (1 + cr);
  else if (Math.abs(1 - cr) < 1e-9) eff = ntu / (1 + ntu);
  else eff = (1 - Math.exp(-ntu * (1 - cr))) / (1 - cr * Math.exp(-ntu * (1 - cr)));
  const heat = eff * cMin * (e.hotIn - e.coldIn);
  const hotOut = e.hotIn - heat / e.hotRate;
  const coldOut = e.coldIn + heat / e.coldRate;
  // Both fluids' temperatures follow exponentials in x; march them with small RK4 steps.
  const sign = e.flow === "parallel" ? 1 : -1;
  const deriv = (th: number, tc: number): [number, number] => {
    const q = e.ua * (th - tc);
    return [-q / e.hotRate, (sign * q) / e.coldRate];
  };
  const steps = (points - 1) * 8;
  const h = 1 / steps;
  let th = e.hotIn;
  // Counter flow: at the hot inlet the cold fluid is leaving.
  let tc = e.flow === "parallel" ? e.coldIn : coldOut;
  const profile = [{ x: 0, hot: th, cold: tc }];
  for (let i = 1; i <= steps; i++) {
    const [a1, b1] = deriv(th, tc);
    const [a2, b2] = deriv(th + (h * a1) / 2, tc + (h * b1) / 2);
    const [a3, b3] = deriv(th + (h * a2) / 2, tc + (h * b2) / 2);
    const [a4, b4] = deriv(th + h * a3, tc + h * b3);
    th += (h * (a1 + 2 * a2 + 2 * a3 + a4)) / 6;
    tc += (h * (b1 + 2 * b2 + 2 * b3 + b4)) / 6;
    if (i % 8 === 0) profile.push({ x: i * h, hot: th, cold: tc });
  }
  const d1 = e.flow === "parallel" ? e.hotIn - e.coldIn : e.hotIn - coldOut;
  const d2 = e.flow === "parallel" ? hotOut - coldOut : hotOut - e.coldIn;
  const lmtd = Math.abs(d1 - d2) < 1e-9 ? d1 : (d1 - d2) / Math.log(d1 / d2);
  return { effectiveness: eff, heat, hotOut, coldOut, lmtd, profile };
}

/* ---------- Venturi or orifice meter with a mercury manometer ---------- */

export type FlowMeter = {
  /** Volume flow rate, m³/s. */
  flow: number;
  /** Pipe and throat (or orifice) diameters, m. */
  pipeD: number;
  throatD: number;
  /** Coefficient of discharge (about 0.98 for a venturi, 0.62 for an orifice). */
  cd: number;
};

const WATER = 1000;
const MERCURY = 13600;
const WATER_VISCOSITY = 1e-3;

export type FlowReading = {
  /** Pressure drop between the pipe and the throat, Pa. */
  pressureDrop: number;
  /** Mercury-under-water manometer difference, m. */
  manometer: number;
  pipeVelocity: number;
  throatVelocity: number;
  reynolds: number;
};

/** Q = C_d A₂ √(2Δp / ρ(1 − β⁴)), solved for the readings a flow rate gives. */
export function flowMeterReading(m: FlowMeter): FlowReading {
  const a1 = (Math.PI * m.pipeD ** 2) / 4;
  const a2 = (Math.PI * m.throatD ** 2) / 4;
  const beta4 = (m.throatD / m.pipeD) ** 4;
  const ideal = m.flow / m.cd;
  const pressureDrop = (WATER * (ideal / a2) ** 2 * (1 - beta4)) / 2;
  return {
    pressureDrop,
    manometer: pressureDrop / ((MERCURY - WATER) * G),
    pipeVelocity: m.flow / a1,
    throatVelocity: m.flow / a2,
    reynolds: (WATER * (m.flow / a1) * m.pipeD) / WATER_VISCOSITY,
  };
}

/* ---------- Oscilloscope (two sine channels, Y-T or X-Y) ---------- */

export type Channel = { amplitude: number; frequency: number; phaseDeg: number };

export function channelValue(c: Channel, t: number): number {
  return c.amplitude * Math.sin(2 * Math.PI * c.frequency * t + (c.phaseDeg * Math.PI) / 180);
}

/** Lissajous ratio fx : fy in lowest terms, or null when it is not a small whole-number ratio. */
export function lissajousRatio(fx: number, fy: number): [number, number] | null {
  for (let q = 1; q <= 8; q++) {
    const p = (fx / fy) * q;
    if (Math.abs(p - Math.round(p)) < 1e-6 && Math.round(p) >= 1) {
      const a = Math.round(p);
      const gcd = (m: number, n: number): number => (n === 0 ? m : gcd(n, m % n));
      const d = gcd(a, q);
      return [a / d, q / d];
    }
  }
  return null;
}
