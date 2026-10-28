import { describe, expect, it } from "vitest";
import { experimentsOf, findExperiment, theoryLinksFor } from "@/lib/labs/experiment";
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
