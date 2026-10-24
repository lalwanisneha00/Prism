/*
 * The course table at the front of a PDEU handout ("Course Outline", "Course Matrix",
 * "Course structure"): every course of one or more semesters, with hours. Used to find courses
 * that the handout lists but has no handout page for (e.g. ICT sem 3 "Introduction to Artificial
 * Intelligence"). Tables are laid out differently per branch and names wrap across lines, so
 * this is best-effort: rows it cannot place in a semester get `sem: null` and go to review.
 */

export type OutlineRow = {
  sem: number | null;
  name: string;
  code: string | null;
  /** First three numbers of the row: lecture, tutorial, practical hours. */
  ltp: { L: number; T: number; P: number } | null;
};

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

function semToken(t: string): number | null {
  const lower = t.toLowerCase();
  if (/^[1-8]$/.test(lower)) return Number(lower);
  return ROMAN[lower] ?? null;
}

const CODE = /\b(?:\d{2}[A-Z]{2,5}[0-9xX*]{3}(?:TP|[TPL])?|OE-\d|UG_\d+_[TPL])\b/;
const CATEGORY =
  /^(?:\d{1,2}\s+)?(?:HSC|HSMC|BSC|ESC|PCC?|PEC?|OEC?|PRO|Pro|MC|AEC|VAC|SEC|MDM|PROJ?)\b\s*/;
/** 4+ numbers (or "-") at the end of a line: L T P Hrs Cr, maybe exam marks after. */
// Whole numbers only, each on its own, so "Industry 4.0 2 0 0 2 2" keeps "4.0" in the name.
const NUMBERS_TAIL = /((?:\s+(?:\d{1,3}|--?|Audit)){4,})\s*$/;
const TOTAL_ROW = /^(?:total\s*)?(?:\d{1,3}\s+){3,}\d{1,3}$/i;
const HEADER_WORDS =
  /course\s*(?:code|name)|teaching\s*scheme|exam(?:ination)?\s*scheme|theory\s+tutorial|\bth\s+tut\b|\bL\s+T\s+P\b|MS\s+(?:ES|IA)|^sr\.?|categor/i;
const CONNECTOR_END = /(?:\band|\bof|\bto|\bfor|\bin|&|[-–(,/])\s*$/i;

const MARKER = /\bsem(?:ester)?\s*[-–:]?\s*(viii|vii|vi|iv|v|iii|ii|i|[1-8])(?![a-z])/i;

/** A semester marker in this line ("Sem III", "Semester – IV", "SEM-VII", "Semester 3Physiology"). */
function markerIn(line: string): number | null {
  const m = line.match(MARKER);
  return m ? semToken(m[1]) : null;
}

function cleanName(text: string): { name: string; code: string | null } {
  let t = text.replace(CATEGORY, "");
  const code = t.match(CODE)?.[0] ?? null;
  if (code) t = t.replace(code, " ");
  t = t
    .replace(/^\s*(?:\d{1,2}\s+)?/, "")
    .replace(CATEGORY, "")
    .replace(/\bSemester\s*\d?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { name: t, code };
}

type Draft = { name: string; code: string | null; ltp: OutlineRow["ltp"]; segment: number };

/** Rows of the course table(s) in these front-matter lines. */
export function parseOutline(lines: readonly string[]): OutlineRow[] {
  const drafts: Draft[] = [];
  const segmentSem = new Map<number, number>();
  let segment = 0;
  let pending: string[] = [];
  let prevHadSem = false;
  let last: Draft | null = null;

  const mark = (sem: number | null) => {
    if (sem !== null && !segmentSem.has(segment)) segmentSem.set(segment, sem);
  };

  const semesterSeen = (sem: number | null) => {
    if (sem === null) return;
    // A new semester heading after rows of another semester starts a new segment.
    if (segmentSem.has(segment) && segmentSem.get(segment) !== sem && last) {
      segment++;
      pending = [];
      last = null;
    }
    mark(sem);
  };

  for (const raw of lines) {
    let line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    // Only numbers: a semester total, unless the row's name sits on the lines above it.
    if (TOTAL_ROW.test(line) && pending.length === 0) {
      segment++;
      pending = [];
      last = null;
      continue;
    }
    // Table cells glue together: "SemPC Digital Circuits Laboratory", then "IIIPC Data …".
    let semWord = false;
    if (/^Sem(?:ester)?(?=[A-Z]|$)/.test(line) && markerIn(line) === null) {
      semWord = true;
      line = line.replace(/^Sem(?:ester)?/, "").trim();
    }
    // "Semester" on one line and "3" / "III" (maybe glued: "3Building…") on the next.
    if (prevHadSem) {
      const lone = line.match(/^(VIII|VII|VI|IV|V|III|II|I|[1-8])(?=$|\s|[A-Z])/);
      if (lone) {
        semesterSeen(semToken(lone[1]));
        line = line.slice(lone[1].length).trim();
      }
    }
    const marker = markerIn(line);
    if (marker !== null) {
      semesterSeen(marker);
      line = line.replace(MARKER, " ").trim();
    }
    prevHadSem = semWord || /\bsem(?:ester)?\s*$/i.test(line);
    line = line.replace(/\bsem(?:ester)?\s*$/i, "").trim();
    if (!line) continue;
    if (HEADER_WORDS.test(line) && !NUMBERS_TAIL.test(line)) continue;

    const nums = line.match(NUMBERS_TAIL);
    if (nums) {
      const values = nums[1]
        .trim()
        .split(/\s+/)
        .map((v) => (/^\d/.test(v) ? Number(v) : 0));
      const cleaned = cleanName(line.slice(0, nums.index));
      const { code } = cleaned;
      let { name } = cleaned;
      // "Mathematics – 1 3 1 0 4 4": the first number belongs to the name.
      if (/[–-]$/.test(name) && values.length >= 6) name = `${name} ${values.shift()}`;
      if (name.length < 3 && pending.length) {
        name = cleanName(pending.join(" ")).name;
      } else if (pending.length && name.length >= 3 && CONNECTOR_END.test(pending.join(" "))) {
        name = `${cleanName(pending.join(" ")).name} ${name}`;
      }
      pending = [];
      last = { name, code, ltp: { L: values[0], T: values[1], P: values[2] }, segment };
      drafts.push(last);
      continue;
    }
    const text = cleanName(line).name;
    if (!text) continue;
    // Continuation of the row above ("Introduction to Artificial" / "Intelligence").
    if (last && (CONNECTOR_END.test(last.name) || /^[a-z(]/.test(text) || last.name.length < 3)) {
      last.name = `${last.name} ${text}`.trim();
      continue;
    }
    pending.push(text);
  }

  // Segments without a marker follow on from their neighbours (forwards, then backwards).
  const sems: (number | null)[] = [];
  for (let s = 0; s <= segment; s++) {
    const prev = sems[s - 1];
    sems.push(segmentSem.get(s) ?? (prev ? prev + 1 : null));
  }
  for (let s = segment - 1; s >= 0; s--) {
    const next = sems[s + 1];
    if (sems[s] === null && next && next > 1) sems[s] = next - 1;
  }
  return drafts
    .filter((d) => d.name.length >= 3 && /[a-z]/i.test(d.name))
    .map((d) => ({ sem: sems[d.segment] ?? null, name: d.name, code: d.code, ltp: d.ltp }));
}
