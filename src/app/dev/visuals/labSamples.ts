import type { VisualSpec } from "@/lib/schema";

/** One example of every lab simulation template (syllabus fix, Phase 7B), for the gallery. */
export const labSamples: { lab: string; visual: VisualSpec }[] = [
  {
    lab: "Physics lab: field of a coil",
    visual: {
      type: "widget",
      widget: "coil-field",
      params: { coils: 1, radiusCm: 5, turns: 50, current: 1, separationCm: 5 },
      caption: "Drag the probe along the axis: the field is largest at the centre.",
    },
  },
  {
    lab: "Physics lab: Helmholtz coils",
    visual: {
      type: "widget",
      widget: "coil-field",
      params: { coils: 2, radiusCm: 6, turns: 100, current: 1, separationCm: 6 },
      caption: "Two coils one radius apart: the field between them is nearly uniform.",
    },
  },
  {
    lab: "Physics lab: focal length",
    visual: {
      type: "widget",
      widget: "thin-lens",
      params: { kind: "convex-lens", focalCm: 15, objectCm: 30 },
      caption: "At u = 2f the image is real, inverted and the same size.",
    },
  },
  {
    lab: "Physics lab: simple pendulum",
    visual: {
      type: "widget",
      widget: "oscillation",
      params: { system: "pendulum", lengthCm: 100, massKg: 0.5, springK: 20, amplitudeDeg: 10 },
      caption: "Time 10 swings and compare T²/L with 4π²/g.",
    },
  },
  {
    lab: "Chemistry lab: titration",
    visual: {
      type: "widget",
      widget: "titration",
      params: {
        acid: "weak",
        acidConc: 0.1,
        acidVolume: 25,
        baseConc: 0.1,
        indicator: "phenolphthalein",
      },
      caption: "Acetic acid against NaOH: the end point is above pH 7.",
    },
  },
  {
    lab: "Heat transfer lab",
    visual: {
      type: "widget",
      widget: "heat-exchanger",
      params: { flow: "counter", hotIn: 80, coldIn: 25, hotRate: 1500, coldRate: 1200, ua: 1500 },
      caption: "Switch to parallel flow and compare the heat transferred.",
    },
  },
  {
    lab: "Fluid mechanics lab",
    visual: {
      type: "widget",
      widget: "flow-meter",
      params: { meter: "venturi", pipeMm: 50, throatMm: 25, flowLps: 2 },
      caption: "Raise the flow: the manometer reading grows with Q².",
    },
  },
  {
    lab: "Electronics lab: CRO",
    visual: {
      type: "widget",
      widget: "oscilloscope",
      params: { mode: "xy", freqA: 100, freqB: 200, amplitudeA: 2, amplitudeB: 2, phaseDeg: 90 },
      caption: "A 1 : 2 Lissajous figure: count the loops to find the frequency ratio.",
    },
  },
  {
    lab: "Physics lab: Newton's rings",
    visual: {
      type: "widget",
      widget: "newton-rings",
      params: { wavelengthNm: 589.3, radiusCm: 100, mu: 1 },
      caption:
        "Pick a dark ring, read both sides of it, and watch D² grow in a straight line with n.",
    },
  },
  {
    lab: "Physics lab: Hall effect",
    visual: {
      type: "widget",
      widget: "hall-effect",
      params: { carrier: "n", currentMa: 5, fieldT: 0.3, thicknessMm: 0.5, densityE21: 1 },
      caption: "The field pushes carriers to one face; the charge there is the Hall voltage.",
    },
  },
  {
    lab: "Physics lab: hysteresis",
    visual: {
      type: "widget",
      widget: "hysteresis",
      params: { material: "soft-iron" },
      caption:
        "Soft iron: a thin loop, so little energy is lost each cycle (good for transformer cores).",
    },
  },
  {
    lab: "Physics lab: e/m by Thomson's method",
    visual: {
      type: "widget",
      widget: "em-thomson",
      params: { anodeV: 2000, plateV: 100, plateGapMm: 10, fieldMt: 0 },
      caption: "Raise B until the beam goes straight: then v = E/B and e/m = E²/(2VB²).",
    },
  },
];
