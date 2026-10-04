import { describe, expect, it } from "vitest";
import { matchSyllabus, sameTopic } from "@/lib/custom/matchSyllabus";
import { subjects } from "@/lib/subjects";

describe("sameTopic", () => {
  it("ignores case, punctuation and filler words", () => {
    expect(sameTopic("Gauss's Law", "Gauss law")).toBe(true);
    expect(sameTopic("Divergence and curl", "Curl and divergence")).toBe(true);
  });
  it("does not match different topics", () => {
    expect(sameTopic("Gauss's law", "Faraday's law")).toBe(false);
    expect(sameTopic("", "anything")).toBe(false);
  });
});

describe("matchSyllabus", () => {
  const em = subjects.find((s) => s.id === "em")!;
  const names = em.chapters.flatMap((c) => c.topics.map((t) => t.name));

  it("finds the built-in subject a student's own list comes from", () => {
    const draft = [{ name: "My unit", topics: names.slice(0, 8) }];
    const found = matchSyllabus(draft, subjects);
    expect(found[0]?.ratio).toBeGreaterThan(0.8);
    expect(found.some((m) => m.subject.id === "em")).toBe(true);
  });
  it("returns nothing for a short or unrelated list", () => {
    expect(matchSyllabus([{ name: "x", topics: names.slice(0, 2) }], subjects)).toEqual([]);
    expect(
      matchSyllabus(
        [
          {
            name: "x",
            topics: ["Baking bread", "Knitting scarves", "Birdwatching", "Pottery basics"],
          },
        ],
        subjects,
      ),
    ).toEqual([]);
  });
});
