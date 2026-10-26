import { describe, expect, it } from "vitest";
import { matchHref, searchCatalogue, searchScope } from "@/lib/catalogueSearch";

describe("All / Theory / Labs (Phase 4B)", () => {
  const isLab = (m: { subject: { courseType?: string } }) => m.subject.courseType === "practical";

  it("searches labs on their own, and leaves them out of Theory", () => {
    const labs = searchCatalogue("laboratory", 50, searchScope("labs"));
    expect(labs.length).toBeGreaterThan(0);
    expect(labs.every(isLab)).toBe(true);
    expect(searchCatalogue("laboratory", 50, searchScope("theory")).some(isLab)).toBe(false);
    expect(searchCatalogue("applied physics", 20, searchScope("all")).some(isLab)).toBe(true);
  });

  it("opens a lab's experiment on the lab's page (no lab lessons before Phase 7B)", () => {
    const exp = searchCatalogue("sketch entities", 20, searchScope("labs")).find(
      (m) => m.kind === "topic" && m.subject.id === "pdeu-engineering-graphics-ce-petro",
    )!;
    expect(matchHref(exp)).toBe(
      "/subjects/pdeu-engineering-graphics-ce-petro#chapter-cad-laboratory",
    );
  });
});

describe("searching the whole catalogue", () => {
  it("finds topics in any subject", () => {
    const faraday = searchCatalogue("faraday");
    expect(faraday[0]).toMatchObject({ kind: "topic" });
    expect(faraday.some((m) => m.kind === "topic" && m.subject.id === "pdeu-physics-ict")).toBe(
      true,
    );
    const taylor = searchCatalogue("taylor");
    expect(taylor.some((m) => m.kind === "topic")).toBe(true);
  });

  it("finds subjects and chapters, subjects first", () => {
    const r = searchCatalogue("applied physics");
    expect(r[0]).toMatchObject({ kind: "subject", subject: { id: "pdeu-physics-ict" } });
    const ch = searchCatalogue("electromagnetic waves");
    expect(ch.some((m) => m.kind === "chapter")).toBe(true);
  });

  it("needs every word, ignores case and punctuation, and returns nothing for an empty query", () => {
    expect(searchCatalogue("FARADAY'S   law").length).toBeGreaterThan(0);
    expect(searchCatalogue("faraday pizza")).toEqual([]);
    expect(searchCatalogue("  ")).toEqual([]);
  });

  it("links results to the subject page or the lesson picker", () => {
    const topic = searchCatalogue("faraday").find(
      (m) => m.kind === "topic" && m.subject.id === "pdeu-physics-ict",
    )!;
    expect(matchHref(topic)).toBe(
      "/start?subject=pdeu-physics-ict&chapter=electricity-and-magnetism&topic=faradays-law",
    );
    const [subject] = searchCatalogue("applied physics");
    expect(matchHref(subject)).toBe("/subjects/pdeu-physics-ict");
  });
});
