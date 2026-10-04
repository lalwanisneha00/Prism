import { describe, expect, it } from "vitest";
import { canonicalUnit, statesUnit } from "@/lib/units";

describe("units", () => {
  it("writes the same unit the same way, however it is written", () => {
    const nc = canonicalUnit("N/C");
    expect(canonicalUnit("N C^-1")).toBe(nc);
    expect(canonicalUnit("N·C⁻¹")).toBe(nc);
    expect(canonicalUnit("newtons per coulomb")).toBe(nc);
    expect(canonicalUnit("\\mathrm{N\\,m^2/C^2}".replace("\\,", " "))).toBe(
      canonicalUnit("N m^2 C^-2"),
    );
    expect(canonicalUnit("V/m")).not.toBe(nc);
    expect(canonicalUnit("Ω")).toBe(canonicalUnit("ohms"));
    expect(canonicalUnit("")).toBeNull();
    expect(canonicalUnit("about 42")).toBeNull();
  });

  it("checks that an answer gives the expected unit", () => {
    expect(statesUnit("E = 7.2 × 10^4 N/C at the point P", "N/C")).toBe(true);
    expect(statesUnit("The field is 7.2e4 newtons per coulomb.", "N/C")).toBe(true);
    expect(statesUnit("E = 7.2 × 10^4 V/m", "N/C")).toBe(false);
    expect(statesUnit("The current is 2.5 A", "A")).toBe(true);
    expect(statesUnit("The current is 2.5", "A")).toBe(false);
    expect(statesUnit("Anything", "furlongs per fortnight 12")).toBe(true);
  });
});
