import { describe, expect, it } from "vitest";
import { countsOf, indexedSubject, loadSubject, subjectIndex } from "@/lib/catalogue";
import { chaptersOf, subjects } from "@/lib/subjects";

describe("the light catalogue", () => {
  it("lists exactly the subjects of the full catalogue, in the same order", () => {
    expect(subjectIndex.map((s) => s.id).sort()).toEqual(subjects.map((s) => s.id).sort());
  });

  it("agrees with the full data about names, semesters and topic counts", () => {
    for (const full of subjects) {
      const light = indexedSubject(full.id)!;
      expect(light.name).toBe(full.name);
      expect([...light.semesters]).toEqual(full.semesters);
      const own = full.chapters.reduce((n, c) => n + c.topics.length, 0);
      expect(light.chapters.reduce((n, c) => n + c.topics, 0)).toBe(own);
      // Including chapters linked in from other subjects.
      const withLinks = chaptersOf(full).reduce((n, o) => n + o.chapter.topics.length, 0);
      expect(countsOf(light).topics).toBe(withLinks);
    }
  });

  it("loads one subject's full data on demand", async () => {
    const em = await loadSubject("em");
    expect(em?.chapters.length).toBeGreaterThan(3);
    expect(await loadSubject("no-such-subject")).toBeUndefined();
  });

  it("is much smaller than the full data", () => {
    const light = JSON.stringify(subjectIndex).length;
    const full = JSON.stringify(subjects).length;
    expect(light).toBeLessThan(full / 3);
  });
});
