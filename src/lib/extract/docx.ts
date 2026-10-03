import {
  finishDoc,
  quoteTitle,
  wordCount,
  type ExtractedDoc,
  type ExtractedSection,
  type TextBlock,
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
import { openZip, readXml } from "@/lib/extract/zip";

/*
 * Word (.docx): headings, paragraphs, lists and tables in order. The document is split at
 * its main headings (levels 1–2), so a citation can say which part a passage came from.
 * A document without headings is split by page when Word recorded page breaks, otherwise
 * into parts of about 300 words.
 */

type Para = { kind: "heading"; level: number; text: string } | { kind: "block"; block: TextBlock };

export function extractDocx(name: string, data: Uint8Array): ExtractedDoc {
  const zip = openZip(data, (f) => f === "word/document.xml" || f === "word/styles.xml");
  const doc = readXml(zip, "word/document.xml");
  const body = doc && findFirst(doc, "body");
  if (!body) return finishDoc(name, "docx", []);

  const styles = readStyles(readXml(zip, "word/styles.xml"));
  const items: { para: Para; page: number; images: number }[] = [];
  let page = 1;

  const visit = (node: XmlElement) => {
    for (const child of node.children) {
      if (!isElement(child)) continue;
      const kind = localName(child.name);
      if (kind === "p") {
        const breaks = pageBreaks(child);
        // A page that last ended inside this paragraph means it starts on the next page.
        page += breaks.rendered;
        const images = findAll(child, "drawing").length + findAll(child, "pict").length;
        const para = readParagraph(child, styles);
        if (para || images) items.push({ para: para ?? emptyBlock, page, images });
        page += breaks.manual;
      } else if (kind === "tbl") {
        const breaks = pageBreaks(child);
        page += breaks.rendered;
        items.push({
          para: { kind: "block", block: { kind: "table", text: tableText(child) } },
          page,
          images: 0,
        });
        page += breaks.manual;
      } else if (kind === "sdt") {
        const content = childElements(child, "sdtContent")[0];
        if (content) visit(content);
      } else if (kind === "customXml" || kind === "ins") {
        visit(child);
      }
    }
  };
  visit(body);

  const hasHeadings = items.some((it) => it.para.kind === "heading" && it.para.level <= 2);
  const sections = hasHeadings ? byHeadings(items) : page > 1 ? byPages(items) : byParts(items);
  return finishDoc(name, "docx", sections);
}

const emptyBlock: Para = { kind: "block", block: { kind: "paragraph", text: "" } };

type Styles = { headings: Map<string, number>; lists: Set<string> };

/**
 * From styles.xml: style id → heading level ("heading 1" → 1, "Title" → 0), and the styles
 * that are bulleted or numbered lists (Word's "List Bullet" keeps its bullet in the style).
 */
function readStyles(styles: XmlElement | undefined): Styles {
  const out: Styles = { headings: new Map(), lists: new Set() };
  if (!styles) return out;
  for (const style of findAll(styles, "style")) {
    const id = attr(style, "w:styleId");
    const styleName = attr(childElements(style, "name")[0] ?? style, "w:val") ?? "";
    if (!id) continue;
    const level = headingLevel(styleName) ?? headingLevel(id);
    if (level !== undefined) out.headings.set(id, level);
    const props = childElements(style, "pPr")[0];
    if (
      (props && childElements(props, "numPr").length > 0) ||
      /^list (bullet|number)/i.test(styleName)
    ) {
      out.lists.add(id);
    }
  }
  return out;
}

function headingLevel(styleName: string): number | undefined {
  if (/^title$/i.test(styleName)) return 0;
  const m = /^heading\s?(\d)$/i.exec(styleName);
  return m ? Number(m[1]) : undefined;
}

function readParagraph(p: XmlElement, styles: Styles): Para | undefined {
  const text = paragraphText(p).trim();
  if (!text) return undefined;
  const props = childElements(p, "pPr")[0];
  const styleId = props && attr(childElements(props, "pStyle")[0] ?? props, "w:val");
  // Outline level 9 means "body text"; 0–8 are heading levels 1–9.
  const outline = Number(attr(childElements(props ?? p, "outlineLvl")[0] ?? p, "w:val") ?? 9);
  const level =
    (styleId !== undefined ? (styles.headings.get(styleId) ?? headingLevel(styleId)) : undefined) ??
    (outline < 9 ? outline + 1 : undefined);
  if (level !== undefined && Number.isFinite(level) && text.length <= 200) {
    return { kind: "heading", level, text };
  }
  const isList =
    Boolean(props && childElements(props, "numPr").length > 0) ||
    (styleId !== undefined && styles.lists.has(styleId));
  return {
    kind: "block",
    block: { kind: isList ? "list" : "paragraph", text: isList ? `• ${text}` : text },
  };
}

/** A paragraph's visible text: runs, tabs and line breaks; deleted text and field codes skipped. */
function paragraphText(p: XmlElement): string {
  let text = "";
  const walk = (node: XmlElement) => {
    for (const child of node.children) {
      if (!isElement(child)) continue;
      const kind = localName(child.name);
      if (kind === "t") text += child.children.filter((c) => typeof c === "string").join("");
      else if (kind === "tab") text += "\t";
      else if (kind === "br" || kind === "cr")
        text += attr(child, "w:type") === "page" ? " " : "\n";
      else if (kind === "AlternateContent") {
        const choice = childElements(child)[0];
        if (choice) walk(choice);
      } else if (kind !== "del" && kind !== "instrText" && kind !== "delText" && kind !== "pPr") {
        walk(child);
      }
    }
  };
  walk(p);
  return text;
}

/** Page breaks Word recorded inside an element (manual breaks and where pages last ended). */
function pageBreaks(el: XmlElement): { rendered: number; manual: number } {
  return {
    rendered: findAll(el, "lastRenderedPageBreak").length,
    manual: findAll(el, "br").filter((b) => attr(b, "w:type") === "page").length,
  };
}

function tableText(table: XmlElement): string {
  return childElements(table, "tr")
    .map((row) =>
      childElements(row, "tc")
        .map((cell) =>
          childElements(cell, "p")
            .map((p) => paragraphText(p).trim())
            .filter(Boolean)
            .join(" "),
        )
        .join(" | ")
        .replace(/(\s*\|\s*)+$/, ""),
    )
    .filter((row) => row.replace(/[|\s]/g, "").length > 0)
    .join("\n");
}

type Item = { para: Para; page: number; images: number };

function toBlock(para: Para): TextBlock {
  return para.kind === "heading" ? { kind: "heading", text: para.text } : para.block;
}

function byHeadings(items: Item[]): ExtractedSection[] {
  const sections: ExtractedSection[] = [];
  let current: ExtractedSection | undefined;
  for (const item of items) {
    const { para } = item;
    if (para.kind === "heading" && para.level <= 2) {
      current = {
        kind: "heading",
        index: sections.length + 1,
        label: quoteTitle(para.text),
        title: para.text,
        blocks: [{ kind: "heading", text: para.text }],
        images: 0,
        thin: false,
      };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = {
        kind: "part",
        index: 1,
        label: "the beginning",
        blocks: [],
        images: 0,
        thin: false,
      };
      sections.push(current);
    }
    current.blocks.push(toBlock(para));
    current.images += item.images;
  }
  return sections;
}

function byPages(items: Item[]): ExtractedSection[] {
  const pages = new Map<number, ExtractedSection>();
  for (const item of items) {
    const section = pages.get(item.page) ?? {
      kind: "page" as const,
      index: item.page,
      label: `page ${item.page}`,
      blocks: [],
      images: 0,
      thin: false,
    };
    section.blocks.push(toBlock(item.para));
    section.images += item.images;
    pages.set(item.page, section);
  }
  return [...pages.values()];
}

/** Groups paragraphs into parts of about `size` words. */
export function byParts(items: Item[], size = 300): ExtractedSection[] {
  const sections: ExtractedSection[] = [];
  let words = size;
  for (const item of items) {
    if (words >= size) {
      sections.push({
        kind: "part",
        index: sections.length + 1,
        label: `part ${sections.length + 1}`,
        blocks: [],
        images: 0,
        thin: false,
      });
      words = 0;
    }
    const block = toBlock(item.para);
    const current = sections[sections.length - 1];
    current.blocks.push(block);
    current.images += item.images;
    words += wordCount(block.text);
  }
  return sections;
}
