import { describe, expect, it } from "vitest";
import type { Circuit } from "@/lib/labs/circuit/model";
import { layoutSetup, perRow, setupOrder, wrapLabel } from "@/lib/labs/setupLayout";
import { circuitStepTargets, setupStepTargets } from "@/lib/labs/stepTargets";

const setup = {
  parts: [
    { id: "screen", label: "Screen" },
    { id: "lamp", label: "Sodium vapour lamp" },
    { id: "lens", label: "Convex lens (f = 20 cm)" },
  ],
  links: [
    { from: "lamp", to: "lens" },
    { from: "lens", to: "screen" },
  ],
};

const circuit: Pick<Circuit, "components"> = {
  components: [
    { id: "B1", type: "dc-supply", label: "DC power supply" },
    { id: "A1", type: "ammeter", label: "Ammeter (0-250 mA)" },
    { id: "R1", type: "rheostat", label: "Load rheostat" },
    { id: "V1", type: "voltmeter", label: "Voltmeter (0-10 V)" },
  ],
};

describe("which parts a procedure step uses", () => {
  it("keeps the parts a setup step lists", () => {
    expect(setupStepTargets({ text: "Switch on.", parts: ["lamp", "nope"] }, setup)).toEqual([
      "lamp",
    ]);
  });

  it("finds setup parts named in the words when none are listed", () => {
    expect(
      setupStepTargets(
        { text: "Move the convex lens until the screen shows it.", parts: [] },
        setup,
      ),
    ).toEqual(["screen", "lens"]);
    expect(setupStepTargets({ text: "Wait two minutes.", parts: [] }, setup)).toEqual([]);
  });

  it("matches listed circuit parts without case", () => {
    expect(circuitStepTargets({ text: "Wire it.", parts: ["r1", "a1"] }, circuit)).toEqual([
      "R1",
      "A1",
    ]);
  });

  it("finds circuit parts by label, id, then by kind", () => {
    expect(
      circuitStepTargets({ text: "Set the rheostat to its maximum.", parts: [] }, circuit),
    ).toEqual(["R1"]);
    expect(circuitStepTargets({ text: "Connect R1 to A1.", parts: [] }, circuit)).toEqual([
      "A1",
      "R1",
    ]);
    expect(
      circuitStepTargets({ text: "Record the current and voltage.", parts: [] }, circuit),
    ).toEqual(["A1", "V1"]);
  });
});

describe("setup drawing layout", () => {
  it("orders parts along their links", () => {
    expect(setupOrder(setup.parts, setup.links)).toEqual(["lamp", "lens", "screen"]);
  });

  it("puts up to four parts on one bench and snakes longer setups", () => {
    expect(perRow(4)).toBe(4);
    expect(perRow(5)).toBe(3);
    const parts = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, label: `Part ${i}` }));
    const links = parts.slice(1).map((p, i) => ({ from: parts[i].id, to: p.id }));
    const { placed, rows } = layoutSetup(parts, links);
    expect(rows).toBe(2);
    // p3 starts the second row under p2, at the right.
    expect(placed.get("p3")!.col).toBe(2);
    expect(placed.get("p4")!.col).toBe(1);
    expect(placed.get("p2")!.n).toBe(3);
  });

  it("wraps labels into two lines", () => {
    expect(wrapLabel("Newton's rings apparatus", 14)).toEqual(["Newton's rings", "apparatus"]);
    expect(wrapLabel("A very long label that goes on and on", 10)).toHaveLength(2);
    expect(wrapLabel("Lens", 10)).toEqual(["Lens"]);
  });
});
