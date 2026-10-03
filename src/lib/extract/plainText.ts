import {
  finishDoc,
  quoteTitle,
  wordCount,
  type ExtractedDoc,
  type ExtractedSection,
} from "@/lib/extract/types";

/*
 * The simple formats: plain text, Markdown, RTF and CSV. These are only text, so they are
 * read directly without any library.
 */

/** Decodes bytes as UTF-8, falling back to Windows-1252 (older Windows text files). */
export function decodeText(data: Uint8Array): string {
  const bom = data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf;
  if (data[0] === 0xff && data[1] === 0xfe) return new TextDecoder("utf-16le").decode(data);
  if (data[0] === 0xfe && data[1] === 0xff) return new TextDecoder("utf-16be").decode(data);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bom ? data.subarray(3) : data);
  } catch {
    return new TextDecoder("windows-1252").decode(data);
  }
}

/** Plain text: parts of about 300 words, labelled by line numbers ("lines 12–40"). */
export function extractTxt(
  name: string,
  text: string,
  format: "txt" | "rtf" = "txt",
): ExtractedDoc {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sections: ExtractedSection[] = [];
  let start = 0;
  let words = 0;
  const flush = (end: number) => {
    const body = lines.slice(start, end).join("\n").trim();
    if (body) {
      sections.push({
        kind: "part",
        index: sections.length + 1,
        label: start + 1 === end ? `line ${end}` : `lines ${start + 1}–${end}`,
        blocks: [{ kind: "paragraph", text: body }],
        images: 0,
        thin: false,
      });
    }
    start = end;
    words = 0;
  };
  lines.forEach((line, i) => {
    words += wordCount(line);
    // Close a part at a blank line once it is long enough (or anywhere if it is very long).
    if ((words >= 300 && line.trim() === "") || words >= 600) flush(i + 1);
  });
  flush(lines.length);
  return finishDoc(name, format, sections);
}

/** Markdown: split at # and ## headings; links and images keep only their words. */
export function extractMd(name: string, text: string): ExtractedDoc {
  const clean = text
    .replace(/\r\n?/g, "\n")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const sections: ExtractedSection[] = [];
  let inFence = false;
  for (const line of clean.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const heading = inFence ? null : /^\s{0,3}(#{1,2})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      sections.push({
        kind: "heading",
        index: sections.length + 1,
        label: quoteTitle(heading[2]),
        title: heading[2],
        blocks: [{ kind: "heading", text: heading[2] }],
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
        blocks: [{ kind: "paragraph", text: "" }],
        images: 0,
        thin: false,
      });
    }
    const current = sections[sections.length - 1];
    const last = current.blocks[current.blocks.length - 1];
    if (last.kind === "paragraph") last.text += `\n${line}`;
    else current.blocks.push({ kind: "paragraph", text: line });
  }
  if (!sections.some((s) => s.kind === "heading")) return extractTxt(name, clean);
  return finishDoc(name, "md", sections);
}

/* ---------- RTF ---------- */

/** Groups whose content is formatting data, not text the reader sees. */
const SKIP_DESTINATIONS = new Set([
  "fonttbl",
  "colortbl",
  "stylesheet",
  "info",
  "pict",
  "object",
  "header",
  "footer",
  "headerl",
  "headerr",
  "footerl",
  "footerr",
  "themedata",
  "colorschememapping",
  "latentstyles",
  "datastore",
  "listtable",
  "listoverridetable",
  "rsidtbl",
  "generator",
  "xmlnstbl",
  "fldinst",
  "filetbl",
  "revtbl",
  "pgdsctbl",
]);

/** RTF font character sets → Windows code pages (so "\'e5" in a Greek font reads as ε). */
const CHARSET_CODEPAGE: Record<number, number> = {
  0: 1252,
  128: 932,
  129: 949,
  134: 936,
  136: 950,
  161: 1253,
  162: 1254,
  163: 1258,
  177: 1255,
  178: 1256,
  186: 1257,
  204: 1251,
  222: 874,
  238: 1250,
};

/** The Symbol font draws Latin letters as Greek ones (typing "e" in Symbol shows ε). */
const SYMBOL_LETTERS = "αβχδεφγηιϕκλμνοπθρστυϖωξψζ";
const SYMBOL_CAPITALS = "ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ";
/** Symbol-font codes that aren't Greek letters: operators, arrows and bracket pieces. */
const SYMBOL_OTHER: Record<number, string> = {
  0x22: "∀",
  0x24: "∃",
  0x27: "∋",
  0x2a: "∗",
  0x2d: "−",
  0x40: "≅",
  0x5c: "∴",
  0x5e: "⊥",
  0x7e: "∼",
  0xa2: "′",
  0xa3: "≤",
  0xa5: "∞",
  0xa6: "ƒ",
  0xab: "↔",
  0xac: "←",
  0xad: "↑",
  0xae: "→",
  0xaf: "↓",
  0xb0: "°",
  0xb1: "±",
  0xb2: "″",
  0xb3: "≥",
  0xb4: "×",
  0xb5: "∝",
  0xb6: "∂",
  0xb7: "•",
  0xb8: "÷",
  0xb9: "≠",
  0xba: "≡",
  0xbb: "≈",
  0xbc: "…",
  0xc0: "ℵ",
  0xc4: "⊗",
  0xc5: "⊕",
  0xc6: "∅",
  0xc7: "∩",
  0xc8: "∪",
  0xc9: "⊃",
  0xca: "⊇",
  0xcb: "⊄",
  0xcc: "⊂",
  0xcd: "⊆",
  0xce: "∈",
  0xcf: "∉",
  0xd0: "∠",
  0xd1: "∇",
  0xd5: "∏",
  0xd6: "√",
  0xd7: "⋅",
  0xd8: "¬",
  0xd9: "∧",
  0xda: "∨",
  0xdb: "⇔",
  0xdc: "⇐",
  0xdd: "⇑",
  0xde: "⇒",
  0xdf: "⇓",
  0xe0: "◊",
  0xe1: "〈",
  0xe5: "∑",
  0xf1: "〉",
  0xf2: "∫",
  // Tall brackets are drawn in pieces: keep the top piece as the bracket, drop the rest.
  0xe6: "(",
  0xe7: "",
  0xe8: "",
  0xe9: "[",
  0xea: "",
  0xeb: "",
  0xec: "{",
  0xed: "",
  0xee: "",
  0xef: "",
  0xf3: "∫",
  0xf4: "",
  0xf5: "",
  0xf6: ")",
  0xf7: "",
  0xf8: "",
  0xf9: "]",
  0xfa: "",
  0xfb: "",
  0xfc: "}",
  0xfd: "",
  0xfe: "",
};

export function symbolChar(code: number): string {
  if (code >= 0x61 && code <= 0x7a) return SYMBOL_LETTERS[code - 0x61];
  if (code >= 0x41 && code <= 0x5a) return SYMBOL_CAPITALS[code - 0x41];
  return SYMBOL_OTHER[code] ?? String.fromCharCode(code);
}

type RtfFont = { codepage?: number; symbol: boolean };

/** Reads the font table: font number → its code page, and whether it is the Symbol font. */
function readFontTable(rtf: string): Map<number, RtfFont> {
  const fonts = new Map<number, RtfFont>();
  const start = rtf.indexOf("{\\fonttbl");
  if (start === -1) return fonts;
  let depth = 0;
  let end = start;
  for (; end < rtf.length; end++) {
    if (rtf[end] === "{") depth++;
    else if (rtf[end] === "}" && --depth === 0) break;
  }
  // Drop extras such as {\*\panose …} and {\*\falt …} that sit between a font's number and name.
  const table = rtf.slice(start, end).replace(/\{\\\*\\[a-z]+[^{}]*\}/g, "");
  for (const m of table.matchAll(/\\f(\d+)((?:\\[a-z]+-?\d* ?)*)([^;{}\\]*)/g)) {
    const charset = /\\fcharset(\d+)/.exec(m[2]);
    const name = m[3].trim();
    fonts.set(Number(m[1]), {
      codepage: charset ? CHARSET_CODEPAGE[Number(charset[1])] : undefined,
      symbol: /^symbol$/i.test(name),
    });
  }
  return fonts;
}

const decoders = new Map<number, TextDecoder | null>();
function decoderFor(codepage: number): TextDecoder | null {
  if (!decoders.has(codepage)) {
    try {
      decoders.set(
        codepage,
        new TextDecoder(codepage === 932 ? "shift_jis" : `windows-${codepage}`),
      );
    } catch {
      decoders.set(codepage, null);
    }
  }
  return decoders.get(codepage) ?? null;
}

/** Turns RTF (what WordPad and "Save as RTF" produce) into plain text. */
export function rtfToText(rtf: string): string {
  const fonts = readFontTable(rtf);
  const defaultCodepage = Number(/\\ansicpg(\d+)/.exec(rtf)?.[1] ?? 1252);
  type State = { skip: boolean; uc: number; font?: number };
  const stack: State[] = [];
  let state: State = { skip: false, uc: 1 };
  let out = "";
  let skipChars = 0; // fallback characters to skip after a \uN character
  let bytes: number[] = []; // \'hh bytes waiting to be decoded together (some code pages use 2)

  const font = () => (state.font === undefined ? undefined : fonts.get(state.font));
  const flushBytes = () => {
    if (bytes.length === 0) return;
    const f = font();
    if (f?.symbol) {
      out += bytes.map(symbolChar).join("");
    } else {
      const decoder = decoderFor(f?.codepage ?? defaultCodepage) ?? decoderFor(1252);
      out += decoder ? decoder.decode(new Uint8Array(bytes)) : String.fromCharCode(...bytes);
    }
    bytes = [];
  };
  /** One visible character; the fallback after \uN is skipped instead. */
  const emit = (s: string) => {
    if (state.skip) return;
    if (skipChars > 0) {
      skipChars--;
      return;
    }
    flushBytes();
    out += font()?.symbol && s.length === 1 ? symbolChar(s.charCodeAt(0)) : s;
  };
  const emitByte = (b: number) => {
    if (state.skip) return;
    if (skipChars > 0) {
      skipChars--;
      return;
    }
    bytes.push(b);
  };

  let i = 0;
  while (i < rtf.length) {
    const c = rtf[i];
    if (c === "{" || c === "}") {
      flushBytes();
      skipChars = 0;
      if (c === "{") {
        stack.push(state);
        state = { ...state };
        // "{\*\something" is an optional destination: skip it.
        if (rtf.startsWith("\\*", i + 1)) state.skip = true;
      } else {
        state = stack.pop() ?? { skip: false, uc: 1 };
      }
      i++;
      continue;
    }
    if (c === "\r" || c === "\n") {
      i++;
      continue;
    }
    if (c !== "\\") {
      emit(c);
      i++;
      continue;
    }
    const next = rtf[i + 1] ?? "";
    if (next === "'") {
      const code = parseInt(rtf.slice(i + 2, i + 4), 16);
      if (!Number.isNaN(code)) emitByte(code);
      i += 4;
      continue;
    }
    if (!/[a-z]/i.test(next)) {
      if (next === "\\" || next === "{" || next === "}") emit(next);
      else if (next === "~") emit(" ");
      else if (next === "_") emit("-");
      else if (next === "\n" || next === "\r") emit("\n");
      i += 2;
      continue;
    }
    const m = /^([a-z]+)(-?\d+)? ?/i.exec(rtf.slice(i + 1, i + 40));
    if (!m) {
      i++;
      continue;
    }
    i += 1 + m[0].length;
    const word = m[1];
    const arg = m[2] === undefined ? undefined : Number(m[2]);
    if (word === "f" && arg !== undefined) {
      flushBytes();
      state.font = arg;
    } else if (SKIP_DESTINATIONS.has(word)) state.skip = true;
    else if (word === "par" || word === "line" || word === "row") emit("\n");
    else if (word === "tab") emit("\t");
    else if (word === "cell") emit(" | ");
    else if (word === "emdash") emit("—");
    else if (word === "endash") emit("–");
    else if (word === "bullet") emit("•");
    else if (word === "lquote" || word === "rquote") emit("'");
    else if (word === "ldblquote" || word === "rdblquote") emit('"');
    else if (word === "uc" && arg !== undefined) state.uc = arg;
    else if (word === "u" && arg !== undefined && !state.skip) {
      flushBytes();
      out += String.fromCodePoint(arg < 0 ? arg + 65536 : arg);
      skipChars = state.uc;
    }
  }
  flushBytes();
  return out
    .replace(/[ \t]*\|[ \t]*\n/g, "\n") // the last cell of a table row
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------- CSV ---------- */

/** Splits CSV text into rows of cells, handling quoted cells with commas and line breaks. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? undefined : text.indexOf("\n"));
  const delimiter = [",", ";", "\t"].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best,
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const CSV_ROWS_PER_PART = 200;

export function extractCsv(name: string, text: string): ExtractedDoc {
  const rows = parseCsv(text);
  const sections: ExtractedSection[] = [];
  for (let start = 0; start < rows.length; start += CSV_ROWS_PER_PART) {
    const slice = rows.slice(start, start + CSV_ROWS_PER_PART);
    sections.push({
      kind: "part",
      index: sections.length + 1,
      label: `rows ${start + 1}–${start + slice.length}`,
      blocks: [
        {
          kind: "table",
          text: slice
            .map((r) => r.map((v) => v.replace(/\s+/g, " ").trim()).join(" | "))
            .join("\n"),
        },
      ],
      images: 0,
      thin: false,
    });
  }
  return finishDoc(name, "csv", sections);
}
