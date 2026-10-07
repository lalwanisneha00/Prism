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
  it("shows no score until the PDEU subjects' accuracy tests are run", () => {
    expect(evalStatusOf("applied-physics")).toBe("no-test-set");
    expect(evalStatusOf("this-subject-does-not-exist")).toBe("no-test-set");
    expect(status.goldenSubjects).toEqual([]);
  });
});
