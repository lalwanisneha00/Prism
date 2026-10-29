import { describe, expect, it } from "vitest";
import {
  applyRecheck,
  planRecheck,
  unitChapters,
  type RecheckChapter,
} from "@/lib/syllabusFix/handoutRecheck";
import type { ParsedUnit } from "@/lib/syllabusFix/handoutCourse";

const unit = (order: number, name: string, topics: string[]): ParsedUnit => ({
  order,
  name,
  topics,
});
const topic = (name: string, status?: string) => ({
  id: name.toLowerCase().replace(/[^a-z]+/g, "-"),
  name,
  ...(status ? { status } : {}),
});

// A shortened Strength of Material: the handout's unit 1 topics sit in "Deflection", and two of
// unit 3's are hidden in a retired copy of the unit.
const handout = [
  unit(1, "Stress, Strain and Stress Transformation", [
    "factor of safety",
    "statically indeterminate bars",
    "compound stresses on an inclined plane",
    "Mohr's circle for principal stresses",
  ]),
  unit(3, "Shear Stress in Beams and Torsion of Shaft", [
    "shear stress variation in beams",
    "Torsion of circular shafts",
    "Shaft in parallel and series",
  ]),
  unit(4, "Deflection of Beams", [
    "deflection and radius of curvature",
    "Differential equation for the elastic line",
    "Castigliano's theorem",
  ]),
];
const chapters: RecheckChapter[] = [
  {
    id: "simple",
    name: "SIMPLE STRESSES",
    topics: [topic("factor of safety"), topic("statically indeterminate bars")],
  },
  {
    id: "torsion",
    name: "TORSION",
    topics: [
      topic("stress"),
      topic("Torsion of circular shafts"),
      topic("Shaft in parallel and series"),
    ],
  },
  {
    id: "deflection",
    name: "DEFLECTION OF BEAMS",
    topics: [
      topic("deflection and radius of curvature"),
      topic("compound stresses on an inclined plane"),
      topic("Differential equation for the elastic line"),
      topic("Mohr's circle for principal stresses"),
      topic("Castigliano's theorem"),
    ],
  },
  {
    id: "shear-copy",
    name: "Shear Stress in Beams and Torsion of Shaft",
    status: "retired",
    topics: [
      topic("shear stress variation in beams", "retired"),
      topic("Torsion of circular shafts", "retired"),
    ],
  },
];

describe("handout re-check (Phase 8)", () => {
  it("gives each unit the active chapter holding most of its topics", () => {
    const map = unitChapters(chapters, handout);
    expect([...map.entries()]).toEqual(
      expect.arrayContaining([
        [0, "simple"],
        [1, "torsion"],
        [2, "deflection"],
      ]),
    );
  });

  it("moves misplaced topics and shows hidden handout topics, never a vague one-word topic", () => {
    const fixes = planRecheck(chapters, [handout]);
    expect(fixes).toEqual([
      expect.objectContaining({
        kind: "move",
        name: "compound stresses on an inclined plane",
        to: "simple",
      }),
      expect.objectContaining({
        kind: "move",
        name: "Mohr's circle for principal stresses",
        to: "simple",
      }),
      expect.objectContaining({
        kind: "unhide",
        name: "shear stress variation in beams",
        from: "shear-copy",
        to: "torsion",
      }),
    ]);
    // "Torsion of circular shafts" is already visible, so its hidden copy stays hidden.
    expect(fixes.some((f) => f.from === "shear-copy" && f.name.startsWith("Torsion"))).toBe(false);
    expect(fixes.some((f) => f.name === "stress")).toBe(false);
  });

  it("applies the fixes in handout order and records where a topic came from", () => {
    const fixes = planRecheck(chapters, [handout]);
    const out = applyRecheck(chapters, fixes, [handout], (_t, from) => ({ movedFrom: from }));
    const names = (id: string) => out.find((c) => c.id === id)!.topics.map((t) => t.name);
    expect(names("simple")).toEqual([
      "factor of safety",
      "statically indeterminate bars",
      "compound stresses on an inclined plane",
      "Mohr's circle for principal stresses",
    ]);
    expect(names("torsion")[0]).toBe("shear stress variation in beams");
    const shown = out.find((c) => c.id === "torsion")!.topics[0];
    expect(shown.status).toBeUndefined();
    expect(shown.movedFrom).toBe("shear-copy");
    // The input is not changed.
    expect(chapters[2].topics).toHaveLength(5);
    // Running the plan again finds nothing left to do.
    expect(planRecheck(out, [handout])).toEqual([]);
  });

  it("leaves a topic alone when two handouts of the course disagree", () => {
    const other = [
      handout[2],
      handout[1],
      unit(1, "Stresses", [
        "compound stresses on an inclined plane",
        "factor of safety",
        "statically indeterminate bars",
      ]),
    ];
    const fixes = planRecheck(chapters, [handout, other.map((u, i) => ({ ...u, order: i + 1 }))]);
    expect(fixes.some((f) => f.name === "compound stresses on an inclined plane")).toBe(true);
    const clash = [
      unit(1, "Beams", [
        "Mohr's circle for principal stresses",
        "deflection and radius of curvature",
        "Castigliano's theorem",
      ]),
    ];
    const none = planRecheck(chapters, [handout, clash]);
    expect(none.some((f) => f.name.startsWith("Mohr"))).toBe(false);
  });

  it("hides a second copy, but a one-word topic is never taken for a copy", () => {
    const units = [
      unit(1, "Planning", ["introduction to ERP", "MRP logic", "components of MRP"]),
      unit(2, "Queues", ["Waiting line models", "measures of queue performance"]),
    ];
    const course: RecheckChapter[] = [
      {
        id: "planning",
        name: "Planning",
        topics: [topic("Introduction"), topic("MRP logic"), topic("components of MRP")],
      },
      {
        id: "queues",
        name: "Queues",
        topics: [
          topic("introduction to ERP"),
          topic("Waiting line models"),
          topic("measures of queue performance"),
        ],
      },
      { id: "extra", name: "Scheduling", topics: [topic("Waiting line models")] },
    ];
    const fixes = planRecheck(course, [units]);
    expect(fixes).toEqual([
      expect.objectContaining({ kind: "move", name: "introduction to ERP", to: "planning" }),
      expect.objectContaining({ kind: "hide", name: "Waiting line models", from: "extra" }),
    ]);
    const out = applyRecheck(course, fixes, [units], () => ({}));
    expect(out[2].topics[0].status).toBe("retired");
    expect(planRecheck(out, [units])).toEqual([]);
  });
});
