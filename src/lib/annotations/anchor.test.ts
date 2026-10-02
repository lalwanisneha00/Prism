import { describe, expect, it } from "vitest";
import { applyHighlight, makeAnchor, resolveAnchor } from "@/lib/annotations/anchor";

const text =
  "The flux through a closed surface depends only on the enclosed charge. The flux is a scalar.";

describe("anchoring", () => {
  it("finds the text by its offsets when nothing changed", () => {
    const a = makeAnchor(text, 4, 8);
    expect(a.quote).toBe("flux");
    expect(resolveAnchor(text, a)).toEqual({ start: 4, end: 8 });
  });

  it("re-finds the right occurrence after the text moved", () => {
    const second = text.indexOf("flux", 10);
    const a = makeAnchor(text, second, second + 4);
    const edited = "Intro sentence added at the top. " + text;
    const found = resolveAnchor(edited, a)!;
    expect(edited.slice(found.start, found.end)).toBe("flux");
    // It is the second "flux" (followed by " is a scalar"), not the first.
    expect(edited.slice(found.end, found.end + 12)).toBe(" is a scalar");
  });

  it("returns null when the passage no longer exists", () => {
    const a = makeAnchor(text, 54, 70);
    expect(resolveAnchor("A completely rewritten section.", a)).toBeNull();
  });
});

describe("overlapping highlights", () => {
  let n = 0;
  const id = () => `new-${++n}`;

  it("merges a same-colour overlap into one highlight", () => {
    const change = applyHighlight(
      [{ id: "a", start: 0, end: 10, color: "important" }],
      { start: 5, end: 20, color: "important" },
      id,
    );
    expect(change.added).toEqual({ start: 0, end: 20 });
    expect(change.remove).toEqual(["a"]);
  });

  it("splits an older highlight when a new colour lands in its middle", () => {
    const change = applyHighlight(
      [{ id: "a", start: 0, end: 30, color: "important" }],
      { start: 10, end: 20, color: "exam" },
      id,
    );
    expect(change.update).toEqual([{ id: "a", start: 0, end: 10, color: "important" }]);
    expect(change.create).toEqual([
      { id: expect.any(String), start: 20, end: 30, color: "important" },
    ]);
    expect(change.added).toEqual({ start: 10, end: 20 });
  });

  it("trims a partial overlap and removes a swallowed highlight", () => {
    const change = applyHighlight(
      [
        { id: "a", start: 0, end: 12, color: "formula" },
        { id: "b", start: 14, end: 18, color: "confused" },
        { id: "c", start: 40, end: 50, color: "confused" },
      ],
      { start: 10, end: 20, color: "exam" },
      id,
    );
    expect(change.update).toEqual([{ id: "a", start: 0, end: 10, color: "formula" }]);
    expect(change.remove).toEqual(["b"]);
    expect(change.create).toEqual([]);
  });
});
