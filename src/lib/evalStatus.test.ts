import { describe, expect, it } from "vitest";
import { loadGoldenSets } from "../../eval/golden";
import status from "@/data/evalStatus.json";
import { evalStatusOf } from "@/lib/evalStatus";

describe("eval status", () => {
  it("lists exactly the subjects that have a golden set", () => {
    expect(status.goldenSubjects).toEqual(
      loadGoldenSets()
        .map((g) => g.subject)
        .sort(),
    );
  });
  it("tells measured, waiting and untested subjects apart", () => {
    expect(evalStatusOf("applied-physics")).toBe("measured");
    expect(evalStatusOf("this-subject-does-not-exist")).toBe("no-test-set");
    const pending = status.goldenSubjects.filter((s) => evalStatusOf(s) === "pending");
    expect(pending.length).toBeGreaterThan(0);
  });
});
