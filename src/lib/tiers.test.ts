import { describe, expect, it } from "vitest";
import { subjects } from "@/lib/subjects";
import { effectiveTier, tierCopy, TIERS } from "@/lib/tiers";

const source = { id: "s", title: "S", publisher: "P", kind: "encyclopedia" as const };

describe("trust tiers", () => {
  it("drops to limited when no source text was found", () => {
    expect(effectiveTier("sourced", [{ ...source, excerpt: "Gauss's law relates…" }])).toBe(
      "sourced",
    );
    expect(effectiveTier("verified", [source, { ...source, excerpt: "  " }])).toBe("limited");
    expect(effectiveTier("sourced", [])).toBe("limited");
  });

  it("starts every subject as sourced until its golden set passes", () => {
    for (const s of subjects) expect(TIERS).toContain(s.tier);
  });

  it("has the tested tier between verified and sourced, with its own badge", () => {
    expect(TIERS).toEqual(["verified", "tested", "sourced", "limited"]);
    expect(tierCopy.tested.explain).toContain("85%");
    expect(effectiveTier("tested", [])).toBe("limited");
  });
});
