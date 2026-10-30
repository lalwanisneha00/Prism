import { describe, expect, it } from "vitest";
import { experimentsOf, findExperiment, numberedFor, theoryLinksFor } from "@/lib/labs/experiment";
import { findSubject, labSubjects, subjects } from "@/lib/subjects";

describe("lab experiments", () => {
  const lab = labSubjects.find((s) => experimentsOf(s).length >= 3)!;

  it("finds every experiment of a lab, in order", () => {
    const all = experimentsOf(lab);
    for (const { topic } of all) expect(findExperiment(lab.id, topic.id)?.topic.id).toBe(topic.id);
    expect(all[0].topic.id).toBe(
      lab.chapters.find((c) => c.status !== "retired")!.topics.find((t) => t.status !== "retired")!
        .id,
    );
  });

  it("is only for labs", () => {
    const theory = subjects.find((s) => s.chapters.length > 0)!;
    expect(findExperiment(theory.id, theory.chapters[0].topics[0].id)).toBeNull();
    expect(findExperiment("no-such-lab", "x")).toBeNull();
  });

  it("links theory topics of the related course that share the experiment's words", () => {
    let linked = 0;
    for (const s of labSubjects)
      for (const { topic } of experimentsOf(s)) {
        const links = theoryLinksFor(s, topic);
        expect(links.length).toBeLessThanOrEqual(4);
        for (const l of links) {
          const theory = findSubject(l.subject)!;
          expect(s.relatedCourses).toContain(theory.id);
          expect(
            theory.chapters.find((c) => c.id === l.chapter)?.topics.some((t) => t.id === l.topic),
          ).toBe(true);
        }
        if (links.length) linked++;
      }
    expect(linked).toBeGreaterThan(50);
  });
});

describe("experiment numbers per branch (merged labs)", () => {
  const ohm = { name: "Ohm", number: 2, numbers: { me: 2, ece: 2 } };
  const kvl = { name: "Kirchhoff", number: 2, numbers: { chem: 2 } };
  const series = { name: "R-L series", number: 5, numbers: { me: 5, ece: 5, chem: 5 } };
  const parallel = { name: "R-L parallel", number: 6, numbers: { me: 6, ece: 6, chem: 6 } };
  const lab = [ohm, series, parallel, kvl];
  const view = (branch?: string) =>
    numberedFor(lab, branch).map((e) => `${e.number ?? "-"} ${e.topic.name}`);

  it("numbers and orders the list as the student's own handout does", () => {
    expect(view("ece")).toEqual(["2 Ohm", "5 R-L series", "6 R-L parallel", "- Kirchhoff"]);
    expect(view("chem")).toEqual(["2 Kirchhoff", "5 R-L series", "6 R-L parallel", "- Ohm"]);
  });

  it("without a branch, never shows one number twice", () => {
    expect(view()).toEqual(["2 Ohm", "5 R-L series", "6 R-L parallel", "- Kirchhoff"]);
    expect(view("civil")).toEqual(view());
  });

  it("keeps a lab with one numbering as it is", () => {
    const one = [{ number: 1 }, { number: 2 }, {}];
    expect(numberedFor(one, "ce").map((e) => e.number)).toEqual([1, 2, 3]);
  });
});
