import { parseSyllabusText, type DraftChapter } from "@/lib/custom/syllabusText";

/*
 * Reads a whole-branch university syllabus (pasted or extracted from a PDF or document) into
 * semesters → subjects → units → topics, without any AI. University syllabi mostly look like:
 *
 *   Semester III
 *   BT101  Engineering Biology  (3-0-0, 3 credits)
 *   Unit 1: Introduction to life – cells, biomolecules; ...
 *
 * Whatever comes out is shown to the student to check and edit before anything is applied.
 */

export type UniSubject = {
  name: string;
  code?: string;
  semester?: number;
  units: DraftChapter[];
};

export type UniSyllabus = { subjects: UniSubject[] };

const ROMAN: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
};
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

/** "Semester III", "SEM-3", "Third Semester", "Semester - 2": the semester number, or null. */
export function semesterOf(line: string): number | null {
  const t = line.trim();
  if (t.length > 60) return null;
  const a = /^(?:semester|sem)\s*[-–:.]?\s*([ivx]+|\d)\b/i.exec(t);
  if (a) {
    const v = a[1].toLowerCase();
    const n = /^\d$/.test(v) ? Number(v) : ROMAN[v];
    return n && n >= 1 && n <= 8 ? n : null;
  }
  const b = /^(first|second|third|fourth|fifth|sixth|seventh|eighth)\s+(?:semester|sem)\b/i.exec(t);
  return b ? ORDINAL[b[1].toLowerCase()] : null;
}

const CODE = "[A-Z]{2,6}[- ]?\\d{2,4}[A-Z]?";
const CODE_LINE = new RegExp(`^(${CODE})\\s*[:\\-–.)]?\\s+(.{4,90})$`);
const TITLE_LINE = /^(?:course|subject|paper)\s*(?:title|name)?\s*[:\-–]\s*(.{4,90})$/i;
const CODE_FIELD = new RegExp(`^(?:course|subject|paper)\\s*code\\s*[:\\-–]\\s*(${CODE})`, "i");
const UNIT_LINE = /^\s*(?:unit|module|chapter|part|section|block)\s*[-–—.:]?\s*([ivxlc]+|\d+)\b/i;
const BOOKS = /^(?:text ?books?|reference books?|references?|suggested reading|further reading)\b/i;
const NOISE =
  /^(?:total|teaching scheme|examination scheme|credits?|l\s*t\s*p|contact hours|internal|external|marks|course outcomes?|text ?books?|reference books?|references?|prerequisites?|pre-requisites?|objectives?)\b/i;

/** "Engineering Biology (3-0-0, 3 credits)" → "Engineering Biology". */
function cleanName(raw: string): string {
  return raw
    .replace(/\(\s*[\dLTP\s,\-–:.credits]*\)/gi, "")
    .replace(/\b\d\s*-\s*\d\s*-\s*\d\b/g, "")
    .replace(/\b\d+\s*credits?\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/[\s:;,\-–—.]+$/g, "")
    .trim();
}

type Heading = { line: number; name: string; code?: string };

function looksLikeTitle(text: string): boolean {
  const t = text.trim();
  return (
    t.length >= 4 &&
    t.length <= 90 &&
    !UNIT_LINE.test(t) &&
    !NOISE.test(t) &&
    (t.match(/[,;]/g) ?? []).length <= 1
  );
}

export function parseUniversitySyllabus(text: string): UniSyllabus {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim());
  const headings: Heading[] = [];
  const semesterAt = new Map<number, number>();
  let pendingCode: string | undefined;

  lines.forEach((line, i) => {
    if (!line) return;
    const sem = semesterOf(line);
    if (sem) {
      semesterAt.set(i, sem);
      return;
    }
    const codeField = CODE_FIELD.exec(line);
    if (codeField) {
      pendingCode = codeField[1].replace(/\s+/g, " ");
      return;
    }
    const title = TITLE_LINE.exec(line);
    if (title && looksLikeTitle(title[1])) {
      headings.push({ line: i, name: cleanName(title[1]), code: pendingCode });
      pendingCode = undefined;
      return;
    }
    const code = CODE_LINE.exec(line);
    if (code && looksLikeTitle(code[2]) && !/^unit\b/i.test(code[2])) {
      const name = cleanName(code[2]);
      if (name.length >= 4) headings.push({ line: i, name, code: code[1].replace(/\s+/g, " ") });
    }
  });

  const subjects: UniSubject[] = [];
  headings.forEach((h, idx) => {
    const end = headings[idx + 1]?.line ?? lines.length;
    // A semester heading inside the block ends the subject.
    const stop = [...semesterAt.keys()].find((k) => k > h.line && k < end) ?? end;
    // Book lists after the units are not topics.
    const tail = lines.findIndex((l, k) => k > h.line && k < stop && BOOKS.test(l));
    const block = lines.slice(h.line + 1, tail >= 0 ? tail : stop).join("\n");
    let units = parseSyllabusText(block).filter((u) => u.topics.length > 0 || /\w/.test(u.name));
    // A block with no unit headings is one list of topics.
    if (units.length === 0) units = [];
    const semester = [...semesterAt.entries()]
      .filter(([k]) => k < h.line)
      .sort((a, b) => b[0] - a[0])[0]?.[1];
    const nice = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
    subjects.push({
      name: h.name,
      code: h.code,
      semester,
      units: units.map((u) => ({ ...u, name: nice(u.name), topics: u.topics.map(nice) })),
    });
  });

  // No subject headings at all but unit lines exist: one subject the student can rename.
  if (subjects.length === 0 && lines.some((l) => UNIT_LINE.test(l))) {
    subjects.push({ name: "My subject", units: parseSyllabusText(text) });
  }
  return { subjects: subjects.filter((s) => s.units.length > 0) };
}
