import { describe, expect, it } from "vitest";
import { matchHref, searchCatalogue } from "@/lib/catalogueSearch";

describe("searching the whole catalogue", () => {
  it("finds topics in any subject", () => {
    const gauss = searchCatalogue("gauss");
    expect(gauss[0]).toMatchObject({ kind: "topic", subject: { id: "em" } });
    const taylor = searchCatalogue("taylor");
    expect(taylor.some((m) => m.kind === "topic" && m.subject.id === "engg-math")).toBe(true);
  });

  it("finds subjects and chapters, subjects first", () => {
    const r = searchCatalogue("electricity");
    expect(r[0]).toMatchObject({ kind: "subject", subject: { id: "em" } });
    const ch = searchCatalogue("electrostatics");
    expect(ch.some((m) => m.kind === "chapter")).toBe(true);
  });

  it("needs every word, ignores case and punctuation, and returns nothing for an empty query", () => {
    expect(searchCatalogue("GAUSS'S   law").length).toBeGreaterThan(0);
    expect(searchCatalogue("gauss pizza")).toEqual([]);
    expect(searchCatalogue("  ")).toEqual([]);
  });

  it("links results to the subject page or the lesson picker", () => {
    const [topic] = searchCatalogue("gauss");
    expect(matchHref(topic)).toMatch(/^\/\?subject=em&chapter=.+&topic=gauss-law#start$/);
    const [subject] = searchCatalogue("electricity");
    expect(matchHref(subject)).toBe("/subjects/em");
  });
});
