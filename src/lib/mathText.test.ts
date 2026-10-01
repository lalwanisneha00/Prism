import { describe, expect, it } from "vitest";
import { normalizeDisplayMath } from "@/lib/mathText";

describe("normalizeDisplayMath", () => {
  it("moves a one-line $$ formula onto its own lines", () => {
    expect(normalizeDisplayMath("Flux:\n\n$$\Phi = EA$$\n\nDone")).toBe(
      "Flux:\n\n$$\n\Phi = EA\n$$\n\nDone",
    );
  });

  it("leaves inline maths and already-fenced blocks alone", () => {
    const text = "Use $E = kq/r^2$ here.\n\n$$\nx^2\n$$";
    expect(normalizeDisplayMath(text)).toBe(text);
  });

  it("does not touch $$ that appears mid-sentence", () => {
    const text = "The price is $$5 and $$6.";
    expect(normalizeDisplayMath(text)).toBe(text);
  });
});
