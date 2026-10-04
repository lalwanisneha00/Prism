import { describe, expect, it } from "vitest";
import {
  beerLambert,
  diodeCurrent,
  firstOrderDecay,
  firstOrderRise,
  fullAdder,
  gate,
  gibbsFromEmf,
  loadLine,
  maxEfficiencyFraction,
  nernst,
  opAmpGain,
  opAmpOutput,
  phaseRuleFreedom,
  rectified,
  rectifierDc,
  slipAtMaxTorque,
  synchronousSpeed,
  threePhase,
  torqueSlip,
  transformer,
  waterPhase,
  waterVapourPressure,
} from "@/visuals/wave1/chemElecModels";

describe("chemistry models", () => {
  it("Beer–Lambert: A = εlc and T = 10^−A", () => {
    const r = beerLambert(100, 1, 0.01);
    expect(r.absorbance).toBeCloseTo(1);
    expect(r.transmittance).toBeCloseTo(0.1);
  });
  it("Nernst: E = E° at Q = 1, and the Daniell cell drops as Q rises", () => {
    expect(nernst(1.1, 2, 1)).toBeCloseTo(1.1);
    expect(nernst(1.1, 2, 10)).toBeCloseTo(1.1 - 0.0296, 3);
    expect(gibbsFromEmf(2, 1.1)).toBeCloseTo(-212267, -2);
  });
  it("water boils near 373 K at 1 atm and is solid, liquid or vapour in the right places", () => {
    const tAt1atm = [360, 370, 373.15, 380].find((t) => waterVapourPressure(t) >= 101325);
    expect(tAt1atm).toBeGreaterThanOrEqual(370);
    expect(waterVapourPressure(373.15)).toBeGreaterThan(80000);
    expect(waterVapourPressure(373.15)).toBeLessThan(125000);
    expect(waterPhase(250, 101325)).toBe("solid");
    expect(waterPhase(300, 101325)).toBe("liquid");
    expect(waterPhase(400, 101325)).toBe("vapour");
    expect(waterPhase(700, 30e6)).toBe("supercritical");
    expect(phaseRuleFreedom(1, 3)).toBe(0); // triple point
  });
});

describe("basic electrical models", () => {
  it("star: V_L = √3 V_ph, I_L = I_ph; delta: I_L = √3 I_ph", () => {
    const star = threePhase("star", 400, 10, 0);
    expect(star.vPhase).toBeCloseTo(230.94, 1);
    expect(star.iLine).toBeCloseTo(star.iPhase);
    const delta = threePhase("delta", 400, 10, 0);
    expect(delta.iLine).toBeCloseTo(40 * Math.sqrt(3));
    expect(delta.power).toBeCloseTo(3 * 400 * 40); // P = 3 V_ph I_ph at unity pf
  });
  it("first-order circuits reach 63.2% after one time constant", () => {
    expect(firstOrderRise(2, 10, 2)).toBeCloseTo(6.32, 2);
    expect(firstOrderDecay(2, 10, 2)).toBeCloseTo(3.68, 2);
  });
  it("transformer: V2 = V1 N2/N1, best efficiency where copper loss = core loss", () => {
    const t = transformer({
      v1: 230,
      n1: 1000,
      n2: 100,
      loadKw: 5,
      pf: 1,
      coreLossW: 100,
      fullLoadCuLossW: 400,
      ratedKva: 10,
    });
    expect(t.v2).toBeCloseTo(23);
    expect(t.cuLoss).toBeCloseTo(100);
    expect(t.efficiency).toBeCloseTo(5000 / 5200);
    expect(maxEfficiencyFraction(100, 400)).toBeCloseTo(0.5);
  });
  it("induction motor: maximum torque at s = R2/X2, zero torque at zero slip", () => {
    expect(torqueSlip(0, 0.2, 1)).toBe(0);
    expect(torqueSlip(slipAtMaxTorque(0.2, 1), 0.2, 1)).toBeCloseTo(1);
    expect(torqueSlip(0.1, 0.2, 1)).toBeLessThan(1);
    expect(synchronousSpeed(50, 4)).toBe(1500);
  });
});

describe("basic electronics models", () => {
  it("a diode barely conducts in reverse and conducts strongly forward", () => {
    expect(diodeCurrent(-5)).toBeCloseTo(-1e-14);
    expect(diodeCurrent(0.7)).toBeGreaterThan(1e-3);
    expect(rectified("half", -5)).toBe(0);
    expect(rectified("full", -5)).toBeCloseTo(4.3);
    expect(rectified("bridge", 5)).toBeCloseTo(3.6);
    expect(rectifierDc("full", Math.PI)).toBeCloseTo(2);
  });
  it("voltage-divider bias puts the Q-point on the load line", () => {
    const q = loadLine({ vcc: 12, rc: 2200, re: 1000, r1: 47000, r2: 10000, beta: 100 });
    expect(q.ic).toBeGreaterThan(0.001);
    expect(q.vce).toBeCloseTo(12 - q.ic * 3200);
    expect(q.saturated).toBe(false);
  });
  it("op-amp gains and clipping", () => {
    expect(opAmpGain("inverting", 10000, 1000)).toBe(-10);
    expect(opAmpGain("non-inverting", 9000, 1000)).toBe(10);
    expect(opAmpOutput(-10, 2, 12)).toBe(-12);
  });
  it("gates and the full adder follow their truth tables", () => {
    expect([gate("NAND", true, true), gate("XOR", true, false), gate("NOT", true)]).toEqual([
      false,
      true,
      false,
    ]);
    expect(fullAdder(true, true, true)).toEqual({ sum: true, carry: true });
    expect(fullAdder(true, false, false)).toEqual({ sum: true, carry: false });
  });
});
