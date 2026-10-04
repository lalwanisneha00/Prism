import { describe, expect, it } from "vitest";
import { draftToText, parseSyllabusText } from "@/lib/custom/syllabusText";

describe("reading a pasted syllabus", () => {
  it("understands 'Unit N: Title (hours) – topics' lines", () => {
    const text = `Unit 1: Introduction to Indian Knowledge System (6 hours) – Vedic literature, Upanishads, Six schools of philosophy
UNIT II - Indian Mathematics and Astronomy: Aryabhata, zero and decimal system; Kerala school of mathematics
Unit-III: Ayurveda and Yoga (8 Hrs)
- Tridosha theory
- Ashtanga yoga`;
    const units = parseSyllabusText(text);
    expect(units.map((u) => u.name)).toEqual([
      "Introduction to Indian Knowledge System",
      "Indian Mathematics and Astronomy",
      "Ayurveda and Yoga",
    ]);
    expect(units[0]).toMatchObject({
      hours: 6,
      topics: ["Vedic literature", "Upanishads", "Six schools of philosophy"],
    });
    expect(units[1].topics).toEqual([
      "Aryabhata",
      "zero and decimal system",
      "Kerala school of mathematics",
    ]);
    expect(units[2]).toMatchObject({ hours: 8, topics: ["Tridosha theory", "Ashtanga yoga"] });
  });

  it("treats lines without unit headings as one list of topics", () => {
    const units = parseSyllabusText(
      "Ecosystems\nBiodiversity and its conservation\n\nPollution: air, water, soil",
    );
    expect(units).toHaveLength(1);
    expect(units[0].name).toBe("Topics");
    expect(units[0].topics).toContain("Biodiversity and its conservation");
  });

  it("drops empty units and repeated topics, and round-trips to editable text", () => {
    const units = parseSyllabusText(
      "Module 1: Basics\n- Grammar\n- Grammar\nModule 2: Empty\nModule 3: Writing\n1. Letters\n2) Emails",
    );
    expect(units.map((u) => u.name)).toEqual(["Basics", "Writing"]);
    expect(units[0].topics).toEqual(["Grammar"]);
    const text = draftToText(units);
    expect(parseSyllabusText(text)).toEqual(units);
  });

  it("returns nothing for an empty syllabus", () => {
    expect(parseSyllabusText("   \n  ")).toEqual([]);
  });
});
