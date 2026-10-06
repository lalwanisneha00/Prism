import { parseSyllabusText, type DraftChapter } from "@/lib/custom/syllabusText";

/*
 * Reads a whole-branch university syllabus (pasted, or extracted from a PDF or document) into
 * semesters → subjects → units → topics, course outcomes and credits, without any AI. Real
 * syllabus PDFs are messy: a course may start a new page, its title can be split over lines or sit
 * at the bottom of its page, outcomes wrap, hours trail on their own line, and every page repeats a
 * header. When the text carries page breaks (a form feed between pages) each page is used to tell
 * where one course ends and the next begins.
 *
 * Whatever comes out is shown to the student to check and correct before anything is applied, and
 * anything that could not be read is marked "unclear", never guessed.
 */

export type UniSubject = {
  name: string;
  code?: string;
  semester?: number;
  /** Credits, only when the syllabus prints them. */
  credits?: number;
  /** The course outcomes (COs) exactly as written, if the syllabus lists them. */
  outcomes: string[];
  units: DraftChapter[];
  /**
   * What could not be read with confidence ("name", "units"): the syllabus is never guessed at, the
   * student is told and can fix it.
   */
  unclear: string[];
};

export type UniSyllabus = {
  subjects: UniSubject[];
  /** Laboratory and practical courses (experiments, not topics): listed, not turned into subjects. */
  labs?: string[];
};

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
const ORDINAL: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
};

/** "Semester III", "SEM-4", "Third Semester", "1 st Semester +", "2nd Sem": the number, or null. */
export function semesterOf(line: string): number | null {
  const t = line
    .replace(/[+*•|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > 60) return null;
  const a = /^(?:semester|sem)\s*[-–:.]?\s*([ivx]+|\d)\b/i.exec(t);
  if (a) {
    const v = a[1].toLowerCase();
    const n = /^\d$/.test(v) ? Number(v) : ROMAN[v];
    return n && n >= 1 && n <= 8 ? n : null;
  }
  const b = /^(first|second|third|fourth|fifth|sixth|seventh|eighth)\s+(?:semester|sem)\b/i.exec(t);
  if (b) return ORDINAL[b[1].toLowerCase()];
  // "1 st Semester", "2nd semester", "Semester 3 (Theory)".
  const c = /^(\d)\s*(?:st|nd|rd|th)\s+(?:semester|sem)\b/i.exec(t);
  return c && Number(c[1]) >= 1 && Number(c[1]) <= 8 ? Number(c[1]) : null;
}

// A course code: "BT101", "ASH101", "24MA101T", "20CH101P".
const CODE = "(?:\\d{2})?[A-Z]{2,6}[- ]?\\d{2,4}[A-Z]?";
const CODE_AT_START = new RegExp(`^(${CODE})\\b\\s*(.*)$`);
const PLACEHOLDER_CODE = /^<\s*course code\s*>\s*(.*)$/i;
const TITLE_LINE = /^(?:course|subject|paper)\s*(?:title|name)?\s*[:\-–]\s*(.{4,90})$/i;
const CODE_FIELD = new RegExp(`^(?:course|subject|paper)\\s*code\\s*[:\\-–]\\s*(${CODE})`, "i");
const UNIT_LINE = /^\s*(?:unit|module|chapter|part|section|block)\s*[-–—.:]?\s*([ivxlc]+|\d+)\b/i;
const END_OF_UNITS =
  /^(?:total(?:\s+hours?)?\b|hours?\s*:|course outcomes?\b|text\s*\/?\s*reference|text[- ]?books?|reference books?|references?\b|suggested reading|further reading|list of experiments)/i;
const SCHEME_STOP =
  /^(?:teaching scheme|examination scheme|l\s+t\s+p\b|course objectives?|objectives?\b|unit\b)/i;
const NOISE_TITLE =
  /^(?:total|teaching scheme|examination scheme|credits?|contact hours|internal|external|marks|course outcomes?|text ?books?|reference books?|references?|prerequisites?|pre-requisites?|objectives?)\b/i;
const CO_START =
  /^(?:course outcomes?|learning outcomes?|cos?\s*[:-]?$|on (?:the )?(?:successful )?completion of (?:this|the) course)/i;
const CO_ITEM = /^(?:C\.?O\.?[-\s]?\d+|\d{1,2}[.)]|[-•*▪])\s*[:.)\-–]?\s*(.{6,500})$/i;
const HOURS_ONLY = /^(?:\d{1,3}\s*(?:hrs?\.?|hours?)?\.?|hrs?\.?)$/i;
const NUMERIC_ROW = /^(?:\d+(?:\.\d)?|--|-)(?:\s+(?:\d+(?:\.\d)?|--|-)){4,}$/;
const TABLE_LINE =
  /^(?:teaching scheme|examination scheme|theory\b|practical\b|practica$|total marks?|marks\b|hrs\.?\s*\/?\s*week|l\s+t\s+p\s+c\b|ms\s+es|i$|a\s+lw|l$)/i;

/** The course outcomes in a subject's lines (wrapped lines joined) and the lines that remain. */
export function extractOutcomes(lines: readonly string[]): { outcomes: string[]; rest: string[] } {
  const outcomes: string[] = [];
  const rest: string[] = [];
  let inCo = false;
  for (const line of lines) {
    const t = line.trim();
    if (CO_START.test(t) && !CO_ITEM.test(t) && !UNIT_LINE.test(t)) {
      inCo = true;
      continue;
    }
    if (inCo) {
      if (!t) continue;
      if (END_OF_UNITS.test(t) && !/^course outcomes?\b/i.test(t)) {
        inCo = false;
        rest.push(line);
        continue;
      }
      // "CO2 -" with the text on the next line starts an outcome that the wrapped lines complete.
      const prefixed = /^C\.?O\.?[-\s]?\d+\s*[:.)\-–]?\s*(.*)$/i.exec(t);
      if (prefixed) {
        outcomes.push(prefixed[1].trim());
        continue;
      }
      const item = CO_ITEM.exec(t);
      if (item && !UNIT_LINE.test(t)) {
        outcomes.push(item[1].trim());
        continue;
      }
      // A wrapped line carries on the outcome above it.
      if (outcomes.length > 0) {
        outcomes[outcomes.length - 1] = `${outcomes[outcomes.length - 1]} ${t}`.trim();
        continue;
      }
      inCo = false;
    } else {
      const inline = /^C\.?O\.?[-\s]?\d+\s*[:.)\-–]\s*(.{6,500})$/i.exec(t);
      if (inline) {
        outcomes.push(inline[1].trim());
        inCo = true;
        continue;
      }
    }
    rest.push(line);
  }
  return { outcomes: outcomes.slice(0, 12).map((o) => o.replace(/\s+/g, " ")), rest };
}

const CREDITS = [
  /(\d+(?:\.\d)?)\s*credits?\b/i,
  /credits?\s*[:=\-–]?\s*(\d+(?:\.\d)?)/i,
  /\bL\s*-?\s*T\s*-?\s*P\s*-?\s*C\s*[:=]?\s*\d\s*[-– ]\s*\d\s*[-– ]\s*\d\s*[-– ]\s*(\d(?:\.\d)?)/i,
];

/** Credits printed in a subject's heading or its first lines, if any. */
export function creditsOf(text: string): number | undefined {
  for (const re of CREDITS) {
    const m = re.exec(text);
    const n = m ? Number(m[1]) : NaN;
    if (n >= 0.5 && n <= 30) return n;
  }
  return undefined;
}

/** The "L T P C ..." teaching-scheme row: "3 1 0 4 4 25 50 …" → credits 4. */
function creditsFromRow(lines: readonly string[]): number | undefined {
  for (const l of lines) {
    const m = /^(\d)\s+(\d)\s+(\d)\s+(\d(?:\.5)?)\s+\d+\s+(?:\d+|--|-)(?:\s|$)/.exec(l);
    if (m && Number(m[4]) > 0) return Number(m[4]);
  }
  return undefined;
}

/** Text a reader could not make sense of (broken characters, symbols instead of words). */
function garbled(text: string): boolean {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  return /[�]/.test(text) || (text.length > 3 && letters / text.length < 0.5);
}

/** "ENVIRONMENTAL SCIENCE" → "Environmental Science"; mixed case is left alone. */
function titleCase(name: string): string {
  if (name !== name.toUpperCase() || !/[A-Z]{3}/.test(name)) return name;
  return name
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\b(Of|And|For|To|In|The|On)\b/g, (w) => w.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());
}

/** "Engineering Biology (3-0-0, 3 credits)" or "Applied Physics (For CS, ECE)" → the plain title. */
function cleanName(raw: string): string {
  return titleCase(
    raw
      .replace(/\(\s*for\b[^)]*\)?/gi, "")
      .replace(/\(\s*[\dLTP\s,\-–:.credits]*\)/gi, "")
      .replace(/\b\d\s*-\s*\d\s*-\s*\d\b/g, "")
      .replace(/\b\d+\s*credits?\b/gi, "")
      .replace(/\s+/g, " ")
      .replace(/[\s:;,\-–—.]+$/g, "")
      .trim(),
  );
}

function looksLikeTitle(text: string): boolean {
  const t = text.trim();
  return (
    t.length >= 4 &&
    t.length <= 120 &&
    !UNIT_LINE.test(t) &&
    !NOISE_TITLE.test(t) &&
    !TABLE_LINE.test(t) &&
    (t.match(/[,;]/g) ?? []).length <= 3
  );
}

type Heading = { at: number; span: number; name: string; code?: string };

/** Course headings in a run of lines: a code with its title, or "Course Title: …". */
function findHeadings(lines: readonly string[]): Heading[] {
  const found: Heading[] = [];
  let pendingCode: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const codeField = CODE_FIELD.exec(line);
    if (codeField) {
      pendingCode = codeField[1].replace(/\s+/g, " ");
      continue;
    }
    const title = TITLE_LINE.exec(line);
    if (title && looksLikeTitle(title[1])) {
      found.push({ at: i, span: 1, name: cleanName(title[1]), code: pendingCode });
      pendingCode = undefined;
      continue;
    }
    const placeholder = PLACEHOLDER_CODE.exec(line);
    const code = placeholder ? null : CODE_AT_START.exec(line);
    if (!placeholder && !code) continue;
    if (code && /^(?:CO|UNIT|MS|ES|IA|LW|LE)\b/i.test(code[1])) continue;
    let rest = (placeholder ? placeholder[1] : code![2]).trim();
    let span = 1;
    // The title may run over the next lines, up to the teaching-scheme table.
    for (let k = i + 1; k < Math.min(lines.length, i + 4); k++) {
      const next = lines[k];
      if (!next) break;
      if (SCHEME_STOP.test(next) || TABLE_LINE.test(next) || CODE_AT_START.test(next)) break;
      if (rest && /[).]$/.test(rest) && !/\($/.test(rest)) break;
      rest = `${rest} ${next}`.trim();
      span++;
    }
    const name = cleanName(rest);
    if (name.length >= 4 && looksLikeTitle(name)) {
      found.push({ at: i, span, name, code: code ? code[1].replace(/\s+/g, " ") : undefined });
    }
  }
  return found;
}

type Block = { name: string; code?: string; semester?: number; lines: string[] };

function cleanLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim());
}

/** Lines that repeat on many pages (running headers and footers) are not syllabus content. */
function repeatedLines(pages: string[][]): Set<string> {
  if (pages.length < 3) return new Set();
  const counts = new Map<string, number>();
  for (const page of pages) {
    for (const l of new Set(page))
      if (l.length > 0 && l.length < 90) counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.4));
  // Only lines that look like a page header (a university or school name), never a section title
  // such as "COURSE OUTCOMES" that every course repeats.
  const header = /(university|institute|college|school of|department|faculty|autonomous)/i;
  return new Set([...counts].filter(([l, n]) => n >= threshold && header.test(l)).map(([l]) => l));
}

/** Splits the text into one block per course, using page breaks when there are any. */
function toBlocks(text: string): Block[] {
  const rawPages = text.includes("\f") ? text.split("\f") : [text];
  const pages = rawPages.map(cleanLines);
  const repeated = repeatedLines(pages);
  const blocks: Block[] = [];
  let semester: number | undefined;

  for (const page of pages) {
    const lines: string[] = [];
    // Semester markers set the semester for what follows; they are not content.
    for (const l of page) {
      if (repeated.has(l)) continue;
      const sem = semesterOf(l);
      if (sem) {
        semester = sem;
        // Keep a marker's position in single-run text: a heading below it belongs to this semester.
        lines.push(`\u0001${sem}`);
        continue;
      }
      lines.push(l);
    }
    if (lines.every((l) => !l || l.startsWith("\u0001"))) {
      const marked = lines.find((l) => l.startsWith("\u0001"));
      if (marked) semester = Number(marked.slice(1));
      continue;
    }
    const headings = findHeadings(lines);
    if (rawPages.length > 1 && headings.length <= 1) {
      // One course per page (or a continuation page): the whole page belongs together.
      const consumed = new Set<number>();
      const pageSemester = semester;
      for (const l of lines) if (l.startsWith("\u0001")) semester = Number(l.slice(1));
      if (headings.length === 1) {
        const h = headings[0];
        for (let k = 0; k < h.span; k++) consumed.add(h.at + k);
        blocks.push({
          name: h.name,
          code: h.code,
          semester: semester ?? pageSemester,
          lines: lines.filter((l, k) => !consumed.has(k) && !l.startsWith("\u0001")),
        });
      } else if (blocks.length > 0) {
        blocks[blocks.length - 1].lines.push(...lines.filter((l) => !l.startsWith("\u0001")));
      }
      continue;
    }
    // Several courses in one run of text (or pasted text): each heading starts a course.
    let current = semester;
    const marks = new Map<number, number>();
    lines.forEach((l, k) => {
      if (l.startsWith("\u0001")) marks.set(k, Number(l.slice(1)));
    });
    headings.forEach((h, idx) => {
      const end = headings[idx + 1]?.at ?? lines.length;
      for (const [k, sem] of marks) if (k < h.at) current = sem;
      const stop = [...marks.keys()].find((k) => k > h.at && k < end) ?? end;
      blocks.push({
        name: h.name,
        code: h.code,
        semester: current,
        lines: lines.slice(h.at + h.span, stop).filter((l) => !l.startsWith("\u0001")),
      });
    });
    for (const [, sem] of marks) semester = sem;
  }
  return blocks;
}

/** Turns one course's lines into a subject, or reports it as a laboratory course. */
function toSubject(block: Block): { subject?: UniSubject; lab?: string } {
  const lines = block.lines;
  const isLab =
    /\b(laborator(?:y|ies)|practical|lab)\b/i.test(block.name) ||
    lines.some((l) => /^list of experiments\b/i.test(l));
  if (isLab) return { lab: block.name };

  const credits =
    creditsFromRow(lines) ?? creditsOf(`${block.name} ${lines.slice(0, 6).join(" ")}`);
  // Course outcomes first, so they never turn into topics.
  const { outcomes, rest } = extractOutcomes(lines);

  // Units: from the first unit heading to the end of the units (hours, outcomes, books).
  const first = rest.findIndex((l) => UNIT_LINE.test(l));
  const unitLines: string[] = [];
  if (first >= 0) {
    for (const l of rest.slice(first)) {
      if (END_OF_UNITS.test(l)) break;
      if (!l || HOURS_ONLY.test(l) || NUMERIC_ROW.test(l)) continue;
      unitLines.push(l);
    }
  } else {
    // No unit headings: a plain list of topics, if the text between objectives and the books has one.
    const objectives = rest.findIndex((l) => /^course objectives?/i.test(l));
    const from = objectives >= 0 ? objectives + 1 : 0;
    const stop = rest.findIndex((l, i) => i >= from && END_OF_UNITS.test(l));
    const body = rest
      .slice(from, stop >= 0 ? stop : rest.length)
      .filter((l) => l && !TABLE_LINE.test(l) && !NUMERIC_ROW.test(l) && !HOURS_ONLY.test(l));
    if (objectives < 0 && body.length > 0 && body.length < 40) unitLines.push(...body);
  }
  const nice = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const units = parseSyllabusText(unitLines.join("\n"))
    .filter((u) => u.topics.length > 0 || /\w/.test(u.name))
    .map((u) => ({
      ...u,
      name: nice(titleCase(u.name)),
      topics: u.topics.map(nice),
    }));
  const unclear: string[] = [];
  if (units.length === 0) unclear.push("units");
  if (garbled(block.name)) unclear.push("name");
  return {
    subject: {
      name: block.name,
      code: block.code,
      semester: block.semester,
      ...(credits ? { credits } : {}),
      outcomes,
      unclear,
      units,
    },
  };
}

export function parseUniversitySyllabus(text: string): UniSyllabus {
  const blocks = toBlocks(text);
  const subjects: UniSubject[] = [];
  const labs: string[] = [];
  for (const block of blocks) {
    const { subject, lab } = toSubject(block);
    if (subject) subjects.push(subject);
    if (lab) labs.push(lab);
  }
  // No subject headings at all but unit lines exist: one subject the student can rename.
  if (subjects.length === 0 && labs.length === 0) {
    const lines = cleanLines(text);
    if (lines.some((l) => UNIT_LINE.test(l))) {
      subjects.push({
        name: "My subject",
        outcomes: [],
        unclear: [],
        units: parseSyllabusText(text),
      });
    }
  }
  // A subject whose units could not be read is kept (flagged "units"), not guessed or dropped.
  return { subjects, ...(labs.length > 0 ? { labs } : {}) };
}
