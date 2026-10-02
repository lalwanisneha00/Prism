import { describe, expect, it } from "vitest";
import { subjects } from "@/lib/subjects";
import { effectiveTier } from "@/lib/tiers";

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
    for (const s of subjects) expect(["verified", "sourced", "limited"]).toContain(s.tier);
  });
});
