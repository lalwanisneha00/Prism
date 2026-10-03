import {
  finishDoc,
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
  path,
  type XmlElement,
} from "@/lib/extract/xml";
import { metafileText } from "@/lib/extract/metafile";
import { openZip, partNumber, readRels, readXml, type ZipFolder } from "@/lib/extract/zip";

/*
 * PowerPoint (.pptx, .ppsx): slides in the order the deck shows them, each slide's title,
 * its text boxes and tables, and the speaker notes. Pictures aren't read here; they are
 * counted, so a picture-only slide can be marked "content is in an image".
 */

const TITLE_TYPES = new Set(["title", "ctrTitle"]);
const SKIP_TYPES = new Set(["sldNum", "dt", "ftr", "hdr"]);

export function extractPptx(name: string, data: Uint8Array): ExtractedDoc {
  const zip = openZip(
    data,
    (f) =>
      (f.startsWith("ppt/") && /\.(xml|rels)$/.test(f)) ||
      /^ppt\/media\/[^/]+\.(wmf|emf)$/i.test(f),
  );
  const slidePaths = slideOrder(zip);
  const warnings: string[] = [];
  let hidden = 0;

  const sections: ExtractedSection[] = [];
  slidePaths.forEach((slidePath, i) => {
    const xml = readXml(zip, slidePath);
    const slide = xml && childElements(xml, "sld")[0];
    if (!slide) return;
    // Hidden slides keep their number (so "slide 14" matches PowerPoint) but aren't read.
    if (attr(slide, "show") === "0") {
      hidden++;
      return;
    }
    const tree = path(slide, "cSld", "spTree");
    const found = tree
      ? readShapes(tree, pictureText(zip, slidePath))
      : { title: undefined, blocks: [], images: 0 };
    const notes = speakerNotes(zip, slidePath);
    const blocks: TextBlock[] = [
      ...(found.title ? [{ kind: "title" as const, text: found.title }] : []),
      ...found.blocks,
      ...(notes ? [{ kind: "notes" as const, text: notes }] : []),
    ];
    sections.push({
      kind: "slide",
      index: i + 1,
      label: `slide ${i + 1}`,
      title: found.title,
      blocks,
      images: found.images,
      thin: false,
      ...(found.images > 0 ? { pictures: rasterPictures(zip, slidePath, slide) } : {}),
    });
  });
  if (hidden > 0) {
    warnings.push(`${hidden} hidden ${hidden === 1 ? "slide was" : "slides were"} skipped.`);
  }
  return finishDoc(name, "pptx", sections, warnings);
}

/** The photos (PNG, JPG…) on a slide, as paths inside the file, for reading their text later. */
function rasterPictures(zip: ZipFolder, slidePath: string, slide: XmlElement): string[] {
  const rels = new Map(readRels(zip, slidePath).map((r) => [r.id, r.target]));
  const paths = findAll(slide, "blip")
    .map((b) => rels.get(attr(b, "r:embed") ?? ""))
    .filter((p): p is string => Boolean(p && /\.(png|jpe?g|gif|bmp|webp)$/i.test(p)));
  return [...new Set(paths)];
}

/** Slide files in presentation order (falls back to file-name order). */
function slideOrder(zip: ZipFolder): string[] {
  const pres = readXml(zip, "ppt/presentation.xml");
  const rels = new Map(readRels(zip, "ppt/presentation.xml").map((r) => [r.id, r.target]));
  const list = pres && findFirst(pres, "sldIdLst");
  const ordered = list
    ? childElements(list, "sldId")
        .map((s) => rels.get(attr(s, "r:id") ?? ""))
        .filter((p): p is string => Boolean(p && zip.files[p]))
    : [];
  if (ordered.length > 0) return ordered;
  return Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => partNumber(a) - partNumber(b));
}

type Shapes = { title?: string; blocks: TextBlock[]; images: number };

/**
 * The text inside a slide object's preview picture: old Equation 3.0 and MathType equations
 * are saved as WMF/EMF pictures whose characters can be read back (see metafile.ts).
 */
function pictureText(zip: ZipFolder, slidePath: string): (el: XmlElement) => string {
  const rels = new Map(readRels(zip, slidePath).map((r) => [r.id, r.target]));
  return (el) => {
    for (const blip of findAll(el, "blip")) {
      const target = rels.get(attr(blip, "r:embed") ?? "");
      const bytes = target && /\.(wmf|emf)$/i.test(target) ? zip.files[target] : undefined;
      const text = bytes ? metafileText(bytes) : "";
      if (text) return text;
    }
    return "";
  };
}

/** Walks a slide's shape tree in reading order (groups included). */
function readShapes(tree: XmlElement, picText: (el: XmlElement) => string): Shapes {
  const out: Shapes = { blocks: [], images: 0 };
  const walk = (node: XmlElement) => {
    for (const child of node.children) {
      if (!isElement(child)) continue;
      const kind = localName(child.name);
      if (kind === "AlternateContent") {
        // Two copies of the same content (new and old style): read only the first.
        const choice = childElements(child)[0];
        if (choice) walk(choice);
      } else if (kind === "grpSp") {
        walk(child);
      } else if (kind === "pic") {
        // A pasted equation picture is read; any other picture is counted.
        const text = picText(child);
        if (text) out.blocks.push({ kind: "equation", text });
        else out.images++;
      } else if (kind === "graphicFrame") {
        const table = findFirst(child, "tbl");
        const equation = !table && findFirst(child, "oleObj") ? picText(child) : "";
        if (table) out.blocks.push({ kind: "table", text: tableText(table) });
        else if (equation) out.blocks.push({ kind: "equation", text: equation });
        else out.images++; // a chart, diagram (SmartArt) or embedded object
      } else if (kind === "sp" || kind === "cxnSp") {
        readShape(child, out);
      }
    }
  };
  walk(tree);
  return out;
}

function readShape(shape: XmlElement, out: Shapes) {
  const placeholder = findFirst(path(shape, "nvSpPr") ?? shape, "ph");
  const type = placeholder ? (attr(placeholder, "type") ?? "body") : "";
  if (SKIP_TYPES.has(type)) return;
  const body = firstChildNamed(shape, "txBody");
  if (!body) {
    // A shape filled with a picture still counts as a picture.
    if (findFirst(shape, "blipFill")) out.images++;
    return;
  }
  const text = paragraphsText(body);
  if (!text) return;
  if (TITLE_TYPES.has(type) && !out.title) {
    out.title = text.replace(/\n/g, " ");
  } else {
    out.blocks.push({ kind: "paragraph", text });
  }
}

function firstChildNamed(el: XmlElement, name: string): XmlElement | undefined {
  return childElements(el, name)[0];
}

/** Text of a text body: one line per paragraph, bullets indented by level. */
export function paragraphsText(body: XmlElement): string {
  return childElements(body, "p")
    .map((p) => {
      const level = Number(attr(childElements(p, "pPr")[0] ?? p, "lvl") ?? 0);
      const line = runText(p).trim();
      return line ? `${"  ".repeat(Math.min(level, 4))}${line}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function runText(p: XmlElement): string {
  let text = "";
  for (const child of p.children) {
    if (!isElement(child)) continue;
    const kind = localName(child.name);
    // "m" is an equation typed with PowerPoint's equation editor (Office Math): its symbols
    // are text, read in order (a fraction a/b reads as "ab", so it's approximate).
    if (kind === "r" || kind === "fld" || kind === "m") {
      text += findAll(child, "t")
        .map((t) => t.children.filter((c) => typeof c === "string").join(""))
        .join("");
    } else if (kind === "br") {
      text += "\n";
    } else if (kind === "AlternateContent") {
      const choice = childElements(child)[0];
      if (choice) text += runText(choice);
    }
  }
  return text;
}

function tableText(table: XmlElement): string {
  return childElements(table, "tr")
    .map((row) =>
      childElements(row, "tc")
        .map((cell) => {
          const body = firstChildNamed(cell, "txBody");
          return body ? paragraphsText(body).replace(/\n/g, " ") : "";
        })
        .join(" | ")
        .replace(/(\s*\|\s*)+$/, ""),
    )
    .filter((row) => row.replace(/[|\s]/g, "").length > 0)
    .join("\n");
}

/** The speaker notes for a slide (the notes body only, not the slide number). */
function speakerNotes(zip: ZipFolder, slidePath: string): string {
  const rel = readRels(zip, slidePath).find((r) => r.type.endsWith("/notesSlide"));
  const xml = rel && readXml(zip, rel.target);
  const tree = xml && findFirst(xml, "spTree");
  if (!tree) return "";
  const texts: string[] = [];
  for (const shape of findAll(tree, "sp")) {
    const ph = findFirst(shape, "ph");
    if (!ph || attr(ph, "type") !== "body") continue;
    const body = firstChildNamed(shape, "txBody");
    if (body) texts.push(paragraphsText(body));
  }
  return texts.filter(Boolean).join("\n");
}
