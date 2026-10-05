import { describe, expect, it } from "vitest";
import { AiSyllabusSchema, chunkText, mergeSyllabi } from "@/lib/university/ai";

describe("AI syllabus reading helpers", () => {
  it("checks the AI's answer", () => {
    const ok = AiSyllabusSchema.safeParse({
      subjects: [
        { name: "Applied Physics", semester: 1, units: [{ name: "Waves", topics: ["Sound"] }] },
      ],
    });
    expect(ok.success).toBe(true);
    expect(AiSyllabusSchema.safeParse({ subjects: [{ name: "x", units: [] }] }).success).toBe(
      false,
    );
    expect(
      AiSyllabusSchema.safeParse({
        subjects: [{ name: "Physics", semester: 12, units: [{ name: "a", topics: [] }] }],
      }).success,
    ).toBe(false);
  });

  it("splits long text at line breaks and carries a few lines across", () => {
    const text = Array.from(
      { length: 200 },
      (_, i) => `Line number ${i} of the syllabus text`,
    ).join("\n");
    const chunks = chunkText(text, 1000);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.length).toBeLessThan(1300);
    // Nothing is lost.
    for (let i = 0; i < 200; i++)
      expect(chunks.some((c) => c.includes(`Line number ${i} of`))).toBe(true);
  });

  it("merges the same subject found in two chunks", () => {
    const a = {
      subjects: [{ name: "Physics", semester: 1, units: [{ name: "Waves", topics: ["a"] }] }],
    };
    const b = {
      subjects: [
        {
          name: "physics",
          semester: 1,
          units: [
            { name: "Waves", topics: ["a"] },
            { name: "Heat", topics: ["b"] },
          ],
        },
        { name: "Chemistry", semester: 1, units: [{ name: "Bonds", topics: ["c"] }] },
      ],
    };
    const merged = mergeSyllabi([a, b]);
    expect(merged.subjects).toHaveLength(2);
    expect(merged.subjects[0].units.map((u) => u.name)).toEqual(["Waves", "Heat"]);
  });
});
