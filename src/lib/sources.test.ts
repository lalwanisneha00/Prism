import { describe, expect, it } from "vitest";
import { SourceSchema } from "@/lib/schema";
import { sourcesForTopic, topicsWithSources, wikipediaUrl } from "@/lib/sources";
import { subjects } from "@/lib/subjects";

describe("source map", () => {
  const em = subjects.find((s) => s.id === "em");
  const allTopics = em?.chapters.flatMap((c) => c.topics.map((t) => t.id)) ?? [];

  it("covers every E&M topic", () => {
    expect(topicsWithSources("em").sort()).toEqual([...allTopics].sort());
  });

  it("produces valid, uniquely-identified sources for every topic", () => {
    for (const topic of allTopics) {
      const sources = sourcesForTopic("em", topic);
      expect(sources.length).toBeGreaterThan(0);
      for (const s of sources) expect(SourceSchema.safeParse(s).success).toBe(true);
      expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);
    }
  });

  it("formats OpenStax titles with section numbers", () => {
    const [first] = sourcesForTopic("em", "coulombs-law");
    expect(first.title).toBe("University Physics Volume 2, §5.1 Electric Charge");
  });

  it("builds Wikipedia URLs safely", () => {
    expect(wikipediaUrl("Gauss's law")).toBe("https://en.wikipedia.org/wiki/Gauss's_law");
    expect(wikipediaUrl("Biot–Savart law")).toBe(
      "https://en.wikipedia.org/wiki/Biot%E2%80%93Savart_law",
    );
  });

  it("returns nothing for unknown topics", () => {
    expect(sourcesForTopic("em", "nope")).toEqual([]);
    expect(sourcesForTopic("chemistry", "gauss-law")).toEqual([]);
  });
});
