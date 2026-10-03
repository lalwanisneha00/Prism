import { ExtractError, MAX_FILE_BYTES, type FileFormat } from "@/lib/extract/types";

/*
 * Works out what a file really is from its name and its first bytes (every format starts
 * with a recognisable "signature", like the cover of a book). Old Office formats and
 * password-protected files get a friendly explanation instead of a confusing failure.
 */

const BY_EXTENSION: Record<string, FileFormat> = {
  pdf: "pdf",
  pptx: "pptx",
  ppsx: "pptx",
  pptm: "pptx",
  ppsm: "pptx",
  potx: "pptx",
  docx: "docx",
  docm: "docx",
  dotx: "docx",
  xlsx: "xlsx",
  xlsm: "xlsx",
  csv: "csv",
  tsv: "csv",
  txt: "txt",
  text: "txt",
  md: "md",
  markdown: "md",
  rtf: "rtf",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  odt: "odt",
  odp: "odp",
};

const ZIP_FORMATS = new Set<FileFormat>(["pptx", "docx", "xlsx", "odt", "odp"]);

/** What the upload box accepts (the file picker's filter). */
export const ACCEPT = [
  ...Object.keys(BY_EXTENSION).map((e) => `.${e}`),
  ".ppt",
  ".pps",
  ".doc",
  ".xls",
].join(",");

export const FORMAT_NAMES =
  "PDF, PowerPoint (.pptx), Word (.docx), Excel (.xlsx), CSV, text, Markdown, RTF, images (PNG, JPG, WebP) and OpenDocument (.odt, .odp)";

const LEGACY: Record<string, { app: string; modern: string; howTo: string }> = {
  ppt: {
    app: "PowerPoint",
    modern: ".pptx",
    howTo:
      "In PowerPoint: File → Save As → “PowerPoint Presentation (.pptx)” or PDF.\nIn Google Slides: upload it to Drive, open it, then File → Download → Microsoft PowerPoint (.pptx).",
  },
  doc: {
    app: "Word",
    modern: ".docx",
    howTo:
      "In Word: File → Save As → “Word Document (.docx)” or PDF.\nIn Google Docs: upload it to Drive, open it, then File → Download → Microsoft Word (.docx).",
  },
  xls: {
    app: "Excel",
    modern: ".xlsx",
    howTo:
      "In Excel: File → Save As → “Excel Workbook (.xlsx)” or CSV.\nIn Google Sheets: upload it to Drive, open it, then File → Download → Microsoft Excel (.xlsx).",
  },
};
const LEGACY_EXT: Record<string, keyof typeof LEGACY> = {
  ppt: "ppt",
  pps: "ppt",
  pot: "ppt",
  doc: "doc",
  dot: "doc",
  xls: "xls",
};

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function startsWith(head: Uint8Array, bytes: number[], offset = 0): boolean {
  return bytes.every((b, i) => head[offset + i] === b);
}

const isZip = (h: Uint8Array) => startsWith(h, [0x50, 0x4b]);
/** Old Office files (and password-protected new ones) use this "compound file" signature. */
const isCompound = (h: Uint8Array) =>
  startsWith(h, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const isPdf = (h: Uint8Array) => {
  const text = new TextDecoder("latin1").decode(h.subarray(0, 1024));
  return text.includes("%PDF-");
};
const isImage = (h: Uint8Array) =>
  startsWith(h, [0x89, 0x50, 0x4e, 0x47]) || // PNG
  startsWith(h, [0xff, 0xd8, 0xff]) || // JPEG
  (startsWith(h, [0x52, 0x49, 0x46, 0x46]) && startsWith(h, [0x57, 0x45, 0x42, 0x50], 8)); // WebP

/**
 * Returns the format to read the file as, or throws an ExtractError explaining why it
 * can't be read. `head` is the first few kilobytes of the file.
 */
export function detectFormat(name: string, size: number, head: Uint8Array): FileFormat {
  if (size === 0) throw new ExtractError("empty", "This file is empty.");
  if (size > MAX_FILE_BYTES) {
    throw new ExtractError(
      "too-big",
      `This file is over ${MAX_FILE_BYTES / 1024 / 1024} MB. Try splitting it, or save it as a PDF without pictures.`,
    );
  }
  const ext = extensionOf(name);
  const legacy = LEGACY_EXT[ext];
  if (legacy && !isZip(head)) {
    const info = LEGACY[legacy];
    throw new ExtractError(
      "legacy",
      `This is an old-style ${info.app} file (.${ext}), which browsers can't read reliably. Please open it and save it as ${info.modern} or PDF, then upload it again.`,
      info.howTo,
    );
  }
  if (ext === "heic" || ext === "heif") {
    throw new ExtractError(
      "unsupported",
      "iPhone HEIC photos can't be read in the browser. Share the photo as JPG (or take a screenshot of it) and upload that.",
    );
  }

  // A ".ppt" that is really a ZIP is a renamed .pptx: read it as one.
  const renamed: Record<keyof typeof LEGACY, FileFormat> = {
    ppt: "pptx",
    doc: "docx",
    xls: "xlsx",
  };
  let format: FileFormat | undefined = BY_EXTENSION[ext] ?? (legacy && renamed[legacy]);
  // No (or an unknown) extension: trust the signature.
  if (!format) {
    if (isPdf(head)) format = "pdf";
    else if (isImage(head)) format = "image";
  }
  if (!format) {
    throw new ExtractError(
      "unsupported",
      `Prism can't read this type of file. It can read ${FORMAT_NAMES}.`,
    );
  }

  if (ZIP_FORMATS.has(format) && !isZip(head)) {
    if (isCompound(head)) {
      throw new ExtractError(
        "password",
        "This file is password-protected (or is an old-format file renamed). Remove the password (File → Info → Protect → Encrypt with Password, then clear it), save, and upload again.",
      );
    }
    throw new ExtractError(
      "corrupt",
      "This file seems to be damaged or isn't really the type its name says.",
    );
  }
  if (format === "pdf" && !isPdf(head)) {
    throw new ExtractError("corrupt", "This file doesn't look like a real PDF. It may be damaged.");
  }
  if (format === "image" && !isImage(head)) {
    throw new ExtractError(
      "corrupt",
      "This picture couldn't be read. Try saving it again as PNG or JPG.",
    );
  }
  return format;
}
