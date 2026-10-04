import { evaluateCheck } from "@/lib/safeMath";
import { statesUnit } from "@/lib/units";

/*
 * Checks worked-example answers with a computer (SPEC §6.1 rule 7). The AI writes, next to
 * each numeric answer, a mathjs expression that computes it from the problem's data; we
 * evaluate it here (in the locked-down mathjs of safeMath.ts) and compare. Like checking a
 * calculator answer by doing it again.
 */

export { evaluateCheck };

/** `unit` (optional, SPEC §12.3 rule 7): the SI unit the answer must be given in, e.g. "N/C". */
export type AnswerCheck = { expression: string; answer: number; unit?: string };

/** True when two numbers agree to about 3 significant figures (answers are usually rounded). */
export function closeEnough(a: number, b: number, rel = 5e-3): boolean {
  if (a === b) return true;
  return Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), 1e-12);
}

/** Every number written in a text, including 2.5 × 10^3 / 2.5 \times 10^{3} / 2.5e3 forms. */
export function numbersIn(text: string): number[] {
  const t = text
    .replace(/\\times|×|\\cdot/g, "x")
    .replace(/[{}$]/g, "")
    .replace(/,(?=\d{3}\b)/g, "");
  const out: number[] = [];
  const re = /(-?\d+(?:\.\d+)?)(?:\s*x\s*10\s*\^\s*\(?\s*(-?\d+)\s*\)?|e(-?\d+))?/gi;
  for (const m of t.matchAll(re)) {
    const base = Number(m[1]);
    const exp = m[2] ?? m[3];
    out.push(exp !== undefined ? base * 10 ** Number(exp) : base);
  }
  return out;
}

/** Simple LaTeX (fractions, roots, ln, π) rewritten as a mathjs calculation. */
function latexToCalc(tex: string): string {
  let t = tex.replace(/\$/g, "").replace(/\\(left|right|,|;|!|quad)/g, " ");
  for (let i = 0; i < 4; i++) {
    t = t
      .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))")
      .replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)");
  }
  return t
    .replace(/\\(ln|log|sin|cos|tan|exp)\s+([0-9.]+|[a-z])\b/g, "\\$1($2)")
    .replace(/\\ln/g, "log")
    .replace(/\\log/g, "log10")
    .replace(/\\pi/g, "pi")
    .replace(/\\(cdot|times)/g, "*")
    .replace(/\\(sin|cos|tan|exp)/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\\[a-zA-Z]+/g, " ")
    .trim();
}

/** Every value an answer states: plain numbers, plus exact forms like 26/3 or 2 ln 2. */
export function valuesIn(text: string): number[] {
  const values = numbersIn(text);
  // Each part after "=" or "≈", split at commas and words, may be an exact expression.
  const pieces = text.split(/=|≈|\\approx|,|\band\b|\bor\b/);
  for (const piece of pieces) {
    const calc = latexToCalc(piece);
    if (!calc || calc.length > 120) continue;
    // Try as written, then without a trailing unit ("sqrt(2) m" → "sqrt(2)").
    for (const attempt of [calc, calc.replace(/\s+[a-zA-Z][a-zA-Z/^0-9·*]*\s*$/, "")]) {
      try {
        values.push(evaluateCheck(attempt));
        break;
      } catch {
        // Not a pure calculation (units, words): the plain numbers above cover it.
      }
    }
  }
  return values;
}

/**
 * True when the written answer states this value, allowing SI prefixes: "88.5 pF" states
 * 8.85e-11 (F), "2.5 kN" states 2500 (N).
 */
export function statesValue(text: string, value: number): boolean {
  const prefixes = [1, 1e3, 1e-3, 1e6, 1e-6, 1e9, 1e-9, 1e12, 1e-12];
  return valuesIn(text).some((n) => prefixes.some((p) => closeEnough(n * p, value, 1e-2)));
}

/**
 * Problems with one worked example's check: the expression must evaluate, agree with the
 * stated answer number, and that number must appear in the written answer.
 */
export function answerCheckProblems(check: AnswerCheck, writtenAnswer: string): string[] {
  let value: number;
  try {
    value = evaluateCheck(check.expression);
  } catch (err) {
    return [
      `check.expression "${check.expression}" could not be evaluated (${(err as Error).message})`,
    ];
  }
  const problems: string[] = [];
  if (!closeEnough(value, check.answer)) {
    problems.push(
      `the answer is wrong or the check disagrees: ${check.expression} = ${Number(value.toPrecision(6))}, but check.answer is ${check.answer}. Recalculate the example.`,
    );
  }
  if (!statesValue(writtenAnswer, check.answer)) {
    problems.push(`the written answer does not contain the checked value ${check.answer}`);
  }
  if (check.unit && !statesUnit(writtenAnswer, check.unit)) {
    problems.push(`the written answer does not give the unit ${check.unit} after the value`);
  }
  return problems;
}

type CheckedExample = { problem: string; answer: string; check?: AnswerCheck };

/** "workedExamples.N: problem" lines for the repair prompt. */
export function findAnswerProblems(examples: CheckedExample[]): string[] {
  return examples.flatMap((w, i) =>
    w.check ? answerCheckProblems(w.check, w.answer).map((p) => `workedExamples.${i}: ${p}`) : [],
  );
}

/**
 * Used when the AI couldn't fix its examples in time: an example whose computed answer
 * disagrees with the stated one is removed (never show a wrong answer); a check that merely
 * failed to run is dropped, so the example shows without the "checked" badge.
 */
export function dropFailedChecks<T extends CheckedExample>(examples: T[]): T[] {
  return examples.flatMap((w) => {
    if (!w.check) return [w];
    let value: number;
    try {
      value = evaluateCheck(w.check.expression);
    } catch {
      const copy = { ...w };
      delete copy.check;
      return [copy];
    }
    const agrees =
      closeEnough(value, w.check.answer) &&
      statesValue(w.answer, w.check.answer) &&
      (!w.check.unit || statesUnit(w.answer, w.check.unit));
    return agrees ? [w] : [];
  });
}
