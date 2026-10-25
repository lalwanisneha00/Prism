import { describe, expect, it } from "vitest";
import { choicesFor, pickId, visibleSubjects } from "@/lib/pdeu/electives";
import type { Subject } from "@/lib/subjects";

const option = (id: string, key: string) =>
  ({
    id,
    offerings: [{ branch: "me", key, semester: 7, category: "", credits: 3 }],
  }) as unknown as Subject;

describe("elective slots", () => {
  const slot = "s7-program-elective";
  const list = ["a", "b", "c", "d"].map((x) => option(x, `${slot}--${x}`));

  it("shows only the chosen option of a one-pick slot (old saved choices still work)", () => {
    expect(visibleSubjects(list, "me", { [`me/${slot}`]: `${slot}--b` }).map((s) => s.id)).toEqual([
      "b",
    ]);
  });

  it("shows every chosen option of a slot where the student takes three", () => {
    const choices = {
      [pickId("me", slot, 1)]: `${slot}--a`,
      [pickId("me", slot, 2)]: `${slot}--c`,
      [pickId("me", slot, 3)]: `${slot}--d`,
    };
    expect(pickId("me", slot, 2)).toBe(`me/${slot}#2`);
    expect(visibleSubjects(list, "me", choices).map((s) => s.id)).toEqual(["a", "c", "d"]);
    expect(choicesFor(choices, "me", slot, 3)).toEqual([`${slot}--a`, `${slot}--c`, `${slot}--d`]);
    expect(choicesFor({}, "me", slot, 2)).toEqual(["", ""]);
  });
});
