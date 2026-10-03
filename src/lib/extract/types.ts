/*
 * One shape for every uploaded file (V2.5 · Step 1). Whatever the format, a file becomes
 * sections (a slide, a page, a heading's part, a sheet) holding text blocks. Like sorting
 * loose handouts into one ring binder with numbered tabs: the rest of Prism (search, citations,
 * preview) only ever reads the binder, never the original file.
 */

export type FileFormat =
  "pdf" | "pptx" | "docx" | "xlsx" | "csv" | "txt" | "md" | "rtf" | "image" | "odt" | "odp";

export type SectionKind = "slide" | "page" | "heading" | "sheet" | "part" | "image";
export type BlockKind = "title" | "heading" | "paragraph" | "list" | "table" | "notes";

export type TextBlock = { kind: BlockKind; text: string };

export type ExtractedSection = {
  kind: SectionKind;
  /** 1-based position in the file (slide 14 is index 14, even if earlier slides are hidden). */
  index: number;
  /** Where it is, for citations: "slide 14", "page 3", "“Gauss's law”", "sheet “Marks”". */
  label: string;
  title?: string;
  blocks: TextBlock[];
  /** Pictures, charts or diagrams found in this section. */
  images: number;
  /** Almost no text: the content is probably in a picture (offer "Read text from images"). */
  thin: boolean;
};

export type ExtractedDoc = {
  name: string;
  format: FileFormat;
  sections: ExtractedSection[];
  /** Friendly notes for the student, e.g. "Only the first 400 slides were read." */
  warnings: string[];
};

export type ExtractErrorKind =
  "legacy" | "password" | "corrupt" | "unsupported" | "too-big" | "empty";

/** A file Prism can't read, with a message the student can act on. */
export class ExtractError extends Error {
  constructor(
    readonly kind: ExtractErrorKind,
    message: string,
    /** A short how-to, e.g. how to re-save an old .ppt as .pptx. */
    readonly howTo?: string,
  ) {
    super(message);
  }
}

/** Fewer words than this (and usually a picture) means "content is in an image". */
export const THIN_WORDS = 8;
/** Larger files get a clear message instead of freezing the browser. */
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
/** Slides, pages or sections read per file; the rest are skipped with a warning. */
export const MAX_SECTIONS = 400;

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** A section's text, title first, ready for searching. */
export function sectionText(section: ExtractedSection): string {
  return section.blocks
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** The whole file as plain text (for example to find past-paper questions). */
export function docText(doc: ExtractedDoc): string {
  return doc.sections.map(sectionText).filter(Boolean).join("\n\n");
}

export function hasText(doc: ExtractedDoc): boolean {
  return doc.sections.some((s) => !s.thin && sectionText(s).length > 0);
}

/** What one section is called, for counts like "12 slides". */
export function unitName(format: FileFormat | undefined, count: number): string {
  const word: Record<FileFormat, string> = {
    pdf: "page",
    pptx: "slide",
    odp: "slide",
    docx: "section",
    odt: "section",
    md: "section",
    xlsx: "sheet",
    csv: "part",
    txt: "part",
    rtf: "part",
    image: "image",
  };
  const w = word[format ?? "pdf"];
  return `${count} ${w}${count === 1 ? "" : "s"}`;
}

/** Shortens a heading for use inside a citation. */
export function quoteTitle(title: string, max = 60): string {
  const t = title.replace(/\s+/g, " ").trim();
  return `“${t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t}”`;
}

/**
 * Finishes a file: drops empty blocks, marks thin sections, caps the length and warns when
 * nothing readable was found. Every parser ends here so the rules are the same for all formats.
 */
export function finishDoc(
  name: string,
  format: FileFormat,
  sections: ExtractedSection[],
  warnings: string[] = [],
): ExtractedDoc {
  const cleaned = sections.map((s) => {
    const blocks = s.blocks
      .map((b) => ({ ...b, text: tidy(b.text) }))
      .filter((b) => b.text.length > 0);
    const words = wordCount(blocks.map((b) => b.text).join(" "));
    const thin = s.kind === "image" || (words < THIN_WORDS && (s.images > 0 || s.kind === "page"));
    return { ...s, blocks, thin };
  });
  // A heading or part with nothing in it (and no picture) is just noise.
  const kept = cleaned.filter((s) => s.blocks.length > 0 || s.images > 0 || s.kind === "slide");
  const out = [...warnings];
  if (kept.length > MAX_SECTIONS) {
    out.push(`This file is very long: only the first ${MAX_SECTIONS} parts were read.`);
  }
  const doc = { name, format, sections: kept.slice(0, MAX_SECTIONS), warnings: out };
  const thin = doc.sections.filter((s) => s.thin);
  if (doc.sections.length > 0 && thin.length === doc.sections.length) {
    doc.warnings.push(
      "Almost no text was found: this looks like a scan or photos, so the content is in images.",
    );
  } else if (thin.length > 0) {
    // Never skip them silently: say where the picture-only parts are.
    const where = thin.slice(0, 6).map((s) => s.label);
    doc.warnings.push(
      `Content is in an image on ${where.join(", ")}${thin.length > 6 ? ` and ${thin.length - 6} more` : ""}: its text wasn't read.`,
    );
  }
  return doc;
}

/** Collapses runs of spaces but keeps line breaks (lists and tables need them). */
function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      // Leading spaces show a sub-bullet's level, so they are kept (up to 8).
      const indent = (/^ */.exec(line)?.[0] ?? "").slice(0, 8);
      const rest = line.replace(/\s+/g, " ").trim();
      return rest ? indent + rest : "";
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "");
}
