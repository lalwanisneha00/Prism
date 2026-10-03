import { byParts } from "@/lib/extract/docx";
import {
  finishDoc,
  quoteTitle,
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
 * OpenDocument (.odt from LibreOffice Writer, .odp from LibreOffice Impress). Both keep
 * their text in one content.xml, so they are cheap to support alongside Word and PowerPoint.
 */

export function extractOdt(name: string, data: Uint8Array): ExtractedDoc {
  const content = readXml(
    openZip(data, (f) => f === "content.xml"),
    "content.xml",
  );
  const text = content && findFirst(content, "text");
  if (!text) return finishDoc(name, "odt", []);

  type Item = { heading?: { level: number; text: string }; block?: TextBlock; images: number };
  const items: Item[] = [];
  const visit = (node: XmlElement) => {
    for (const child of node.children) {
      if (!isElement(child)) continue;
      const kind = localName(child.name);
      if (kind === "h") {
        const t = inlineText(child).trim();
        const level = Number(attr(child, "text:outline-level") ?? 1);
        if (t) items.push({ heading: { level, text: t }, images: 0 });
      } else if (kind === "p") {
        const t = inlineText(child).trim();
        const images = findAll(child, "image").length;
        if (t || images) items.push({ block: { kind: "paragraph", text: t }, images });
      } else if (kind === "list") {
        for (const p of findAll(child, "p")) {
          const t = inlineText(p).trim();
          if (t) items.push({ block: { kind: "list", text: `• ${t}` }, images: 0 });
        }
      } else if (kind === "table") {
        items.push({ block: { kind: "table", text: odfTable(child) }, images: 0 });
      } else if (kind === "section" || kind === "frame" || kind === "text-box") {
        visit(child);
      }
    }
  };
  visit(text);

  const sections: ExtractedSection[] = [];
  if (items.some((it) => it.heading && it.heading.level <= 2)) {
    for (const it of items) {
      if (it.heading && it.heading.level <= 2) {
        sections.push({
          kind: "heading",
          index: sections.length + 1,
          label: quoteTitle(it.heading.text),
          title: it.heading.text,
          blocks: [{ kind: "heading", text: it.heading.text }],
          images: 0,
          thin: false,
        });
        continue;
      }
      if (sections.length === 0) {
        sections.push({
          kind: "part",
          index: 1,
          label: "the beginning",
          blocks: [],
          images: 0,
          thin: false,
        });
      }
      const current = sections[sections.length - 1];
      current.blocks.push(it.heading ? { kind: "heading", text: it.heading.text } : it.block!);
      current.images += it.images;
    }
  } else {
    sections.push(
      ...byParts(
        items.map((it) => ({
          para: it.heading
            ? { kind: "heading" as const, level: it.heading.level, text: it.heading.text }
            : { kind: "block" as const, block: it.block! },
          page: 1,
          images: it.images,
        })),
      ),
    );
  }
  return finishDoc(name, "odt", sections);
}

export function extractOdp(name: string, data: Uint8Array): ExtractedDoc {
  const content = readXml(
    openZip(data, (f) => f === "content.xml"),
    "content.xml",
  );
  const pages = content ? findAll(content, "page").filter((p) => p.name.startsWith("draw:")) : [];
  // A hidden slide's page style says presentation:visibility="hidden".
  const hiddenStyles = new Set(
    (content ? findAll(content, "style") : [])
      .filter((st) =>
        childElements(st, "drawing-page-properties").some(
          (props) => attr(props, "presentation:visibility") === "hidden",
        ),
      )
      .map((st) => attr(st, "style:name") ?? ""),
  );
  const hidden = pages.filter((p) => hiddenStyles.has(attr(p, "draw:style-name") ?? "")).length;
  const sections: ExtractedSection[] = pages.flatMap((page, i): ExtractedSection[] => {
    if (hiddenStyles.has(attr(page, "draw:style-name") ?? "")) return [];
    let title: string | undefined;
    const blocks: TextBlock[] = [];
    let images = 0;
    for (const frame of childElements(page).filter((c) => localName(c.name) !== "notes")) {
      const cls = attr(frame, "presentation:class");
      if (cls === "page-number" || cls === "footer" || cls === "date-time" || cls === "header") {
        continue;
      }
      images += findAll(frame, "image").length + (localName(frame.name) === "object" ? 1 : 0);
      const table = findFirst(frame, "table");
      if (table) {
        blocks.push({ kind: "table", text: odfTable(table) });
        continue;
      }
      const text = findAll(frame, "p")
        .map((p) => inlineText(p).trim())
        .filter(Boolean)
        .join("\n");
      if (!text) continue;
      if (cls === "title" && !title) title = text.replace(/\n/g, " ");
      else blocks.push({ kind: "paragraph", text });
    }
    const notesEl = childElements(page, "notes")[0];
    const notes = notesEl
      ? findAll(notesEl, "frame")
          .filter((f) => attr(f, "presentation:class") === "notes")
          .flatMap((f) => findAll(f, "p").map((p) => inlineText(p).trim()))
          .filter(Boolean)
          .join("\n")
      : "";
    return [
      {
        kind: "slide",
        index: i + 1,
        label: `slide ${i + 1}`,
        title,
        blocks: [
          ...(title ? [{ kind: "title" as const, text: title }] : []),
          ...blocks,
          ...(notes ? [{ kind: "notes" as const, text: notes }] : []),
        ],
        images,
        thin: false,
        // Photos on the slide, for reading their text later (paths inside the file).
        ...(images > 0
          ? {
              pictures: findAll(page, "image")
                .map((img) => attr(img, "xlink:href") ?? "")
                .filter((href) => /\.(png|jpe?g|gif|bmp|webp)$/i.test(href)),
            }
          : {}),
      },
    ];
  });
  const warnings =
    hidden > 0 ? [`${hidden} hidden ${hidden === 1 ? "slide was" : "slides were"} skipped.`] : [];
  return finishDoc(name, "odp", sections, warnings);
}

/** Text inside a paragraph: spans, links, spaces (text:s), tabs and line breaks; footnotes skipped. */
function inlineText(el: XmlElement): string {
  let out = "";
  for (const c of el.children) {
    if (typeof c === "string") {
      out += c.replace(/\s+/g, " ");
      continue;
    }
    const kind = localName(c.name);
    if (kind === "s") out += " ".repeat(Math.min(Number(attr(c, "text:c") ?? 1) || 1, 20));
    else if (kind === "tab") out += "\t";
    else if (kind === "line-break") out += "\n";
    else if (kind !== "note" && kind !== "annotation") out += inlineText(c);
  }
  return out;
}

function odfTable(table: XmlElement): string {
  return findAll(table, "table-row")
    .map((row) =>
      childElements(row, "table-cell")
        .map((cell) =>
          findAll(cell, "p")
            .map((p) => inlineText(p).trim())
            .filter(Boolean)
            .join(" "),
        )
        .join(" | ")
        .replace(/(\s*\|\s*)+$/, ""),
    )
    .filter((row) => row.replace(/[|\s]/g, "").length > 0)
    .join("\n");
}
