/*
 * Tidies text read from a picture (OCR). Reading a photo is like copying a blurry board:
 * a few smudges come out as stray symbols, and words get split at line ends. This keeps
 * the real words and drops the noise.
 */

/** A line is noise when it has fewer than two letters or digits in it. */
function isNoise(line: string): boolean {
  return (line.match(/[\p{L}\p{N}]/gu) ?? []).length < 2;
}

export function cleanOcrText(text: string): string {
  return (
    text
      .replace(/\r\n?/g, "\n")
      // "electro-\nstatics" → "electricity-and-magnetism"
      .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
      .split("\n")
      .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
      .filter((line) => line === "" || !isNoise(line))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Rough confidence check: OCR output that is mostly symbols is not worth keeping. */
export function looksReadable(text: string): boolean {
  const letters = (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
  return letters >= 4 && letters / Math.max(text.replace(/\s/g, "").length, 1) >= 0.5;
}
