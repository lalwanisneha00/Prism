/*
 * Unit checking for numerical answers (V3 · Step 5, SPEC §12.3 rule 7). The number itself is
 * re-calculated by the answer check; this makes sure the answer also gives the right unit,
 * written any of the usual ways: "N/C", "N C^-1", "N·C⁻¹", "newtons per coulomb".
 */

const SUPERSCRIPT: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
};

/** Words students and textbooks use for units, mapped to symbols. */
const WORDS: [RegExp, string][] = [
  [/\bnewtons?\b/g, "N"],
  [/\bcoulombs?\b/g, "C"],
  [/\bvolts?\b/g, "V"],
  [/\bamperes?\b|\bamps?\b/g, "A"],
  [/\bohms?\b/g, "Ω"],
  [/\bjoules?\b/g, "J"],
  [/\bwatts?\b/g, "W"],
  [/\bfarads?\b/g, "F"],
  [/\bhenr(?:y|ies|ys)\b/g, "H"],
  [/\bteslas?\b/g, "T"],
  [/\bwebers?\b/g, "Wb"],
  [/\bhertz\b/g, "Hz"],
  [/\bpascals?\b/g, "Pa"],
  [/\bmeters?\b|\bmetres?\b/g, "m"],
  [/\bseconds?\b/g, "s"],
  [/\bkilograms?\b/g, "kg"],
  [/\bkelvins?\b/g, "K"],
  [/\bsquared\b/g, "^2"],
  [/\bcubed\b/g, "^3"],
];

/**
 * A unit as a canonical list of (symbol, power) pairs, sorted, e.g. "N/C" and "N C^-1" both
 * give "C^-1 N^1". Returns null for text that isn't a unit.
 */
export function canonicalUnit(raw: string): string | null {
  let text = raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => SUPERSCRIPT[c]);
  // Words first ("newtons per coulomb"), then "per" means divide.
  for (const [re, sym] of WORDS) text = text.replace(re, sym);
  text = text
    .replace(/\bper\b/g, "/")
    .replace(/\\(?:mathrm|text)\{([^}]*)\}/g, "$1")
    .replace(/\\Omega/g, "Ω")
    .replace(/\\cdot|[·⋅*]/g, " ")
    .replace(/[{}$]/g, "")
    .replace(/\s*\^\s*/g, "^")
    .trim();
  if (!text) return null;
  const powers = new Map<string, number>();
  let sign = 1;
  // Tokens: unit symbols (with optional power) and "/" switches to the denominator.
  for (const token of text.split(/\s+|(?=\/)|(?<=\/)/).filter(Boolean)) {
    if (token === "/") {
      sign = -1;
      continue;
    }
    const m = /^(Ω|[A-Za-zµμ]+)(?:\^?(-?\d+))?$/.exec(token);
    if (!m) return null;
    const power = (m[2] ? Number(m[2]) : 1) * sign;
    powers.set(m[1], (powers.get(m[1]) ?? 0) + power);
  }
  const parts = [...powers].filter(([, p]) => p !== 0).sort(([a], [b]) => a.localeCompare(b));
  return parts.length ? parts.map(([u, p]) => `${u}^${p}`).join(" ") : null;
}

/**
 * Does the answer text give the expected unit? Looks at the words right after each number
 * (up to 30 characters) and compares them as canonical units.
 */
export function statesUnit(answer: string, unit: string): boolean {
  const want = canonicalUnit(unit);
  if (!want) return true; // not a unit we understand: nothing to check
  const text = answer.replace(/\\,|~/g, " ");
  for (const m of text.matchAll(
    /\d(?:[\d.,]*\d)?(?:\s*(?:×|x|\\times)\s*10\^?\{?-?\d+\}?)?\s*([^\d=,;.]{1,30})/g,
  )) {
    const candidate = m[1]
      .replace(/\s+(?:at|in|on|for|from|when|and|so|which|is|the)\b.*$/i, "")
      .trim();
    if (canonicalUnit(candidate) === want) return true;
  }
  return false;
}
