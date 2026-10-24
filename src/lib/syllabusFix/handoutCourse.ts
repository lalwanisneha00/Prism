import { parseSyllabusText } from "@/lib/custom/syllabusText";

/*
 * Reading one course out of a PDEU course handout (syllabus fix, Phase 2; reused for student
 * uploads in Phase 3). Input is the course's text lines in reading order; output is its course
 * type, units with topics (theory/practice) or experiments (practical). Pure and AI-free.
 */

/** PDEU's three course types. Theory and practice use the normal lesson maker; practical = lab. */
export type CourseType = "theory" | "practice" | "practical";

/** Lecture, tutorial and practical hours per week (and credits) from the teaching scheme. */
export type Ltp = { L: number; T: number; P: number; C?: number };

export type ParsedUnit = { order: number; name: string; hours?: number; topics: string[] };
export type ParsedExperiment = { number: number; title: string; aim?: string };

const UNIT_HEAD = /^\s*(?:unit|module)\s*[-–—.:]?\s*([ivx]+|\d{1,2})\b\s*[:.)\-–—]*\s*(.*)$/i;
/** "… 8 Hrs." or "… Hours: 12" at the end of a unit heading. */
const HOURS_TAIL =
  /[\s(]*(?:(\d{1,3})\s*(?:hours?|hrs?)\.?|(?:hours?|hrs?)\.?\s*[:-]?\s*(\d{1,3}))\)?\s*$/i;
/** Where the units (or experiments) end. */
const SECTION_END =
  /^(?:course\s+outcomes?|text\s*(?:books?)?\s*\/?\s*(?:&\s*)?references?|text\s*books?|reference\s*books?|references\b|list\s+of\s+experiments?|lab(?:oratory)?\s+experiments|on completion of the course)/i;
/** "Max. Hrs.: 42", "TOTAL HOURS: 40 Hrs." glued to the end of a unit. */
const TOTAL_TAIL =
  /\s*(?:max\.?\s*hrs?\.?|total\s*(?:hours|hrs\.?)|total\s*lecture\s*hours)\s*[:=-]?\s*\d+\s*(?:hrs?\.?|hours)?\s*$/i;
const EXPERIMENTS_HEAD =
  /^(?:list\s+of\s+(?:simulations\s+and\s+)?(?:experiments?|practicals?|exercises|simulations)|lab(?:oratory)?\s+(?:experiments|exercises)|laboratory\s+sessions\s+would\s+be\s+based|experiments\s*:?\s*$)/i;
/** Bullet glyphs PDFs use (Wingdings private-use characters, •, ▪, Ø). */
const BULLET_GLYPH = /[-•▪●■◦➢Ø]/g;
const BULLET_START = /^[-•▪●■◦➢Ø]\s*(\S.*)$/;
const EXPERIMENTS_END =
  /^(?:course\s+outcomes?|text\s*(?:books?)?\s*\/?\s*(?:&\s*)?references?|text\s*books?|reference\s*books?|references\b|on completion of the course|suggested\s+readings?)/i;

function romanToInt(s: string): number {
  const v: Record<string, number> = { i: 1, v: 5, x: 10 };
  let total = 0;
  const lower = s.toLowerCase();
  for (let k = 0; k < lower.length; k++) {
    const cur = v[lower[k]] ?? 0;
    const next = v[lower[k + 1]] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

function unitNumber(token: string): number {
  return /^\d+$/.test(token) ? Number(token) : romanToInt(token);
}

/** Join wrapped lines into one paragraph; "conver-" + "sions" → "conversions". */
function joinLines(lines: readonly string[]): string {
  return lines.reduce((acc, line) => {
    const t = line.trim();
    if (!t) return acc;
    if (/[a-z]-$/.test(acc)) return acc.slice(0, -1) + t;
    return acc ? `${acc} ${t}` : t;
  }, "");
}

/** Topic list from a unit's body text, split the same way as student syllabus uploads. */
function topicsOf(body: string): string[] {
  const text = body
    .replace(BULLET_GLYPH, "; ")
    .replace(/\s+TOTAL\b.*$/, "")
    .trim();
  if (!text) return [];
  const draft = parseSyllabusText(text);
  return draft
    .flatMap((c) => c.topics)
    .map((t) =>
      t
        .replace(/^\d{1,2}(?:\.\d{1,2})*\s+(?=[A-Za-z])/, "") // "11 Introduction to Cementing"
        .replace(/^(?:and|or)\s+/i, "") // "…types, and issues"
        .trim(),
    )
    .filter((t) => t.length >= 3 && !/^max\b|^total\b|^<.*>$/i.test(t));
}

const SMALL_WORDS = new Set("a an and as at by for in of on or the to via with".split(" "));
const ACRONYMS = new Set(
  "ai ml ac dc iot ic pcb plc pid cad cam cnc gis bim fet bjt mosfet dsp fft dft sql os cpu gpu ram rom led lcd rf emi pll adc dac vlsi cmos fpga asic tcp ip http dna rna pcr hvac lng lpg ev ann cnn rnn nlp ui ux api erp".split(
    " ",
  ),
);

/**
 * "ELECTRICITY AND MAGNETISM" → "Electricity and Magnetism". Only for names printed in capitals;
 * known acronyms (AI, BJT, CMOS) and short words without vowels stay in capitals.
 */
export function tidyCaps(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4 || letters !== letters.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(/(\s+|-|\/)/)
    .map((w, i) => {
      if (!/[a-z]/.test(w)) return w;
      if (ACRONYMS.has(w) || (w.length <= 4 && !/[aeiouy]/.test(w))) return w.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(w)) return w;
      return w[0].toUpperCase() + w.slice(1);
    })
    .join("");
}

/** Units in order, with their topics. Empty when the course lists no units. */
export function parseUnits(lines: readonly string[]): ParsedUnit[] {
  const units: { head: string; body: string[] }[] = [];
  let current: { head: string; body: string[] } | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (SECTION_END.test(line)) {
      if (current) current = null;
      if (units.length > 0) break;
      continue;
    }
    const head = UNIT_HEAD.exec(line);
    if (head) {
      // Numbering starting again (a second "Unit 1" block of tutorials): the units are over.
      const prev = units.at(-1);
      const prevNo = prev ? unitNumber(UNIT_HEAD.exec(prev.head)?.[1] ?? "0") : 0;
      if (prev && unitNumber(head[1]) <= prevNo && unitNumber(head[1]) === 1) break;
      current = { head: line, body: [] };
      units.push(current);
      continue;
    }
    current?.body.push(line);
  }
  return units.map((u, i) => {
    const m = UNIT_HEAD.exec(u.head);
    let rest = (m?.[2] ?? "").replace(TOTAL_TAIL, "");
    const hours = HOURS_TAIL.exec(rest);
    rest = rest.replace(HOURS_TAIL, "");
    // "UNIT 2: Ecosystems: structure, food chains" → name "Ecosystems", the rest are topics.
    const [name, ...more] = rest.split(/:\s+/);
    const body = joinLines([more.join(", "), ...u.body]).replace(TOTAL_TAIL, "");
    const cleanName = name.replace(/^[\s:.\-–—]+|[\s:.\-–—]+$/g, "").trim();
    return {
      order: m ? unitNumber(m[1]) || i + 1 : i + 1,
      name: tidyCaps(cleanName) || `Unit ${i + 1}`,
      ...(hours ? { hours: Number(hours[1] ?? hours[2]) } : {}),
      topics: topicsOf(body),
    };
  });
}

const EXPERIMENT_LINE =
  /^(?:(?:experiment|expt?\.?|practical|lab)\s*(?:no\.?)?\s*)?(\d{1,2})\s*[.):\-–]?\s+(\S.*)$/i;
/** "Iodometry – To determine the strength …" → title + aim. */
const AIM_SPLIT = /\s*[–—:-]\s*(?=(?:to|aim)\b)/i;

/** The numbered list of experiments of a practical course, in order. */
export function parseExperiments(lines: readonly string[]): ParsedExperiment[] {
  const at = lines.findIndex((l) => EXPERIMENTS_HEAD.test(l.trim()));
  if (at < 0) return [];
  const items: { number: number; text: string[] }[] = [];
  for (const raw of lines.slice(at + 1)) {
    const line = raw.trim();
    if (!line) continue;
    if (EXPERIMENTS_END.test(line)) break;
    const m = EXPERIMENT_LINE.exec(line);
    const bullet = BULLET_START.exec(line);
    const last = items.at(-1);
    // A new number must follow on from the last one; otherwise it's a wrapped line.
    // "31." right after 2 is a typo for "3." (seen in BIOTECH handouts).
    const want = (last?.number ?? 0) + 1;
    if (m && (Number(m[1]) === want || (last && m[1].length === 2 && m[1][0] === String(want)))) {
      items.push({ number: want, text: [m[2]] });
    } else if (bullet) {
      items.push({ number: (last?.number ?? 0) + 1, text: [bullet[1]] });
    } else if (/:\s*$/.test(line) && line.length < 80) {
      // A group heading ("Linear Data structures:") between bulleted experiments.
      continue;
    } else if (last) last.text.push(line);
  }
  return items.map((it) => {
    const text = joinLines(it.text);
    const parts = text.split(AIM_SPLIT);
    if (parts.length > 1 && parts[0].length >= 3) {
      return { number: it.number, title: parts[0].trim(), aim: parts.slice(1).join(" ").trim() };
    }
    if (/^(?:to|aim)\b/i.test(text)) return { number: it.number, title: text, aim: text };
    return { number: it.number, title: text };
  });
}

const LAB_TITLE = /\b(?:lab|laboratory|practicals?|workshop|field\s*work)\b/i;

/** What the course code's last letter says: T = theory, P = practical, otherwise nothing. */
export function codeSuffixType(code: string | null): "theory" | "practical" | null {
  if (!code || code.startsWith("UG_")) {
    const ug = code?.match(/^UG_\d+_([TPL])/);
    if (!ug) return null;
    return ug[1] === "T" ? "theory" : "practical";
  }
  if (/TP$/.test(code)) return null;
  if (/T$/.test(code)) return "theory";
  if (/[PL]$/.test(code)) return "practical";
  return null;
}

export type TypeInput = {
  code: string | null;
  title: string;
  ltp: Ltp | null;
  unitCount: number;
  experimentCount: number;
  /** The same semester has a separate "<same name> Laboratory" course. */
  hasLabTwin: boolean;
};

export type TypeDecision = {
  courseType: CourseType | null;
  /** Why: the handout signals used. */
  signals: string[];
  /** Set when the signals or the code disagree: goes to needs_review. */
  review?: string;
};

const ltpText = (l: Ltp) => `${l.L}-${l.T}-${l.P}`;

/**
 * Course type from the handout (title, L-T-P, units vs experiments), then checked against the
 * code's T/P suffix. The handout wins; any disagreement is sent for review, never guessed away.
 */
export function decideCourseType(input: TypeInput): TypeDecision {
  const { ltp } = input;
  const signals: string[] = [];
  const reviews: string[] = [];
  const titleLab = LAB_TITLE.test(input.title);
  if (titleLab) signals.push("title says lab");
  if (ltp) signals.push(`L-T-P ${ltpText(ltp)}`);
  if (input.unitCount > 0) signals.push(`${input.unitCount} units`);
  if (input.experimentCount > 0) signals.push(`${input.experimentCount} experiments`);

  const lectures = ltp ? ltp.L + ltp.T : null;
  let type: CourseType | null = null;
  if (titleLab) {
    type = "practical";
    if (lectures) reviews.push(`named a lab but L-T-P is ${ltpText(ltp!)}`);
  } else if (ltp && lectures === 0 && ltp.P > 0) {
    if (input.hasLabTwin) {
      type = "theory";
      reviews.push(`L-T-P ${ltpText(ltp)} but a separate lab course exists`);
    } else type = "practical";
  } else if (ltp && lectures && ltp.P > 0) {
    type = "practice";
  } else if (ltp && lectures) {
    type = "theory";
  } else if (input.experimentCount > 0 && input.unitCount === 0) {
    type = "practical";
  } else if (input.unitCount > 0) {
    type = "theory";
  }
  if (type === "theory" && input.experimentCount > 0 && input.unitCount === 0)
    reviews.push("theory by L-T-P but lists experiments, no units");

  const fromCode = codeSuffixType(input.code);
  if (type && fromCode) {
    const agrees = fromCode === "practical" ? type === "practical" : type !== "practical";
    if (!agrees) reviews.push(`code ${input.code} says ${fromCode}, handout says ${type}`);
  }
  return { courseType: type, signals, ...(reviews.length ? { review: reviews.join("; ") } : {}) };
}

/** Name without lab words or brackets, to pair a theory course with its lab. */
export function baseCourseName(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(?:lab|laboratory|practicals?)\b|\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
