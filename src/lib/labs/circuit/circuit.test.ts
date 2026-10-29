import { describe, expect, it } from "vitest";
import { CircuitSchema, formatSI, type Circuit } from "@/lib/labs/circuit/model";
import { layoutCircuit } from "@/lib/labs/circuit/layout";
import { describeWire, solveCircuit, sweep } from "@/lib/labs/circuit/solve";
import { circuitProblems } from "@/lib/labs/circuit/validate";

/** Ohm's law: battery, key, rheostat, ammeter, resistor; voltmeter across the resistor. */
const ohm: Circuit = CircuitSchema.parse({
  components: [
    { id: "B", type: "battery", label: "Battery", value: 10, adjust: { min: 0, max: 12 } },
    { id: "K", type: "switch", label: "Key" },
    { id: "A", type: "ammeter", label: "Ammeter" },
    { id: "R", type: "resistor", label: "Resistor", value: 10 },
    { id: "V", type: "voltmeter", label: "Voltmeter" },
  ],
  connections: [
    { from: "B.+", to: "K.1" },
    { from: "K.2", to: "A.+" },
    { from: "A.-", to: "R.1" },
    { from: "R.2", to: "B.-" },
    { from: "V.+", to: "R.1" },
    { from: "V.-", to: "R.2" },
  ],
  wiring: [
    { text: "Battery to key", connections: [0] },
    { text: "Key to ammeter, ammeter to resistor", connections: [1, 2] },
    { text: "Resistor back to battery", connections: [3] },
    { text: "Voltmeter across the resistor", connections: [4, 5] },
  ],
  plot: { sweep: "B", x: "V", y: "A", xLabel: "V (V)", yLabel: "I (A)" },
});

const withConnections = (
  connections: Circuit["connections"],
  wiring?: Circuit["wiring"],
): Circuit => ({
  ...ohm,
  connections,
  wiring: wiring ?? [{ text: "all", connections: connections.map((_, i) => i) }],
});

describe("circuitProblems", () => {
  it("passes a correct circuit", () => {
    expect(circuitProblems(ohm)).toEqual([]);
  });

  it("finds a voltmeter in series", () => {
    const c = withConnections([
      { from: "B.+", to: "K.1" },
      { from: "K.2", to: "A.+" },
      { from: "A.-", to: "V.+" },
      { from: "V.-", to: "R.1" },
      { from: "R.2", to: "B.-" },
    ]);
    expect(circuitProblems(c).join(" ")).toMatch(/in series with R/);
  });

  it("finds an ammeter in parallel and a floating terminal", () => {
    const c = withConnections([
      { from: "B.+", to: "K.1" },
      { from: "K.2", to: "R.1" },
      { from: "R.2", to: "B.-" },
      { from: "A.+", to: "R.1" },
      { from: "A.-", to: "R.2" },
      { from: "V.+", to: "R.1" },
    ]);
    const p = circuitProblems(c).join(" ");
    expect(p).toMatch(/A \(Ammeter\): it is in parallel/);
    expect(p).toMatch(/terminal "-" is not connected/);
  });

  it("finds wires that no wiring step adds", () => {
    const c = { ...ohm, wiring: [{ text: "x", connections: [0, 1, 2] }] };
    expect(circuitProblems(c).join(" ")).toMatch(/connections 3, 4, 5 are never added/);
  });

  it("finds unknown terminals", () => {
    const c = withConnections([...ohm.connections.slice(0, 5), { from: "V.-", to: "R.3" }]);
    expect(circuitProblems(c).join(" ")).toMatch(/R has no terminal "3"/);
  });
});

describe("solveCircuit", () => {
  it("reads Ohm's law", () => {
    const s = solveCircuit(ohm);
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.readings.A.value).toBeCloseTo(1, 4);
    expect(s.readings.V.value).toBeCloseTo(10, 3);
  });

  it("follows the student's changes, and an open key stops the current", () => {
    const s = solveCircuit(ohm, { B: { value: 5 }, R: { value: 20 } });
    expect(s.ok && s.readings.A.value).toBeCloseTo(0.25, 4);
    const open = solveCircuit(ohm, { K: { closed: false } });
    expect(open.ok && Math.abs(open.readings.A.value)).toBeLessThan(1e-6);
  });

  it("shows a reversed ammeter as a negative reading", () => {
    const c = withConnections([
      { from: "B.+", to: "K.1" },
      { from: "K.2", to: "A.-" },
      { from: "A.+", to: "R.1" },
      { from: "R.2", to: "B.-" },
      { from: "V.+", to: "R.1" },
      { from: "V.-", to: "R.2" },
    ]);
    const s = solveCircuit(c);
    expect(s.ok && s.readings.A.value).toBeCloseTo(-1, 4);
  });

  it("puts a silicon diode near 0.7 V and an LED near 2 V", () => {
    for (const [type, lo, hi] of [
      ["diode", 0.55, 0.8],
      ["led", 1.7, 2.2],
    ] as const) {
      const c: Circuit = {
        components: [
          { id: "B", type: "dc-supply", label: "Supply", value: 5 },
          { id: "R", type: "resistor", label: "R", value: 330 },
          { id: "D", type, label: "D" },
          { id: "V", type: "voltmeter", label: "V" },
        ],
        connections: [
          { from: "B.+", to: "R.1" },
          { from: "R.2", to: "D.anode" },
          { from: "D.cathode", to: "B.-" },
          { from: "V.+", to: "D.anode" },
          { from: "V.-", to: "D.cathode" },
        ],
        wiring: [{ text: "all", connections: [0, 1, 2, 3, 4] }],
      };
      expect(circuitProblems(c)).toEqual([]);
      const s = solveCircuit(c);
      expect(s.ok).toBe(true);
      if (s.ok) {
        expect(s.readings.V.value).toBeGreaterThan(lo);
        expect(s.readings.V.value).toBeLessThan(hi);
      }
    }
  });

  it("solves an AC RC circuit at its frequency", () => {
    const c: Circuit = {
      components: [
        { id: "G", type: "function-generator", label: "Generator", value: 1, frequency: 159.15 },
        { id: "R", type: "resistor", label: "R", value: 1000 },
        { id: "C", type: "capacitor", label: "C", value: 1e-6 },
        { id: "V", type: "voltmeter", label: "V" },
      ],
      connections: [
        { from: "G.+", to: "R.1" },
        { from: "R.2", to: "C.1" },
        { from: "C.2", to: "G.-" },
        { from: "V.+", to: "C.1" },
        { from: "V.-", to: "C.2" },
      ],
      wiring: [{ text: "all", connections: [0, 1, 2, 3, 4] }],
    };
    const s = solveCircuit(c);
    // At the corner frequency the capacitor gets 1/√2 of the input.
    expect(s.ok && s.readings.V.value).toBeCloseTo(Math.SQRT1_2, 2);
  });

  it("gives a solar cell an open-circuit voltage and short-circuit current", () => {
    const c: Circuit = {
      components: [
        { id: "S", type: "solar-cell", label: "Solar cell", value: 0.03 },
        { id: "L", type: "rheostat", label: "Load", value: 1e6, adjust: { min: 0.1, max: 200 } },
        { id: "A", type: "ammeter", label: "A" },
        { id: "V", type: "voltmeter", label: "V" },
      ],
      connections: [
        { from: "S.+", to: "A.+" },
        { from: "A.-", to: "L.1" },
        { from: "L.2", to: "S.-" },
        { from: "V.+", to: "S.+" },
        { from: "V.-", to: "S.-" },
      ],
      wiring: [{ text: "all", connections: [0, 1, 2, 3, 4] }],
    };
    const open = solveCircuit(c);
    expect(open.ok && open.readings.V.value).toBeGreaterThan(0.3);
    const short = solveCircuit(c, { L: { value: 0.1 } });
    expect(short.ok && short.readings.A.value).toBeCloseTo(0.03, 2);
  });

  it("does not pretend to model a transistor", () => {
    const c: Circuit = {
      ...ohm,
      components: [...ohm.components, { id: "Q", type: "transistor-npn", label: "Q" }],
    };
    expect(solveCircuit(c)).toMatchObject({ ok: false, reason: "unsupported" });
  });
});

describe("sweep", () => {
  it("draws a straight V-I line for a resistor", () => {
    const pts = sweep(ohm, {});
    expect(pts.length).toBeGreaterThan(30);
    for (const p of pts) expect(p.y).toBeCloseTo(p.x / 10, 4);
  });
});

describe("layoutCircuit", () => {
  it("draws the loop round a rectangle with the voltmeter across the resistor", () => {
    const s = layoutCircuit(ohm);
    expect(s).not.toBeNull();
    if (!s) return;
    expect(s.parts.map((p) => p.comp.id).sort()).toEqual(["A", "B", "K", "R", "V"]);
    const R = s.parts.find((p) => p.comp.id === "R")!;
    const V = s.parts.find((p) => p.comp.id === "V")!;
    // The voltmeter is drawn parallel to the resistor, offset from it.
    const horizontal = (p: typeof R) => Math.abs(p.a.y - p.b.y) < 1;
    expect(horizontal(R)).toBe(horizontal(V));
    expect(s.dots.length).toBeGreaterThanOrEqual(2);
    for (const p of s.parts)
      for (const q of [p.a, p.b]) {
        expect(q.x).toBeGreaterThanOrEqual(0);
        expect(q.y).toBeGreaterThanOrEqual(0);
        expect(q.x).toBeLessThanOrEqual(s.width);
        expect(q.y).toBeLessThanOrEqual(s.height);
      }
  });

  it("gives no schematic for three-terminal parts", () => {
    const c: Circuit = {
      ...ohm,
      components: [...ohm.components, { id: "Q", type: "transistor-npn", label: "Q" }],
    };
    expect(layoutCircuit(c)).toBeNull();
  });
});

describe("helpers", () => {
  it("formats SI values and describes wires", () => {
    expect(formatSI(4700, "Ω")).toBe("4.7 kΩ");
    expect(formatSI(0.0012, "A")).toBe("1.2 mA");
    expect(describeWire(ohm, 0)).toBe("Battery (+) → Key (1)");
  });
});
