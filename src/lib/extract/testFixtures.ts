import { strToU8, zipSync } from "fflate";

/*
 * Tiny Office and OpenDocument files built in memory for tests. Real files contain much
 * more (styles, themes, pictures), but the readers only look at the parts built here.
 */

const P =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function zip(files: Record<string, string>): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

export const para = (text: string, lvl?: number) =>
  `<a:p>${lvl ? `<a:pPr lvl="${lvl}"/>` : ""}<a:r><a:rPr lang="en-IN"/><a:t>${text}</a:t></a:r></a:p>`;

export const shape = (paragraphs: string, placeholder?: string) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="s"/><p:cNvSpPr/><p:nvPr>${placeholder ? `<p:ph type="${placeholder}"/>` : ""}</p:nvPr></p:nvSpPr><p:txBody><a:bodyPr/>${paragraphs}</p:txBody></p:sp>`;

export const picture = `<p:pic><p:nvPicPr><p:cNvPr id="4" name="Picture"/></p:nvPicPr><p:blipFill><a:blip r:embed="rId9"/></p:blipFill></p:pic>`;

export const table = (rows: string[][]) =>
  `<p:graphicFrame><a:graphic><a:graphicData><a:tbl>${rows
    .map(
      (r) =>
        `<a:tr>${r.map((c) => `<a:tc><a:txBody><a:bodyPr/>${para(c)}</a:txBody></a:tc>`).join("")}</a:tr>`,
    )
    .join("")}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;

export type FixtureSlide = { shapes: string; notes?: string; hidden?: boolean };

/** A .pptx whose presentation order is `order` (file numbers), to test reordering. */
export function makePptx(slides: FixtureSlide[], order = slides.map((_, i) => i + 1)): Uint8Array {
  const files: Record<string, string> = {
    "[Content_Types].xml": "<Types/>",
    "ppt/presentation.xml": `<?xml version="1.0"?><p:presentation ${P}><p:sldIdLst>${order
      .map((n) => `<p:sldId id="${255 + n}" r:id="rId${n}"/>`)
      .join("")}</p:sldIdLst></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": `<Relationships>${slides
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="${REL}/slide" Target="slides/slide${i + 1}.xml"/>`,
      )
      .join("")}</Relationships>`,
  };
  slides.forEach((s, i) => {
    const n = i + 1;
    files[`ppt/slides/slide${n}.xml`] =
      `<?xml version="1.0"?><p:sld ${P}${s.hidden ? ' show="0"' : ""}><p:cSld><p:spTree>${s.shapes}</p:spTree></p:cSld></p:sld>`;
    if (s.notes !== undefined) {
      files[`ppt/slides/_rels/slide${n}.xml.rels`] =
        `<Relationships><Relationship Id="rId1" Type="${REL}/notesSlide" Target="../notesSlides/notesSlide${n}.xml"/></Relationships>`;
      files[`ppt/notesSlides/notesSlide${n}.xml`] =
        `<p:notes ${P}><p:cSld><p:spTree>${shape(para(String(n)), "sldNum")}${shape(para(s.notes), "body")}</p:spTree></p:cSld></p:notes>`;
    }
  });
  return zip(files);
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

export const wPara = (
  text: string,
  opts: { style?: string; list?: boolean; pageBreakBefore?: boolean } = {},
) =>
  `<w:p><w:pPr>${opts.style ? `<w:pStyle w:val="${opts.style}"/>` : ""}${opts.list ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ""}</w:pPr><w:r>${opts.pageBreakBefore ? "<w:lastRenderedPageBreak/>" : ""}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

export const wTable = (rows: string[][]) =>
  `<w:tbl>${rows.map((r) => `<w:tr>${r.map((c) => `<w:tc>${wPara(c)}</w:tc>`).join("")}</w:tr>`).join("")}</w:tbl>`;

export function makeDocx(body: string): Uint8Array {
  return zip({
    "[Content_Types].xml": "<Types/>",
    "word/document.xml": `<?xml version="1.0"?><w:document ${W}><w:body>${body}<w:sectPr/></w:body></w:document>`,
    "word/styles.xml": `<w:styles ${W}><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style><w:style w:type="paragraph" w:styleId="Berschrift2"><w:name w:val="heading 2"/></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/></w:style><w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style></w:styles>`,
  });
}

export function makeXlsx(
  sheets: { name: string; rows: (string | number)[][]; hidden?: boolean }[],
): Uint8Array {
  const strings: string[] = [];
  const index = (s: string) => {
    const i = strings.indexOf(s);
    if (i !== -1) return i;
    strings.push(s);
    return strings.length - 1;
  };
  const files: Record<string, string> = {
    "xl/workbook.xml": `<workbook xmlns:r="${REL}"><sheets>${sheets
      .map(
        (s, i) =>
          `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"${s.hidden ? ' state="hidden"' : ""}/>`,
      )
      .join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships>${sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("")}</Relationships>`,
  };
  sheets.forEach((s, i) => {
    const rows = s.rows
      .map(
        (r, ri) =>
          `<row r="${ri + 1}">${r
            .map((v, ci) => {
              const ref = `${String.fromCharCode(65 + ci)}${ri + 1}`;
              if (v === "") return "";
              return typeof v === "number"
                ? `<c r="${ref}"><v>${v}</v></c>`
                : `<c r="${ref}" t="s"><v>${index(v)}</v></c>`;
            })
            .join("")}</row>`,
      )
      .join("");
    files[`xl/worksheets/sheet${i + 1}.xml`] =
      `<worksheet><sheetData>${rows}</sheetData></worksheet>`;
  });
  files["xl/sharedStrings.xml"] =
    `<sst>${strings.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`;
  return zip(files);
}

const ODF =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"';

export function makeOdt(body: string): Uint8Array {
  return zip({
    mimetype: "application/vnd.oasis.opendocument.text",
    "content.xml": `<office:document-content ${ODF}><office:body><office:text>${body}</office:text></office:body></office:document-content>`,
  });
}

export function makeOdp(pages: string): Uint8Array {
  return zip({
    mimetype: "application/vnd.oasis.opendocument.presentation",
    "content.xml": `<office:document-content ${ODF}><office:automatic-styles><style:style style:family="drawing-page" style:name="dpHidden"><style:drawing-page-properties presentation:visibility="hidden"/></style:style></office:automatic-styles><office:body><office:presentation>${pages}</office:presentation></office:body></office:document-content>`,
  });
}
