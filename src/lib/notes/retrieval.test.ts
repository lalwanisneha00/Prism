import { describe, expect, it } from "vitest";
import { chunkPage, searchChunks, summarize, tokenize } from "@/lib/notes/retrieval";

const meta = { noteId: "n1", noteName: "Unit 2.pdf", page: 1 };
const words = (n: number, w = "flux") => Array.from({ length: n }, () => w).join(" ");

describe("tokenize", () => {
  it("lower-cases, drops punctuation, possessives and common words", () => {
    expect(tokenize("Gauss's Law: the FLUX through a closed surface!")).toEqual([
      "gauss",
      "law",
      "flux",
      "through",
      "closed",
      "surface",
    ]);
  });
});

describe("chunkPage", () => {
  it("splits long pages into overlapping passages", () => {
    const chunks = chunkPage(words(400), meta);
    expect(chunks.length).toBe(4); // 0-150, 120-270, 240-390, 360-400
    expect(chunks[0].id).toBe("n1:1:0");
    expect(chunks.every((c) => c.text.split(" ").length <= 150)).toBe(true);
  });

  it("keeps short pages as one passage and ignores empty ones", () => {
    expect(chunkPage("Only a few words here.", meta)).toHaveLength(1);
    expect(chunkPage("   ", meta)).toHaveLength(0);
  });
});

describe("searchChunks (BM25)", () => {
  const chunks = [
    {
      ...meta,
      id: "a",
      text: "Ohm's law relates voltage, current and resistance: V = IR for ohmic conductors.",
    },
    {
      ...meta,
      id: "b",
      text: "Gauss's law: the electric flux through a closed surface equals the enclosed charge over epsilon nought.",
    },
    {
      ...meta,
      id: "c",
      text: "Flux flux flux. A Gaussian surface is imaginary. Choose it to match the symmetry of the charge.",
    },
    {
      ...meta,
      id: "d",
      text: "Faraday's law of induction: a changing magnetic flux induces an emf in a coil.",
    },
  ];

  it("ranks the passages that match the topic first", () => {
    const top = searchChunks(chunks, "Gauss's law electric flux closed surface", 2).map(
      (c) => c.id,
    );
    expect(top[0]).toBe("b");
    expect(top).not.toContain("a");
  });

  it("returns nothing when no passage matches", () => {
    expect(searchChunks(chunks, "photosynthesis chlorophyll")).toEqual([]);
    expect(searchChunks([], "flux")).toEqual([]);
  });
});

describe("summarize", () => {
  it("keeps short text and trims long text at a sentence", () => {
    expect(summarize("Short.")).toBe("Short.");
    const long = "This chapter covers Gauss's law. ".repeat(20);
    expect(summarize(long).length).toBeLessThanOrEqual(284);
    expect(summarize(long).endsWith("…")).toBe(true);
  });
});
