import { describe, expect, it } from "vitest";
import {
  aliasFrequency,
  amEfficiency,
  amplifierGainDb,
  butterworth,
  carsonBandwidth,
  chebyshev,
  chipSelect,
  constellation,
  convolve,
  counterSequence,
  dacOutput,
  dftMagnitude,
  diffAmp,
  dynamicPower,
  firLowpass,
  firResponse,
  inverterVout,
  isStable,
  loadPower,
  minimiseSop,
  nextState,
  nmosCurrent,
  physicalAddress,
  polarisationKind,
  poleZeroResponse,
  quantise,
  reflectionCoefficient,
  runAccumulator,
  sarAdc,
  seriesRlc,
  skinDepth,
  sqnrDb,
  standingWaveVoltage,
  vswr,
  waveguideCutoff,
} from "@/visuals/wave2/eceModels";

describe("digital logic", () => {
  it("minimises sums of products", () => {
    expect(minimiseSop(["A", "B"], [1, 3])).toBe("B");
    expect(minimiseSop(["A", "B", "C"], [0, 1, 2, 3])).toBe("A'");
    expect(minimiseSop(["A", "B", "C"], [1, 3, 5, 7])).toBe("C");
    expect(minimiseSop(["A", "B", "C", "D"], [0, 2, 8, 10])).toBe("B'D'");
    expect(minimiseSop(["A", "B", "C"], [3, 5, 6, 7])).toBe("AB + AC + BC");
    expect(minimiseSop(["A", "B"], [])).toBe("0");
  });
  it("flip-flops and counters", () => {
    expect(nextState("JK", 0, 1, 1)).toBe(1);
    expect(nextState("JK", 1, 1, 1)).toBe(0);
    expect(nextState("SR", 0, 1, 1)).toBeNull();
    expect(nextState("T", 1, 1)).toBe(0);
    expect(counterSequence(2, 4, "up")).toEqual([0, 1, 2, 3, 0]);
    expect(counterSequence(3, 3, "ring")).toEqual([1, 2, 4, 1]);
    expect(counterSequence(2, 4, "johnson")).toEqual([0, 1, 3, 2, 0]);
  });
});

describe("signals and filters", () => {
  it("convolution and aliasing", () => {
    expect(convolve([1, 2, 3], [1, 1])).toEqual([1, 3, 5, 3]);
    expect(aliasFrequency(900, 1000)).toBe(100);
    expect(aliasFrequency(300, 1000)).toBe(300);
  });
  it("DFT puts a sinusoid's energy in its bin", () => {
    const N = 16;
    const x = Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * 3 * n) / N));
    const X = dftMagnitude(x);
    expect(X[3]).toBeCloseTo(8);
    expect(X[5]).toBeCloseTo(0);
  });
  it("a windowed FIR low-pass passes low and blocks high frequencies", () => {
    const h = firLowpass(31, 0.1, "hamming");
    expect(firResponse(h, 0)).toBeCloseTo(1);
    expect(firResponse(h, 0.3)).toBeLessThan(0.01);
  });
  it("Butterworth is −3 dB at cut-off; Chebyshev ripples in the passband", () => {
    expect(20 * Math.log10(butterworth(1, 1, 4))).toBeCloseTo(-3.01, 1);
    expect(chebyshev(0.5, 1, 3, 0.5)).toBeLessThanOrEqual(1);
  });
  it("pole–zero response and stability", () => {
    const pole = [{ re: -1, im: 0 }];
    expect(poleZeroResponse(pole, [], 0, "s")).toBeCloseTo(1);
    expect(poleZeroResponse(pole, [], 1, "s")).toBeCloseTo(1 / Math.SQRT2);
    expect(isStable(pole, "s")).toBe(true);
    expect(isStable([{ re: 1.1, im: 0 }], "z")).toBe(false);
  });
});

describe("communication", () => {
  it("AM efficiency, Carson's rule, quantisation and constellations", () => {
    expect(amEfficiency(1)).toBeCloseTo(1 / 3);
    expect(carsonBandwidth(15000, 5)).toBe(180000);
    expect(sqnrDb(8)).toBeCloseTo(49.92);
    expect(Math.abs(quantise(0.3, 3) - 0.3)).toBeLessThanOrEqual(0.125);
    expect(constellation("16-QAM")).toHaveLength(16);
    const qpsk = constellation("QPSK");
    expect(qpsk.every((p) => Math.abs(Math.hypot(p.re, p.im) - 1) < 1e-9)).toBe(true);
  });
});

describe("transmission lines and waves", () => {
  it("matched, short and resistive loads", () => {
    expect(vswr(reflectionCoefficient({ re: 50, im: 0 }, 50))).toBeCloseTo(1);
    const g = reflectionCoefficient({ re: 100, im: 0 }, 50);
    expect(g.re).toBeCloseTo(1 / 3);
    expect(vswr(g)).toBeCloseTo(2);
    expect(standingWaveVoltage({ re: -1, im: 0 }, 0)).toBeCloseTo(0); // short: voltage node at the load
    expect(standingWaveVoltage({ re: -1, im: 0 }, 0.25)).toBeCloseTo(2);
  });
  it("waveguide cut-off, skin depth and polarisation", () => {
    expect(waveguideCutoff(0.02286, 0.01016, 1, 0) / 1e9).toBeCloseTo(6.56, 1); // WR-90
    expect(skinDepth(1e6, 5.8e7) * 1e6).toBeCloseTo(66, 0); // copper at 1 MHz ≈ 66 µm
    expect(polarisationKind(1, 1, 90)).toBe("circular");
    expect(polarisationKind(1, 0.5, 0)).toBe("linear");
    expect(polarisationKind(1, 0.5, 90)).toBe("elliptical");
  });
});

describe("circuits", () => {
  it("series resonance and maximum power transfer", () => {
    const r = seriesRlc(10, 0.01, 1e-6, 1591.55);
    expect(r.f0).toBeCloseTo(1591.55, 1);
    expect(r.current).toBeCloseTo(0.1, 3);
    expect(r.q).toBeCloseTo(10);
    expect(loadPower(10, 5, 5)).toBeGreaterThan(loadPower(10, 5, 4));
    expect(loadPower(10, 5, 5)).toBeGreaterThan(loadPower(10, 5, 6));
  });
  it("amplifier response, differential amp, DAC and SAR ADC", () => {
    expect(amplifierGainDb(1000, 40, 10, 100000)).toBeCloseTo(40, 0);
    expect(amplifierGainDb(10, 40, 10, 100000)).toBeCloseTo(37, 0);
    expect(diffAmp(1.01, 1.0, 100, 0.01).cmrrDb).toBeCloseTo(80);
    expect(dacOutput(8, 4, 5)).toBe(2.5);
    expect(sarAdc(3.3, 8, 5).code).toBe(168);
  });
});

describe("MOS, CMOS and microprocessors", () => {
  it("MOSFET regions and the inverter switching", () => {
    expect(nmosCurrent(0.3, 1, 0.5, 1).region).toBe("cut-off");
    expect(nmosCurrent(1.5, 0.2, 0.5, 1).region).toBe("triode (linear)");
    expect(nmosCurrent(1.5, 2, 0.5, 1).id).toBeCloseTo(0.5);
    expect(inverterVout(0, 3.3, 0.5, -0.5, 1, 1)).toBeCloseTo(3.3, 1);
    expect(inverterVout(3.3, 3.3, 0.5, -0.5, 1, 1)).toBeCloseTo(0, 1);
    expect(inverterVout(1.65, 3.3, 0.5, -0.5, 1, 1)).toBeCloseTo(1.65, 0);
    expect(dynamicPower(0.1, 1e-9, 1, 1e9)).toBeCloseTo(0.1);
  });
  it("8086 addressing, chip select and a counting loop", () => {
    expect(physicalAddress(0x1000, 0x0020)).toBe(0x10020);
    expect(chipSelect(0x2400, 0x1000, 4)).toEqual({ chip: 2, offset: 0x400 });
    const r = runAccumulator([
      { op: "MVI", reg: "A", value: 0 },
      { op: "MVI", reg: "B", value: 5 },
      { op: "MVI", reg: "C", value: 3 },
      { op: "ADD", reg: "B" },
      { op: "DCR", reg: "C" },
      { op: "JNZ", target: 3 },
      { op: "HLT" },
    ]);
    expect(r.A).toBe(15);
  });
});
