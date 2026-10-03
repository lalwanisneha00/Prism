import { describe, expect, it } from "vitest";
import { cleanOcrText, looksReadable } from "@/lib/ocr/cleanText";

describe("cleaning OCR text", () => {
  it("drops smudge lines, joins split words and tidies spaces", () => {
    const raw =
      "Unit 2 -   Gauss's law\n~ .\nFlux through a closed sur-\nface = Q / e0\n|\n\n\n\nsphere -> point charge";
    expect(cleanOcrText(raw)).toBe(
      "Unit 2 - Gauss's law\nFlux through a closed surface = Q / e0\n\nsphere -> point charge",
    );
  });

  it("tells readable text from noise", () => {
    expect(looksReadable("Field lines of a point charge")).toBe(true);
    expect(looksReadable("~|; .,: ~~ |")).toBe(false);
    expect(looksReadable("")).toBe(false);
  });
});
