import { describe, expect, it } from "vitest";
import {
  MAX_NOTE_PASSAGES,
  parsePassages,
  passagesToSources,
  toPassages,
} from "@/lib/notes/notesSources";
import { SourceSchema } from "@/lib/schema";

const chunk = (page: number, text: string) => ({
  id: `n:${page}:${text.length}`,
  noteId: "n",
  noteName: "Unit 2.pdf",
  page,
  text,
});

describe("notes passages", () => {
  it("caps how many passages a request carries and how long each is", () => {
    const many = Array.from({ length: 12 }, (_, i) => chunk(i + 1, "x".repeat(2000)));
    const passages = toPassages(many);
    expect(passages).toHaveLength(MAX_NOTE_PASSAGES);
    expect(passages[0].text).toHaveLength(1200);
    expect(parsePassages(passages)).toHaveLength(MAX_NOTE_PASSAGES);
  });

  it("treats malformed or oversized input as no notes", () => {
    expect(parsePassages(undefined)).toEqual([]);
    expect(parsePassages([{ noteName: "a", page: 1, text: "y".repeat(5000) }])).toEqual([]);
    expect(parsePassages("<script>")).toEqual([]);
  });

  it("groups passages by page into valid, citable sources", () => {
    const sources = passagesToSources([
      { noteName: "Unit 2.pdf", page: 3, text: "Gauss's law." },
      { noteName: "Unit 2.pdf", page: 3, text: "Flux." },
      { noteName: "Unit 2.pdf", page: 7, text: "Symmetry." },
    ]);
    expect(sources.map((s) => s.id)).toEqual(["notes-1", "notes-2"]);
    expect(sources[0]).toMatchObject({ title: "Unit 2.pdf, page 3", kind: "notes" });
    expect(sources[0].excerpt).toBe("Gauss's law. … Flux.");
    for (const s of sources) expect(SourceSchema.safeParse(s).success).toBe(true);
  });

  it("cites slides, headings and sheets by name", () => {
    const passages = toPassages([
      { ...chunk(14, "Gauss's law."), noteName: "Unit 3.pptx", where: "slide 14" },
      { ...chunk(2, "Flux."), noteName: "Notes.docx", where: "“Gauss's law”" },
    ]);
    expect(parsePassages(passages)).toHaveLength(2);
    expect(passagesToSources(passages).map((s) => s.title)).toEqual([
      "Unit 3.pptx, slide 14",
      "Notes.docx, “Gauss's law”",
    ]);
  });
});
