import type { Root } from "hast";
import { describe, expect, it } from "vitest";
import { rehypeGlossary, splitByTerms } from "@/lib/glossary";

describe("splitByTerms", () => {
  const terms = ["flux", "electric flux", "Gaussian surface"];

  it("marks whole-word matches once, longest term first, keeping the original case", () => {
    const used = new Set<string>();
    expect(
      splitByTerms("Electric flux through a Gaussian surface; flux again, influx no.", terms, used),
    ).toEqual([
      { text: "Electric flux", term: "electric flux" },
      { text: " through a " },
      { text: "Gaussian surface", term: "Gaussian surface" },
      { text: "; " },
      { text: "flux", term: "flux" },
      { text: " again, influx no." },
    ]);
    // Already used in this block: not marked again.
    expect(splitByTerms("more flux", terms, used)).toEqual([{ text: "more flux" }]);
  });

  it("also marks plurals", () => {
    expect(splitByTerms("Draw field lines here.", ["field line"], new Set())).toEqual([
      { text: "Draw " },
      { text: "field lines", term: "field line" },
      { text: " here." },
    ]);
  });

  it("handles no terms and regex characters in terms", () => {
    expect(splitByTerms("abc", [], new Set())).toEqual([{ text: "abc" }]);
    expect(splitByTerms("use C++ here", ["C++"], new Set())).toEqual([
      { text: "use " },
      { text: "C++", term: "C++" },
      { text: " here" },
    ]);
  });
});

describe("rehypeGlossary", () => {
  it("wraps terms in text but never inside maths, code or links", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [
            { type: "text", value: "The flux " },
            {
              type: "element",
              tagName: "span",
              properties: { className: ["katex"] },
              children: [{ type: "text", value: "symmetry" }],
            },
            { type: "text", value: " depends on symmetry." },
            {
              type: "element",
              tagName: "code",
              properties: {},
              children: [{ type: "text", value: "flux" }],
            },
          ],
        },
      ],
    };
    rehypeGlossary({ terms: ["flux", "symmetry"] })(tree);
    const p = tree.children[0];
    if (p.type !== "element") throw new Error("expected a paragraph");
    const marked = p.children.filter(
      (c) => c.type === "element" && c.properties?.dataGlossary !== undefined,
    );
    expect(marked.map((c) => (c.type === "element" ? c.properties.dataGlossary : ""))).toEqual([
      "flux",
      "symmetry",
    ]);
    // The KaTeX span and the code block are untouched.
    expect(JSON.stringify(p.children)).toContain(
      '"className":["katex"]},"children":[{"type":"text","value":"symmetry"}]',
    );
    expect(JSON.stringify(p.children)).toContain(
      '"tagName":"code","properties":{},"children":[{"type":"text","value":"flux"}]',
    );
  });
});
