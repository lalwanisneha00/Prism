import { describe, expect, it } from "vitest";
import {
  decodeText,
  extractCsv,
  extractMd,
  extractTxt,
  parseCsv,
  rtfToText,
} from "@/lib/extract/plainText";
import { parseXml, findAll, decodeEntities } from "@/lib/extract/xml";

describe("plain text", () => {
  it("labels parts by line numbers", () => {
    const doc = extractTxt("n.txt", "Ohm's law\nV = IR\n\nKirchhoff's laws");
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].label).toBe("lines 1–4");
  });

  it("splits long text at blank lines", () => {
    const para = Array.from({ length: 320 }, () => "word").join(" ");
    const doc = extractTxt("n.txt", `${para}\n\n${para}`);
    expect(doc.sections.map((s) => s.label)).toEqual(["lines 1–2", "line 3"]);
  });

  it("decodes UTF-8 and falls back to Windows-1252", () => {
    expect(decodeText(new TextEncoder().encode("ε₀ and μ₀"))).toBe("ε₀ and μ₀");
    expect(decodeText(new Uint8Array([0x93, 0x51, 0x94]))).toBe("“Q”");
  });
});

describe("Markdown", () => {
  it("splits at # and ## headings and keeps link text only", () => {
    const doc = extractMd(
      "n.md",
      "Intro line\n# Unit 1\nSee [the book](https://x.org).\n### Small\nmore\n## Unit 2\n```\n# not a heading\n```",
    );
    expect(doc.sections.map((s) => s.label)).toEqual(["the beginning", "“Unit 1”", "“Unit 2”"]);
    expect(doc.sections[1].blocks[1].text).toContain("See the book.");
    expect(doc.sections[2].blocks[1].text).toContain("# not a heading");
  });
});

describe("RTF", () => {
  it("keeps the words and drops the formatting", () => {
    const rtf =
      "{\\rtf1\\ansi{\\fonttbl{\\f0 Calibri;}}{\\colortbl;\\red0\\green0\\blue0;}{\\*\\generator Riched20;}" +
      "\\f0\\fs22 Gauss\\rquote s law\\par Flux \\u949?\\'b2 = Q\\tab done\\par}";
    expect(rtfToText(rtf)).toBe("Gauss's law\nFlux ε² = Q\tdone");
  });

  it("decodes characters by each font's character set, as Word writes them", () => {
    const rtf =
      "{\\rtf1\\ansi\\ansicpg1252{\\fonttbl{\\f3\\fbidi \\froman\\fcharset2\\fprq2{\\*\\panose 05050102010706020507}Symbol;}" +
      "{\\f416\\fbidi \\fswiss\\fcharset161\\fprq2 Calibri Greek;}}" +
      "{\\uc1\\u955\\'3f\\insrsid1 Applied}\\par {\\pntext\\f3 \\'b7\\tab}{\\f416 C = \\'e5\\u8320\\'3f A/d}" +
      "\\par\\trowd a\\cell b\\cell\\row}";
    expect(rtfToText(rtf)).toBe("λApplied\n•\tC = ε₀ A/d\na | b");
  });
});

describe("CSV", () => {
  it("handles quotes, commas inside cells and semicolon files", () => {
    expect(parseCsv('Q,Marks\n"State Gauss\'s law, briefly",2\n"Say ""hi""",1\n')).toEqual([
      ["Q", "Marks"],
      ["State Gauss's law, briefly", "2"],
      ['Say "hi"', "1"],
    ]);
    expect(parseCsv("a;b\r\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("becomes a table labelled by rows", () => {
    const doc = extractCsv("bank.csv", "Q,Marks\nOhm's law,2");
    expect(doc.sections[0]).toMatchObject({ label: "rows 1–2" });
    expect(doc.sections[0].blocks[0].text).toBe("Q | Marks\nOhm's law | 2");
  });
});

describe("XML reader", () => {
  it("reads nested tags, attributes, entities, CDATA and comments", () => {
    const root = parseXml(
      '<?xml version="1.0"?><!-- c --><a:x k="1 &gt; 0"><a:t>A &amp; B</a:t><a:t><![CDATA[<raw>]]></a:t><a:br/></a:x>',
    );
    const ts = findAll(root, "t");
    expect(ts.map((t) => t.children.join(""))).toEqual(["A & B", "<raw>"]);
    expect(findAll(root, "x")[0].attrs.k).toBe("1 > 0");
    expect(decodeEntities("&#x3b5;&#8320;")).toBe("ε₀");
  });
});
