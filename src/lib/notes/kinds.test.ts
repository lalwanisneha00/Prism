import { describe, expect, it } from "vitest";
import { extractTxt } from "@/lib/extract/plainText";
import { finishDoc } from "@/lib/extract/types";
import { guessChapter, guessKind } from "@/lib/notes/kinds";
import { findSubject } from "@/lib/subjects";

const text = (body: string) => extractTxt("x.txt", body);

describe("guessing what a file is", () => {
  it("uses the file name first", () => {
    const doc = text("Some notes about charges and fields.");
    expect(guessKind("EM_Syllabus_2025.pdf", doc)).toBe("syllabus");
    expect(guessKind("PYQ end-sem May 2024.pdf", doc)).toBe("pyq");
    expect(guessKind("Tutorial 3.docx", doc)).toBe("worksheet");
    expect(guessKind("Unit 2.txt", doc)).toBe("notes");
  });

  it("spots a question paper from its marks, and slides from the format", () => {
    const paper = text(
      "Q1. State Gauss's law. (2 marks)\nQ2. Derive the field of a line charge. (5 marks)\nQ3. Define flux. (2 marks)",
    );
    expect(guessKind("scan.pdf", paper)).toBe("pyq");
    const deck = finishDoc("Unit 3.pptx", "pptx", []);
    expect(guessKind("Unit 3.pptx", deck)).toBe("slides");
  });

  it("recognises a syllabus by its words", () => {
    const syllabus = text(
      "Unit 1: Electrostatics (8 teaching hours)\nCourse outcomes: students will…",
    );
    expect(guessKind("document.pdf", syllabus)).toBe("syllabus");
  });
});

describe("guessing the chapter", () => {
  const em = findSubject("em")!;

  it("picks the chapter a file is clearly about", () => {
    const doc = text(
      "Gauss's law relates electric flux through a closed surface to the enclosed charge. Coulomb's law gives the electric field of a point charge. Electric field lines and flux.",
    );
    expect(guessChapter(em.chapters, doc)).toBe("electrostatics");
  });

  it("says nothing when a file is short or spread over chapters", () => {
    expect(guessChapter(em.chapters, text("Hello world."))).toBeUndefined();
  });
});
