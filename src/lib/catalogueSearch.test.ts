import { describe, expect, it } from "vitest";
import { matchHref, searchCatalogue } from "@/lib/catalogueSearch";

describe("searching the whole catalogue", () => {
  it("finds topics in any subject", () => {
    const faraday = searchCatalogue("faraday");
    expect(faraday[0]).toMatchObject({ kind: "topic" });
    expect(faraday.some((m) => m.kind === "topic" && m.subject.id === "pdeu-applied-physics")).toBe(
      true,
    );
    const taylor = searchCatalogue("taylor");
    expect(taylor.some((m) => m.kind === "topic")).toBe(true);
  });

  it("finds subjects and chapters, subjects first", () => {
    const r = searchCatalogue("applied physics");
    expect(r[0]).toMatchObject({ kind: "subject", subject: { id: "pdeu-applied-physics" } });
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
      (m) => m.kind === "topic" && m.subject.id === "pdeu-applied-physics",
    )!;
    expect(matchHref(topic)).toBe(
      "/?subject=pdeu-applied-physics&chapter=electricity-and-magnetism&topic=faradays-law#start",
    );
    const [subject] = searchCatalogue("applied physics");
    expect(matchHref(subject)).toBe("/subjects/pdeu-applied-physics");
  });
});
