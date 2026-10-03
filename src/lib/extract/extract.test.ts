import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { detectFormat } from "@/lib/extract/detect";
import { extractDocx } from "@/lib/extract/docx";
import { extractBytes } from "@/lib/extract/extractFile";
import { extractOdp, extractOdt } from "@/lib/extract/odf";
import { extractPptx } from "@/lib/extract/pptx";
import {
  makeDocx,
  makeOdp,
  makeOdt,
  makePptx,
  makeXlsx,
  para,
  picture,
  shape,
  table,
  wPara,
  wTable,
} from "@/lib/extract/testFixtures";
import { docText, ExtractError, hasText, sectionText } from "@/lib/extract/types";
import { columnIndex, extractXlsx } from "@/lib/extract/xlsx";

const long =
  "Gauss's law relates the electric flux through a closed surface to the enclosed charge.";

describe("PowerPoint (.pptx)", () => {
  const deck = makePptx(
    [
      {
        shapes:
          shape(para("Unit 3: Electrostatics"), "ctrTitle") + shape(para("Prof. Shah"), "subTitle"),
      },
      {
        shapes:
          shape(para("Gauss&apos;s law"), "title") +
          shape(para("Flux = Q / ε₀") + para("Choose a symmetric surface", 1)) +
          table([
            ["Shape", "Field"],
            ["Sphere", "kQ/r²"],
          ]) +
          shape(para("14"), "sldNum"),
        notes: "Remind them about units.",
      },
      { shapes: shape(para("Field lines"), "title") + picture },
      { shapes: shape(para("Old slide"), "title"), hidden: true },
    ],
    [1, 2, 3, 4],
  );

  it("reads titles, text, tables and speaker notes, slide by slide", () => {
    const doc = extractPptx("Unit 3.pptx", deck);
    expect(doc.format).toBe("pptx");
    expect(doc.sections.map((s) => s.label)).toEqual(["slide 1", "slide 2", "slide 3"]);
    const slide2 = doc.sections[1];
    expect(slide2.title).toBe("Gauss's law");
    expect(slide2.blocks.map((b) => b.kind)).toEqual(["title", "paragraph", "table", "notes"]);
    expect(slide2.blocks[1].text).toBe("Flux = Q / ε₀\n  Choose a symmetric surface");
    expect(slide2.blocks[2].text).toBe("Shape | Field\nSphere | kQ/r²");
    expect(slide2.blocks[3].text).toBe("Remind them about units.");
    // The slide number placeholder is not content.
    expect(sectionText(slide2)).not.toContain("14");
  });

  it("marks a picture-only slide instead of skipping it, and skips hidden slides", () => {
    const doc = extractPptx("Unit 3.pptx", deck);
    expect(doc.sections[2]).toMatchObject({ label: "slide 3", images: 1, thin: true });
    expect(doc.warnings).toContain("Content is in an image on slide 3: its text wasn't read.");
    expect(doc.sections[0].thin).toBe(false);
    expect(doc.warnings).toContain("1 hidden slide was skipped.");
  });

  it("follows the presentation's order, not the file names", () => {
    const reordered = makePptx(
      [
        { shapes: shape(para("First file"), "title") },
        { shapes: shape(para("Second file"), "title") },
      ],
      [2, 1],
    );
    const doc = extractPptx("x.pptx", reordered);
    expect(doc.sections.map((s) => `${s.label}: ${s.title}`)).toEqual([
      "slide 1: Second file",
      "slide 2: First file",
    ]);
  });
});

describe("Word (.docx)", () => {
  it("splits at headings and keeps lists and tables", () => {
    const doc = extractDocx(
      "Notes.docx",
      makeDocx(
        wPara("Course notes for Unit 2") +
          wPara("Gauss's law", { style: "Heading1" }) +
          wPara(long) +
          wPara("Spherical symmetry", { list: true }) +
          wPara("Cylindrical symmetry", { style: "ListBullet" }) +
          wTable([
            ["Shape", "Field"],
            ["Line", "λ/2πε₀r"],
          ]) +
          wPara("Applications", { style: "Berschrift2" }) +
          wPara("Detail", { style: "Heading3" }) +
          wPara("Infinite sheet of charge."),
      ),
    );
    expect(doc.sections.map((s) => s.label)).toEqual([
      "the beginning",
      "“Gauss's law”",
      "“Applications”",
    ]);
    const gauss = doc.sections[1];
    expect(gauss.blocks.map((b) => b.kind)).toEqual([
      "heading",
      "paragraph",
      "list",
      "list",
      "table",
    ]);
    expect(gauss.blocks[2].text).toBe("• Spherical symmetry");
    // Word's "List Bullet" style keeps its bullet in the style, not the paragraph.
    expect(gauss.blocks[3].text).toBe("• Cylindrical symmetry");
    expect(gauss.blocks[4].text).toBe("Shape | Field\nLine | λ/2πε₀r");
    // A level-3 heading stays inside its level-2 section.
    expect(sectionText(doc.sections[2])).toBe("Applications\nDetail\nInfinite sheet of charge.");
  });

  it("uses Word's page breaks when there are no headings", () => {
    const doc = extractDocx(
      "Plain.docx",
      makeDocx(wPara(long) + wPara(long, { pageBreakBefore: true }) + wPara("More on page two.")),
    );
    expect(doc.sections.map((s) => s.label)).toEqual(["page 1", "page 2"]);
    expect(sectionText(doc.sections[1])).toContain("More on page two.");
  });
});

describe("Excel (.xlsx) and CSV", () => {
  it("reads each visible sheet as a table", () => {
    const doc = extractXlsx(
      "Marks.xlsx",
      makeXlsx([
        {
          name: "Q bank",
          rows: [
            ["Question", "Marks"],
            ["State Gauss's law", 2],
            ["", ""],
            ["Derive the field of a line charge", 5],
          ],
        },
        { name: "Secret", rows: [["hidden"]], hidden: true },
      ]),
    );
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].label).toBe("sheet “Q bank”");
    expect(doc.sections[0].blocks[0].text).toBe(
      "Question | Marks\nState Gauss's law | 2\nDerive the field of a line charge | 5",
    );
  });

  it("converts column letters", () => {
    expect([columnIndex("A1"), columnIndex("Z9"), columnIndex("AA3"), columnIndex("BC12")]).toEqual(
      [0, 25, 26, 54],
    );
  });
});

describe("OpenDocument (.odt, .odp)", () => {
  it("reads headings, paragraphs, lists and tables from .odt", () => {
    const doc = extractOdt(
      "Notes.odt",
      makeOdt(
        `<text:h text:outline-level="1">Capacitors</text:h><text:p>C = Q<text:s/>/ V</text:p>` +
          `<text:list><text:list-item><text:p>Parallel plates</text:p></text:list-item></text:list>` +
          `<table:table><table:table-row><table:table-cell><text:p>a</text:p></table:table-cell><table:table-cell><text:p>b</text:p></table:table-cell></table:table-row></table:table>`,
      ),
    );
    expect(doc.sections.map((s) => s.label)).toEqual(["“Capacitors”"]);
    expect(doc.sections[0].blocks.map((b) => b.text)).toEqual([
      "Capacitors",
      "C = Q / V",
      "• Parallel plates",
      "a | b",
    ]);
  });

  it("reads .odp slides with titles and notes", () => {
    const doc = extractOdp(
      "Deck.odp",
      makeOdp(
        `<draw:page draw:name="p1"><draw:frame presentation:class="title"><draw:text-box><text:p>Ohm's law</text:p></draw:text-box></draw:frame>` +
          `<draw:frame presentation:class="outline"><draw:text-box><text:p>V = IR for a resistor at constant temperature</text:p></draw:text-box></draw:frame>` +
          `<presentation:notes><draw:frame presentation:class="notes"><draw:text-box><text:p>Mention ohmic vs non-ohmic.</text:p></draw:text-box></draw:frame></presentation:notes></draw:page>` +
          `<draw:page draw:name="p2"><draw:frame><draw:image/></draw:frame></draw:page>` +
          `<draw:page draw:name="p3" draw:style-name="dpHidden"><draw:frame presentation:class="title"><draw:text-box><text:p>Old</text:p></draw:text-box></draw:frame></draw:page>`,
      ),
    );
    expect(doc.sections.map((s) => [s.label, s.title, s.thin])).toEqual([
      ["slide 1", "Ohm's law", false],
      ["slide 2", undefined, true],
    ]);
    expect(doc.warnings).toContain("1 hidden slide was skipped.");
    expect(doc.sections[0].blocks.at(-1)).toEqual({
      kind: "notes",
      text: "Mention ohmic vs non-ohmic.",
    });
  });
});

describe("detecting the format", () => {
  const zipHead = new Uint8Array([0x50, 0x4b, 3, 4]);
  const oleHead = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const error = (fn: () => unknown) => {
    try {
      fn();
    } catch (err) {
      return err instanceof ExtractError ? err : undefined;
    }
    return undefined;
  };

  it("recognises formats by name and checks the signature", () => {
    expect(detectFormat("Unit 3.PPTX", 10, zipHead)).toBe("pptx");
    expect(detectFormat("deck.ppsx", 10, zipHead)).toBe("pptx");
    expect(detectFormat("scan", 10, strToU8("%PDF-1.7"))).toBe("pdf");
    expect(detectFormat("photo.jpeg", 10, new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image");
    // A .ppt that is really a ZIP is a renamed .pptx.
    expect(detectFormat("renamed.ppt", 10, zipHead)).toBe("pptx");
  });

  it("explains old formats with a how-to", () => {
    const err = error(() => detectFormat("Unit 1.ppt", 10, oleHead));
    expect(err?.kind).toBe("legacy");
    expect(err?.message).toContain("save it as .pptx or PDF");
    expect(err?.howTo?.split("\n")).toHaveLength(2);
    expect(error(() => detectFormat("old.doc", 10, oleHead))?.message).toContain(".docx");
  });

  it("spots password-protected, damaged, empty, huge and unknown files", () => {
    expect(error(() => detectFormat("locked.docx", 10, oleHead))?.kind).toBe("password");
    expect(error(() => detectFormat("broken.pptx", 10, strToU8("hello")))?.kind).toBe("corrupt");
    expect(error(() => detectFormat("fake.pdf", 10, strToU8("hello")))?.kind).toBe("corrupt");
    expect(error(() => detectFormat("empty.txt", 0, new Uint8Array()))?.kind).toBe("empty");
    expect(error(() => detectFormat("huge.pdf", 31 * 1024 * 1024, strToU8("%PDF")))?.kind).toBe(
      "too-big",
    );
    expect(error(() => detectFormat("song.mp3", 10, new Uint8Array([1, 2])))?.kind).toBe(
      "unsupported",
    );
    expect(error(() => detectFormat("IMG_1.HEIC", 10, new Uint8Array([1])))?.message).toContain(
      "JPG",
    );
  });
});

describe("extractBytes (the single entry point)", () => {
  it("routes each format to its reader", async () => {
    const pptx = await extractBytes("a.pptx", makePptx([{ shapes: shape(para(long)) }]));
    expect(docText(pptx)).toBe(long);
    const docx = await extractBytes("a.docx", makeDocx(wPara(long)));
    expect(docText(docx)).toBe(long);
    const md = await extractBytes("a.md", strToU8(`# Unit 1\n${long}`));
    expect(md.sections[0].label).toBe("“Unit 1”");
  });

  it("returns a picture as one image section to be read by OCR", async () => {
    const doc = await extractBytes("board.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2]));
    expect(doc.sections).toEqual([
      expect.objectContaining({ kind: "image", label: "image", thin: true }),
    ]);
    expect(hasText(doc)).toBe(false);
  });

  it("reports a damaged ZIP as a friendly error", async () => {
    const broken = new Uint8Array([0x50, 0x4b, 3, 4, 9, 9, 9, 9]);
    await expect(extractBytes("x.docx", broken)).rejects.toMatchObject({ kind: "corrupt" });
  });
});
