/*
 * Handout text helpers shared by the browser (a student's upload, Phase 3) and the tests. Ported
 * from `scripts/lib/handout-text.mjs` (the Phase 2 scripts, Node only), which stays as it was so
 * the applied migrations can be re-run exactly. Pure: no PDF library here, only text pieces.
 */

/** One piece of text on a PDF page, at its position (PDF points, y grows upwards). */
export type TextItem = { x: number; y: number; str: string };

const key = (i: TextItem) => `${i.str}|${Math.round(i.x)}|${Math.round(i.y)}`;

/**
 * Ghost text: some PDFs stamp a hidden copy of one block (e.g. another course's heading) on every
 * page, twice. A piece of text is a ghost when the same text sits at the same x on two or more
 * heights of one page, and that exact spot repeats on most pages. Real headings appear once per page.
 */
function ghostKeys(pages: readonly (readonly TextItem[])[]): Set<string> {
  const ghosts = new Set<string>();
  if (pages.length < 5) return ghosts;
  const pagesWith = new Map<string, Set<number>>();
  pages.forEach((items, p) => {
    const heights = new Map<string, Set<number>>();
    const words = items.filter((i) => i.str.trim() !== "");
    for (const i of words) {
      const k = `${i.str}|${Math.round(i.x)}`;
      heights.set(k, (heights.get(k) ?? new Set()).add(Math.round(i.y)));
    }
    for (const i of words) {
      if ((heights.get(`${i.str}|${Math.round(i.x)}`)?.size ?? 0) < 2) continue;
      pagesWith.set(key(i), (pagesWith.get(key(i)) ?? new Set()).add(p));
    }
  });
  for (const [k, set] of pagesWith) if (set.size >= 0.6 * pages.length) ghosts.add(k);
  return ghosts;
}

/** Group text pieces whose baselines are within 3pt into one line, top to bottom, left to right. */
function groupLines(items: readonly TextItem[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: { y: number; items: TextItem[] }[] = [];
  for (const it of sorted) {
    const row = rows.at(-1);
    if (row && Math.abs(row.y - it.y) <= 3) row.items.push(it);
    else rows.push({ y: it.y, items: [it] });
  }
  return rows
    .map((r) =>
      r.items
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

/** Every page's text pieces → its lines in reading order, ghost text removed. */
export function pagesToLines(pages: readonly (readonly TextItem[])[]): string[][] {
  const ghosts = ghostKeys(pages);
  return pages.map((items) => groupLines(items.filter((i) => !ghosts.has(key(i)))));
}

/*
 * PDEU course codes: 24ICxxxT, 16ME101T, 24CP205P, 24ECE***T, 24PRCH451T, 24YOG101, 24BT301TP,
 * and the first-year UG_1_T(CSE/ICT/EC/EE). The suffix may be glued to the next word
 * ("24CV101TSCIENCE"), so a T/P/L is taken even when a capital letter follows.
 */
const CODE_SRC = String.raw`\b(?:\d{2}[A-Z]{2,5}[0-9xX*]{3}(?:TP(?![A-Za-z])|[TPL](?![a-z])|(?![A-Za-z]))|UG_\d+_[TPL](?:\([A-Z/]+\)+)?)`;
export const CODE_RE = new RegExp(CODE_SRC);

/** Running page headers that are not part of a course title. */
const HEADER_RE =
  /Pandit Deendayal (?:Energy|Petroleum) University,?|School of (?:Energy )?Technology|B\.?\s*Tech\.?\s*\/\s*(?:SOT)?|\bSOT\b|Civil and Mechanical Engineering(?=\s+\S)|B\.\s*Tech\.?\s+[A-Z][a-z]+ Engineering,?|Semester\s*[–-]\s*[IVX]+\b/g;

const TEACHING_RE = /teaching\s*(?:&\s*examination\s*)?scheme/i;

/** Pull a code and a title out of a heading text. */
export function splitHeading(raw: string): { code: string | null; title: string } {
  let text = raw.replace(HEADER_RE, " ");
  let code: string | null = null;
  const m = text.match(CODE_RE);
  if (m) {
    code = m[0].toUpperCase().replace(/\)\)+$/, ")");
    text = text.replace(m[0], " ");
  }
  // "<Course Code>" placeholders, and titles wrapped in <...> like "<Mathematics – I>".
  text = text
    .replace(/<\s*Course\s*Code\s*>|Course\s*Code\s*:?|Examination Scheme/gi, " ")
    .replace(/[<>]/g, " ")
    // Placeholder codes like "XXXX", "******", and old codes like "TP310".
    .replace(/(^|\s)(?:[X*]{3,}|TP\d{3})(?=\s)/g, " ");
  const title = text
    .replace(/\s+/g, " ")
    .replace(/^[\s:–-]+|[\s:–-]+$/g, "")
    .trim();
  return { code, title };
}

const CODE_OR_PLACEHOLDER_RE = new RegExp(
  String.raw`${CODE_SRC}|<\s*Course\s*Code\s*>|Course\s*Code\s*:|(?:^|\s)[X*]{4,}\s`,
  "i",
);
const STRUCTURE_RE = /course structure|annexure|course outline|course matrix/i;
const NOISE_RE = /^page\s*\d+|^\d+$|^academic year|^semester\s*[–-]?\s*[ivx]+$/i;

export function isPageHeader(text: string): boolean {
  return NOISE_RE.test(text) || text.replace(HEADER_RE, "").trim() === "";
}

export type CourseStart = {
  code: string | null;
  title: string;
  titleOnPrevPage: boolean;
  /** Index of the first heading line (0 = top of page). */
  line: number;
  midPage: boolean;
};

/**
 * Every place on this page where a course handout starts. A course starts at a "Teaching Scheme"
 * table; its code and name sit on the line(s) just above, or, when the page opens with the scheme
 * table, on the previous page's last line.
 */
export function detectCourseStarts(
  lines: readonly string[],
  prevLines: readonly string[] = [],
): CourseStart[] {
  const starts: CourseStart[] = [];
  lines.forEach((l, at) => {
    if (!TEACHING_RE.test(l)) return;
    // Course structure / outline tables also say "Teaching Scheme": skip them.
    if (lines.slice(Math.max(0, at - 6), at + 1).some((x) => STRUCTURE_RE.test(x))) return;
    const near = at < 10;
    const from = near ? 0 : Math.max(0, at - 3);
    const head = lines
      .slice(from, at)
      .map((x, k) => ({ text: x, line: from + k }))
      .filter((x) => !isPageHeader(x.text));
    // Start from the line with the course code if there is one; otherwise the last line or two
    // (a title may wrap).
    let codeAt = head.findIndex((x) => CODE_OR_PLACEHOLDER_RE.test(x.text));
    // A code on a line of its own: the title (or its first half) is just above.
    if (codeAt > 0 && !splitHeading(head[codeAt].text).title) codeAt -= 1;
    const picked = codeAt >= 0 ? head.slice(codeAt) : head.slice(near ? -2 : -1);
    let heading = splitHeading(picked.map((x) => x.text).join(" "));
    let titleOnPrevPage = false;
    if (!heading.title && !heading.code && near) {
      const prev = splitHeading(prevLines.at(-1) ?? "");
      if (prev.code) {
        heading = prev;
        titleOnPrevPage = true;
      }
    }
    if (!near && !heading.code && codeAt < 0) return; // mid-page needs a code line
    const line = picked[0]?.line ?? at;
    // Mid-page = the previous course's text is still above this heading.
    const midPage = lines.slice(0, line).some((x) => !isPageHeader(x));
    starts.push({ ...heading, titleOnPrevPage, line, midPage });
  });
  return starts;
}

/**
 * Lecture-Tutorial-Practical hours from the teaching scheme table: the first row of numbers after
 * "Teaching Scheme" (e.g. "3 0 2 4 5 25 50 ..." or "0 0 6 3 - - -"). Null when it can't be read.
 */
export function parseLtp(
  lines: readonly string[],
): { L: number; T: number; P: number; C: number } | null {
  const at = lines.findIndex((l) => TEACHING_RE.test(l));
  if (at < 0) return null;
  // A "-" in the table means 0 hours.
  const n = (s: string) => (s === "-" ? 0 : Number(s));
  for (const l of lines.slice(at + 1, at + 10)) {
    const m = l.match(/^(\d{1,2}|-)\s+(\d{1,2}|-)\s+(\d{1,2}|-)\s+(\d{1,2}(?:\.\d)?)(?:\s|$)/);
    if (m) return { L: n(m[1]), T: n(m[2]), P: n(m[3]), C: Number(m[4]) };
  }
  return null;
}

/** One course's part of a document: its heading and its lines (page headers dropped). */
export type CourseSlice = { code: string | null; title: string; lines: string[] };

/**
 * Cut a document (one or many course handouts stacked together) into one slice per course. A
 * document with no "Teaching Scheme" heading is one slice with no heading.
 */
export function sliceCourses(pages: readonly (readonly string[])[]): CourseSlice[] {
  const marks: { page: number; line: number; code: string | null; title: string }[] = [];
  pages.forEach((lines, p) => {
    for (const s of detectCourseStarts(lines, pages[p - 1] ?? [])) {
      // A title printed on the previous page's last line starts the course there.
      const at =
        s.titleOnPrevPage && p > 0
          ? { page: p - 1, line: Math.max(0, pages[p - 1].length - 1) }
          : { page: p, line: s.line };
      marks.push({ ...at, code: s.code, title: s.title });
    }
  });
  const clean = (lines: readonly string[]) => lines.filter((l) => !isPageHeader(l));
  if (marks.length === 0) return [{ code: null, title: "", lines: clean(pages.flat()) }];
  return marks.map((m, k) => {
    const next = marks[k + 1];
    const lines: string[] = [];
    for (let p = m.page; p < pages.length; p++) {
      if (next && p > next.page) break;
      const from = p === m.page ? m.line : 0;
      const to = next && p === next.page ? next.line : pages[p].length;
      lines.push(...pages[p].slice(from, to));
    }
    return { code: m.code, title: m.title, lines: clean(lines) };
  });
}
