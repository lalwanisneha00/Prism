import { z } from "zod";

/*
 * Lab simulation templates (syllabus fix, Phase 7B): reusable experiments with adjustable values.
 * Spread into widgetRegistry in ../registry.ts, so they are checked and drawn like every widget.
 * They are not tied to theory topics (`topics` is empty): a lab lesson picks one through
 * src/lib/labs/templates.ts.
 */

const num = (min: number, max: number) => z.number().min(min).max(max);

export const labWidgets = {
  "coil-field": {
    name: "Magnetic field of one or two circular coils (move, turn, reverse)",
    params: z.object({
      coils: z.union([z.literal(1), z.literal(2)]),
      radiusCm: num(2, 9),
      turns: z.int().min(1).max(500),
      current: num(0.1, 5),
      separationCm: num(0, 30),
    }),
    help: "coils 1 or 2; radiusCm 2..9; turns 1..500; current A 0.1..5; separationCm 0..30 (gap between two coils; R gives Helmholtz coils). The student drags coils and the probe along the axis, turns a coil and reverses coil 2's current.",
    topics: [],
  },
  "thin-lens": {
    name: "Lens or spherical mirror ray diagram",
    params: z.object({
      kind: z.enum(["convex-lens", "concave-lens", "concave-mirror", "convex-mirror"]),
      focalCm: num(5, 40),
      objectCm: num(2, 75),
    }),
    help: 'kind "convex-lens" | "concave-lens" | "concave-mirror" | "convex-mirror"; focalCm 5..40 (size of f); objectCm 2..75.',
    topics: [],
  },
  oscillation: {
    name: "Simple pendulum or mass on a spring, with a stopwatch",
    params: z.object({
      system: z.enum(["pendulum", "spring"]),
      lengthCm: num(20, 200),
      massKg: num(0.05, 2),
      springK: num(2, 200),
      amplitudeDeg: num(2, 60),
    }),
    help: 'system "pendulum" | "spring"; lengthCm 20..200; massKg 0.05..2; springK N/m 2..200; amplitudeDeg 2..60 (pendulum). Give all five.',
    topics: [],
  },
  titration: {
    name: "Acid-base titration with an indicator and pH curve",
    params: z.object({
      acid: z.enum(["strong", "weak"]),
      acidConc: num(0.02, 0.5),
      acidVolume: num(5, 50),
      baseConc: num(0.02, 0.5),
      indicator: z.enum(["phenolphthalein", "methyl-orange"]),
    }),
    help: 'acid "strong" (HCl) | "weak" (acetic acid) titrated with NaOH; acidConc and baseConc mol/L 0.02..0.5; acidVolume mL 5..50; indicator "phenolphthalein" | "methyl-orange".',
    topics: [],
  },
  "heat-exchanger": {
    name: "Parallel or counter-flow double-pipe heat exchanger",
    params: z
      .object({
        flow: z.enum(["parallel", "counter"]),
        hotIn: num(40, 150),
        coldIn: num(5, 60),
        hotRate: num(200, 5000),
        coldRate: num(200, 5000),
        ua: num(100, 8000),
      })
      .refine((p) => p.hotIn >= p.coldIn + 5, { message: "hotIn must be at least 5 above coldIn" }),
    help: 'flow "parallel" | "counter"; hotIn °C 40..150; coldIn °C 5..60 (at least 5 below hotIn); hotRate and coldRate = ṁcₚ in W/K 200..5000; ua W/K 100..8000.',
    topics: [],
  },
  "flow-meter": {
    name: "Venturi or orifice meter with a mercury manometer",
    params: z
      .object({
        meter: z.enum(["venturi", "orifice"]),
        pipeMm: num(25, 150),
        throatMm: num(10, 145),
        flowLps: num(0.2, 10),
      })
      .refine((p) => p.throatMm <= p.pipeMm - 5, {
        message: "throatMm must be at least 5 smaller than pipeMm",
      }),
    help: 'meter "venturi" | "orifice"; pipeMm 25..150; throatMm 10..145 (at least 5 below pipeMm); flowLps L/s 0.2..10.',
    topics: [],
  },
  oscilloscope: {
    name: "Two-channel oscilloscope (Y-T and X-Y Lissajous)",
    params: z.object({
      mode: z.enum(["yt", "xy"]),
      freqA: num(50, 1000),
      freqB: num(50, 1000),
      amplitudeA: num(0.5, 3.5),
      amplitudeB: num(0.5, 3.5),
      phaseDeg: num(0, 360),
    }),
    help: 'mode "yt" | "xy"; freqA, freqB Hz 50..1000 (multiples of 50); amplitudeA, amplitudeB V 0.5..3.5; phaseDeg 0..360 (CH2 relative to CH1).',
    topics: [],
  },
  "newton-rings": {
    name: "Newton's rings seen in a travelling microscope, with the D² against n graph",
    params: z.object({
      wavelengthNm: num(400, 700),
      radiusCm: num(50, 400),
      mu: num(1, 1.6),
    }),
    help: "wavelengthNm 400..700 (sodium 589.3); radiusCm R of the plano-convex lens 50..400; mu refractive index of the film 1..1.6 (1 = air). The student picks a ring, reads both cross-wire positions and sees D² rise in a straight line with n.",
    topics: [],
  },
  "hall-effect": {
    name: "Hall effect in a semiconductor slab (carriers, Hall voltage, V_H against I)",
    params: z.object({
      carrier: z.enum(["n", "p"]),
      currentMa: num(0.5, 10),
      fieldT: num(0.05, 1),
      thicknessMm: num(0.2, 2),
      densityE21: num(0.1, 100),
    }),
    help: 'carrier "n" | "p"; currentMa 0.5..10; fieldT 0.05..1; thicknessMm 0.2..2; densityE21 carrier density in units of 10^21 per m³ (germanium about 1). Give all five.',
    topics: [],
  },
  hysteresis: {
    name: "B-H hysteresis loop of a ferromagnetic sample (domains, retentivity, coercivity, loss)",
    params: z.object({ material: z.enum(["soft-iron", "steel", "ferrite"]) }),
    help: 'material "soft-iron" | "steel" | "ferrite" (the student can switch). An AC field traces the loop; Br, Hc and the energy lost per cycle are shown.',
    topics: [],
  },
  "em-thomson": {
    name: "Thomson's e/m tube: electron beam bent by crossed electric and magnetic fields",
    params: z.object({
      anodeV: num(500, 3000),
      plateV: num(0, 1000),
      plateGapMm: num(5, 30),
      fieldMt: num(0, 3),
    }),
    help: "anodeV accelerating voltage 500..3000; plateV deflecting plate voltage 0..1000; plateGapMm 5..30; fieldMt magnetic field of the coils in mT 0..3. The student balances the beam (E = vB) and reads e/m.",
    topics: [],
  },
} as const;
