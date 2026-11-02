import { describe, expect, it } from "vitest";
import { iconLeft, nextSide, reservedWidth, type LabelSide, type NavLayout } from "@/lib/navHover";

// Nine items like the real menu: 44px icons, 4px gaps, names opened 110px wide.
const g: NavLayout = { closed: [44, 44, 46, 44, 44, 44, 44, 44, 44], label: 110, gap: 4 };
const n = g.closed.length;

describe("nextSide", () => {
  it("opens on the right from nothing or when moving left, on the left when moving right", () => {
    expect(nextSide(null, 3)).toBe("right");
    expect(nextSide(5, 3)).toBe("right");
    expect(nextSide(2, 3)).toBe("left");
  });
});

describe("no icon moves under the cursor", () => {
  it("going from any open item to any other keeps the new item's icon still", () => {
    for (let a = 0; a < n; a++) {
      for (const sideA of ["left", "right"] as LabelSide[]) {
        for (let b = 0; b < n; b++) {
          if (a === b) continue;
          const before = iconLeft(g, a, sideA, b);
          const after = iconLeft(g, b, nextSide(a, b), b);
          expect(after, `${a}(${sideA}) -> ${b}`).toBe(before);
        }
      }
    }
  });

  it("opening the first item from nothing keeps its icon still", () => {
    for (let b = 0; b < n; b++) {
      expect(iconLeft(g, b, nextSide(null, b), b)).toBe(iconLeft(g, null, "right", b));
    }
  });
});

describe("reservedWidth", () => {
  it("is the closed menu plus one open name", () => {
    expect(reservedWidth(g)).toBe(44 * 8 + 46 + 8 * 4 + 110);
    expect(reservedWidth({ closed: [], label: 110, gap: 4 })).toBe(0);
  });
});
