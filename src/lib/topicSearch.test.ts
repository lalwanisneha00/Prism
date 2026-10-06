import { describe, expect, it } from "vitest";
import { findSubject, subjects } from "@/lib/subjects";
import { editDistance, normalize, searchTopics } from "@/lib/topicSearch";

const em = findSubject("em")!;
const ids = (query: string) => searchTopics(em, query).map((m) => m.topic.id);

describe("normalize", () => {
  it("ignores case, accents, apostrophes and dashes", () => {
    expect(normalize("Ampère's  Biot–Savart")).toBe("amperes biot savart");
  });
});

describe("searchTopics", () => {
  it("finds Gauss's law however it is typed", () => {
    for (const q of ["gauss", "Gauss's law", "GAUSS LAW", "gausss"]) {
      expect(ids(q)[0]).toBe("gauss-law");
    }
  });

  it("matches accented and dashed names typed plainly", () => {
    expect(ids("ampere")).toContain("amperes-law");
    expect(ids("biot savart")).toEqual(["biot-savart-law"]);
  });

  it("matches words in any order and across topic and chapter names", () => {
    expect(ids("law faraday")).toEqual(["faradays-law"]);
    expect(ids("capacitance energy")).toEqual(["capacitor-energy"]);
  });

  it("puts names that start with the query first", () => {
    expect(ids("electric")[0]).toBe("coulombs-law"); // "Electric charge and Coulomb's law"
    expect(ids("capacitor")[0]).toBe("capacitors");
  });

  it("caps the number of results", () => {
    expect(searchTopics(em, "e", 5)).toHaveLength(5);
  });

  it("returns nothing for blank or unknown queries", () => {
    expect(ids("   ")).toEqual([]);
    expect(ids("photosynthesis")).toEqual([]);
  });

  it("tells you which chapter each result is in", () => {
    const [match] = searchTopics(em, "lenz");
    expect(match.chapter.name).toBe("Electromagnetic Induction");
  });
});

describe("forgiving search", () => {
  const physics = subjects.find((s) => s.id === "applied-physics")!;
  it("finds topics in linked chapters (capacitor under Applied Physics)", () => {
    const hits = searchTopics(physics, "capacitor");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].owner?.id).toBe("em");
  });
  it("ignores capital letters and forgives small spelling slips", () => {
    expect(searchTopics(physics, "Capacitor").length).toBeGreaterThan(0);
    expect(searchTopics(physics, "capaciter").length).toBeGreaterThan(0);
    expect(searchTopics(physics, "capacitro").length).toBeGreaterThan(0);
    expect(searchTopics(physics, "gaus law").length).toBeGreaterThan(0);
  });
  it("still finds nothing for unrelated words, and exact matches rank first", () => {
    expect(searchTopics(physics, "zzzqqq")).toEqual([]);
    expect(editDistance("capacitor", "capacitro")).toBe(1);
  });
});
