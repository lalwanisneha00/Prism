import {
  finishDoc,
  quoteTitle,
  type ExtractedDoc,
  type ExtractedSection,
} from "@/lib/extract/types";
import {
  attr,
  childElements,
  findAll,
  findFirst,
  isElement,
  localName,
  type XmlElement,
} from "@/lib/extract/xml";
import { openZip, readRels, readXml } from "@/lib/extract/zip";

/*
 * Excel (.xlsx): every visible sheet becomes a table, one row per line with " | " between
 * cells. Good for question banks, mark schemes and data sheets. Formulas are not
 * recalculated: we read the value Excel saved with the file.
 */

export const MAX_ROWS_PER_SHEET = 1000;

export function extractXlsx(name: string, data: Uint8Array): ExtractedDoc {
  const zip = openZip(
    data,
    (f) => f.startsWith("xl/") && /\.(xml|rels)$/.test(f) && !f.includes("/media/"),
  );
  const shared = sharedStrings(readXml(zip, "xl/sharedStrings.xml"));
  const rels = new Map(readRels(zip, "xl/workbook.xml").map((r) => [r.id, r.target]));
  const workbook = readXml(zip, "xl/workbook.xml");
  const warnings: string[] = [];

  const sheets = workbook ? findAll(workbook, "sheet") : [];
  const sections: ExtractedSection[] = [];
  sheets.forEach((sheet, i) => {
    if (attr(sheet, "state") === "hidden" || attr(sheet, "state") === "veryHidden") return;
    const target = rels.get(attr(sheet, "r:id") ?? "");
    const xml = target ? readXml(zip, target) : undefined;
    if (!xml) return;
    const sheetName = attr(sheet, "name") ?? `Sheet ${i + 1}`;
    const { text, truncated } = sheetText(xml, shared);
    if (truncated) {
      warnings.push(`Sheet “${sheetName}”: only the first ${MAX_ROWS_PER_SHEET} rows were read.`);
    }
    sections.push({
      kind: "sheet",
      index: i + 1,
      label: `sheet ${quoteTitle(sheetName)}`,
      title: sheetName,
      blocks: [{ kind: "table", text }],
      images: 0,
      thin: false,
    });
  });
  return finishDoc(name, "xlsx", sections, warnings);
}

function sharedStrings(xml: XmlElement | undefined): string[] {
  if (!xml) return [];
  return findAll(xml, "si").map(cellString);
}

/** Text of a rich-text item, without the phonetic guide (rPh) some fonts add. */
function cellString(el: XmlElement): string {
  let text = "";
  const walk = (node: XmlElement) => {
    for (const c of node.children) {
      if (!isElement(c)) continue;
      const kind = localName(c.name);
      if (kind === "t") text += c.children.filter((x) => typeof x === "string").join("");
      else if (kind !== "rPh") walk(c);
    }
  };
  walk(el);
  return text;
}

/** "BC12" → 54 (0-based column of BC). */
export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetText(xml: XmlElement, shared: string[]): { text: string; truncated: boolean } {
  const data = findFirst(xml, "sheetData");
  const rows = data ? childElements(data, "row") : [];
  const lines: string[] = [];
  for (const row of rows) {
    if (lines.length >= MAX_ROWS_PER_SHEET) return { text: lines.join("\n"), truncated: true };
    const cells: string[] = [];
    childElements(row, "c").forEach((c, position) => {
      const ref = attr(c, "r");
      const col = ref ? columnIndex(ref) : position;
      if (col > 200) return;
      cells[col] = cellValue(c, shared).replace(/\s+/g, " ").trim();
    });
    const line = Array.from(cells, (v) => v ?? "")
      .join(" | ")
      .replace(/(\s*\|\s*)+$/, "")
      .replace(/^(\s*\|\s*)+/, "");
    if (line.replace(/[|\s]/g, "")) lines.push(line);
  }
  return { text: lines.join("\n"), truncated: false };
}

function cellValue(c: XmlElement, shared: string[]): string {
  const type = attr(c, "t");
  if (type === "inlineStr") {
    const is = childElements(c, "is")[0];
    return is ? cellString(is) : "";
  }
  const v = childElements(c, "v")[0];
  const raw = v ? v.children.filter((x) => typeof x === "string").join("") : "";
  if (type === "s") return shared[Number(raw)] ?? "";
  if (type === "b") return raw === "1" ? "TRUE" : "FALSE";
  return raw;
}
