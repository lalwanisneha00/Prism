import { describe, expect, it } from "vitest";
import { loadGoldenSets } from "./golden";
import { checkQuotes, htmlToText, normalizeQuote, quoteFound } from "./quotes";
import { GoldenSchema, quotedShare, tierForScore } from "./score";

describe("golden-set quotes", () => {
  it("matches a quote despite curly quotes, dashes, spacing and footnote marks", () => {
    const page =
      "Gauss’s law states that the net flux…  is equal to the enclosed charge[3] — divided by ε0.";
    expect(
      quoteFound(
        page,
        "Gauss's law states that the net flux… is equal to the enclosed charge - divided by ε0",
      ),
    ).toBe(true);
    expect(quoteFound(page, "is proportional to the square")).toBe(false);
    expect(normalizeQuote("  A\n  B  ")).toBe("a b");
  });

  it("turns HTML into its visible text", () => {
    expect(
      htmlToText("<p>One &amp; two</p><script>x()</script><li>three&#33;</li>")
        .replace(/\s+/g, " ")
        .trim(),
    ).toBe("One & two three!");
  });

  it("reports facts whose quote is missing, unfetchable or absent", async () => {
    const golden = GoldenSchema.parse({
      description: "t",
      subject: "s",
      topics: [
        {
          topic: "t1",
          chapter: "c",
          facts: [
            {
              id: "ok",
              claim: "c",
              pattern: "x",
              source: { url: "https://a.org/p", quote: "the quoted words are here" },
            },
            {
              id: "absent",
              claim: "c",
              pattern: "x",
              source: { url: "https://a.org/p", quote: "words that are not there" },
            },
            {
              id: "down",
              claim: "c",
              pattern: "x",
              source: { url: "https://b.org/q", quote: "page will not load at all" },
            },
            { id: "none", claim: "c", pattern: "x" },
          ],
        },
      ],
    });
    const pages: Record<string, string | null> = {
      "https://a.org/p": "Look: the quoted words are here, as promised.",
      "https://b.org/q": null,
    };
    const result = await checkQuotes(golden, async (u) => pages[u] ?? null);
    expect(result.checked).toBe(3);
    expect(result.unsourced).toBe(1);
    expect(result.problems.map((p) => `${p.fact}: ${p.reason}`)).toEqual([
      "absent: quote not found on the page",
      "down: page could not be fetched",
    ]);
    expect(quotedShare(golden)).toEqual({ quoted: 3, total: 4 });
  });

  it("recommends a tier only for golden sets with 12+ topics, all facts quoted", () => {
    const full = { topics: 12, quoted: 40, total: 40 };
    expect([96, 90, 85, 84].map((p) => tierForScore(p, full))).toEqual([
      "verified",
      "tested",
      "tested",
      "sourced",
    ]);
    expect(tierForScore(99, { topics: 11, quoted: 30, total: 30 })).toBe("sourced");
    expect(tierForScore(99, { topics: 40, quoted: 100, total: 119 })).toBe("sourced");
  });

  it("loads every golden set in the folder (none yet for the PDEU catalogue)", () => {
    // The sets from before the PDEU catalogue are in eval/archive-pre-pdeu; new ones come with the re-run.
    expect(loadGoldenSets().map((g) => g.subject)).toEqual([]);
    expect(loadGoldenSets("eval/archive-pre-pdeu/golden").map((g) => g.subject)).toEqual(
      expect.arrayContaining(["em", "engg-math"]),
    );
  });
});
