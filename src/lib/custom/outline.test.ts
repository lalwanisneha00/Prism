import { describe, expect, it } from "vitest";
import {
  outlineExcerpts,
  outlineFromMaterial,
  outlinePrompt,
  OutlineSchema,
} from "@/lib/custom/outline";
import type { ExtractedSection } from "@/lib/extract/types";

const slide = (
  index: number,
  title: string,
  body = "Some words on this slide.",
): ExtractedSection => ({
  kind: "slide",
  index,
  label: `slide ${index}`,
  title,
  blocks: [
    { kind: "title", text: title },
    { kind: "paragraph", text: body },
  ],
  images: 0,
  thin: false,
});

describe("outline built from the student's material", () => {
  it("makes one unit per file with topics from slide titles, skipping filler slides", () => {
    const outline = outlineFromMaterial([
      {
        name: "Unit_2 Ecosystems.pptx",
        sections: [
          slide(1, "Contents"),
          slide(2, "Food chains"),
          slide(3, "Food webs"),
          slide(4, "Food chains"),
          slide(5, "Thank you"),
        ],
      },
      { name: "empty.pdf", sections: [] },
    ]);
    expect(outline).toEqual([{ name: "Unit 2 Ecosystems", topics: ["Food chains", "Food webs"] }]);
  });

  it("uses a heading-like first line of a PDF page", () => {
    const page: ExtractedSection = {
      kind: "page",
      index: 1,
      label: "page 1",
      blocks: [
        {
          kind: "paragraph",
          text: "Biodiversity hotspots\nIndia has four of the world's hotspots.",
        },
      ],
      images: 0,
      thin: false,
    };
    expect(outlineFromMaterial([{ name: "notes.pdf", sections: [page] }])[0].topics).toEqual([
      "Biodiversity hotspots",
    ]);
  });

  it("keeps the AI's view short and asks it to use only the student's topics", () => {
    const files = [
      {
        name: "a.pptx",
        sections: Array.from({ length: 200 }, (_, i) => slide(i + 1, `Topic ${i}`)),
      },
    ];
    const excerpts = outlineExcerpts(files, 2000);
    expect(excerpts.join("").length).toBeLessThanOrEqual(2000);
    expect(excerpts[0]).toMatch(/^\[a\.pptx, slide 1\] Topic 0/);
    const { system } = outlinePrompt("Environmental Science", excerpts, []);
    expect(system).toContain("Use ONLY topics that appear in the EXCERPTS");
    expect(OutlineSchema.safeParse({ chapters: [{ name: "U1", topics: [] }] }).success).toBe(false);
  });
});
