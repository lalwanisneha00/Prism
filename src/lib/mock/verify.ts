import { z } from "zod";

/*
 * Checking the answer sheet (mock test redesign). Last time a question said "State the value of
 * Euler's number e" and the key gave the definition. Two checks stop that: plain rules on the
 * question's command word (state the value → a value, derive → steps, compare → differences…),
 * and a second, independent AI pass that answers each question again without seeing the key;
 * code then compares the two. Like a second examiner solving the paper before it is printed.
 */

export type Command =
  | "value"
  | "calculate"
  | "define"
  | "state"
  | "list"
  | "explain"
  | "derive"
  | "compare"
  | "draw"
  | "other";

const WORD_NUMBERS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
};

/** The question's opening words, without numbering, markdown and maths. */
function opening(question: string): string {
  return question
    .replace(/\$[^$]*\$/g, " x ")
    .replace(/[*_#>`]/g, "")
    .replace(/^\s*(?:q\s*\.?\s*\d+|\d+|\([a-z]\)|[a-z]\))[.):]?\s*/i, "")
    .toLowerCase()
    .trim();
}

/** What the question asks for, from its command word. */
export function commandOf(question: string): Command {
  const q = opening(question);
  const head = q.split(/\s+/).slice(0, 10).join(" ");
  if (
    /\b(state|write|give|find|what is|what's)\b.{0,25}\b(numerical )?value\b|\bhow (many|much)\b/.test(
      head,
    )
  )
    return "value";
  if (
    /^(calculate|compute|evaluate|determine the (value|magnitude)|solve|find the (value|magnitude|current|voltage|force|energy|resistance))\b/.test(
      q,
    )
  )
    return "calculate";
  if (/^(derive|prove|show that|obtain an expression|deduce)\b/.test(q)) return "derive";
  if (/^(compare|differentiate between|distinguish|contrast)\b/.test(q)) return "compare";
  if (/^(draw|sketch)\b/.test(q)) return "draw";
  if (/^(list|enumerate|name)\b/.test(q)) return "list";
  if (/^(define|what is meant by|what do you mean by)\b/.test(q)) return "define";
  if (/^(explain|describe|discuss|why|how|justify|illustrate|analy[sz]e|apply|interpret)\b/.test(q))
    return "explain";
  if (/^state\b/.test(q))
    return /\bstate and (explain|prove|derive)\b/.test(q) ? "explain" : "state";
  return "other";
}

/** "List three…", "name any two…": the number of items asked for. */
export function itemsAsked(question: string): number | undefined {
  const m =
    /^(?:list|name|state|give|write|enumerate|mention)\s+(?:any\s+)?(\d|two|three|four|five|six|seven|eight)\b/.exec(
      opening(question),
    );
  if (!m) return undefined;
  return Number(m[1]) || WORD_NUMBERS[m[1]];
}

/** Plain recall (a warm-up question): define, state, list, the value of… */
export function isRecall(question: string): boolean {
  const c = commandOf(question);
  if (c === "define" || c === "state" || c === "list") return true;
  if (c === "value")
    return !/\b(calculate|compute|find|determine)\b.*\b(given|if|when)\b/.test(opening(question));
  // "Which of the following is the unit/value/definition of…"
  return /\bwhich of the following (is|are) (the )?(value|unit|definition|symbol|si unit|formula)\b/.test(
    opening(question),
  );
}

/** Numbers in a text, including 1.6 × 10^-19, 1.6e-19, ½ and ten-to-the powers in LaTeX. */
export function numbersIn(text: string): number[] {
  const s = text
    .replace(/\\times|×|\\cdot|·/g, "*")
    .replace(/[−–]/g, "-")
    .replace(/\\,|,(?=\d{3}\b)/g, "")
    .replace(/\^\{\s*(-?\d+)\s*\}/g, "^$1")
    .replace(/⁻/g, "-")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => String("⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(d)));
  const out: number[] = [];
  const sci = /(-?\d+(?:\.\d+)?)\s*\*\s*10\s*\^\s*\(?(-?\d+)\)?/g;
  for (const m of s.matchAll(sci)) out.push(Number(m[1]) * 10 ** Number(m[2]));
  const rest = s.replace(sci, " ");
  for (const m of rest.matchAll(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)) {
    const n = Number(m[0]);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** Two answers agree when they differ by at most 1% (rounding in the working). */
export function sameNumber(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1e-12, Math.abs(b) * 0.01);
}

const hasMathOrNumber = (s: string) => /\d|\$[^$]+\$|[=√π∞]/.test(s);
const MARKING_WORDS =
  /\b(value|answer|result|substitut|formula|method|working|calculat|numer|unit|correct)\w*/i;

export type KeyItem = {
  type: string;
  question: string;
  answer: string;
  scheme: readonly { point: string; marks: number }[];
  options?: readonly string[];
  reason?: string;
};

/**
 * Whether the model answer and scheme answer what the question asks. Returns the problem in a
 * few words, or null. Catches "state the value of e" answered with a definition.
 */
export function commandProblem(q: KeyItem): string | null {
  if (q.type === "mcq") return null;
  const c = commandOf(q.question);
  const schemeText = q.scheme.map((p) => p.point).join(" ");
  if (c === "value" || c === "calculate") {
    if (!hasMathOrNumber(q.answer))
      return `the question asks for a value but the model answer gives none`;
    if (!hasMathOrNumber(schemeText) && !MARKING_WORDS.test(schemeText))
      return `the question asks for a value but the marking scheme doesn't give marks for it`;
  }
  if (c === "calculate" && q.answer.split(/[\n.;]/).filter((l) => l.trim()).length < 2)
    return "a calculation needs its working in the model answer, not only the result";
  if (
    c === "define" &&
    q.answer
      .replace(/\$[^$]*\$/g, "x")
      .trim()
      .split(/\s+/).length < 4
  )
    return "a definition needs words, not only a symbol or number";
  if ((c === "derive" || c === "compare") && q.scheme.length < 2)
    return c === "derive"
      ? "a derivation's scheme must give marks for its steps"
      : "a comparison's scheme must give marks for each difference";
  if (c === "explain" && q.scheme.length < 2 && q.scheme.reduce((n, p) => n + p.marks, 0) >= 4)
    return "an explanation worth 4 or more marks needs at least 2 scheme points";
  const n = itemsAsked(q.question);
  if (n && n > 1) {
    const items = Math.max(
      q.scheme.length,
      q.answer.split(/\n|;|,(?![^(]*\))|\d\)\s/).filter((x) => x.trim()).length,
    );
    if (items < n) return `the question asks for ${n} items but the answer gives fewer`;
  }
  return null;
}

/** An MCQ's key: exactly one option is the answer, and the reason backs that option. */
export function mcqProblem(q: KeyItem): string | null {
  if (q.type !== "mcq") return null;
  const options = q.options ?? [];
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  if (options.length !== 4 || new Set(options.map(norm)).size !== 4)
    return "needs 4 different options";
  if (options.filter((o) => norm(o) === norm(q.answer)).length !== 1)
    return "the answer must be exactly one of the options";
  if (!q.reason || q.reason.trim().split(/\s+/).length < 3)
    return "the correct option needs a one-line reason";
  // A reason that names another option's letter as correct contradicts the key.
  const letter = "abcd"[options.findIndex((o) => norm(o) === norm(q.answer))];
  const named = /\boption\s*\(?([a-d])\)?\s+is\s+(correct|right)\b/i.exec(q.reason);
  if (named && named[1].toLowerCase() !== letter) return "the reason points to a different option";
  return null;
}

/** The second examiner's reply for each question (answered without seeing the key). */
export const VerifyReplySchema = z.object({
  checks: z
    .array(
      z.object({
        slot: z.string().max(20),
        /** Does the key's answer give exactly what the question asks for? */
        answersQuestion: z.boolean(),
        issue: z.string().trim().max(300).default(""),
        /** For MCQs: the option letter the examiner thinks is right. */
        option: z.enum(["a", "b", "c", "d"]).optional(),
        /** For calculations: the examiner's own final number and the calculation behind it. */
        finalAnswer: z.number().optional(),
        expression: z.string().trim().max(300).optional(),
      }),
    )
    .max(20),
});
export type VerifyCheck = z.infer<typeof VerifyReplySchema>["checks"][number];

/**
 * Compares the key with the second examiner's answers. A numerical counts as re-solved when the
 * examiner's own calculation (run by code) agrees with the key's checked answer.
 */
export function verifyProblem(
  item: KeyItem & { slot: string; check?: { answer: number } },
  check: VerifyCheck | undefined,
  evaluate: (expression: string) => number,
): string | null {
  if (!check) return "the answer sheet couldn't be checked";
  if (!check.answersQuestion)
    return `the answer doesn't give what the question asks${check.issue ? `: ${check.issue}` : ""}`;
  if (item.type === "mcq" && check.option) {
    const letter = "abcd"[(item.options ?? []).indexOf(item.answer)];
    if (letter && check.option !== letter)
      return `a second solve picked option (${check.option}), not (${letter})`;
  }
  if (item.type === "numerical" && item.check) {
    let solved = check.finalAnswer;
    if (check.expression) {
      try {
        solved = evaluate(check.expression);
      } catch {
        // Keep the stated number.
      }
    }
    if (solved === undefined) return "the calculation couldn't be re-solved";
    if (!sameNumber(solved, item.check.answer))
      return `a second solve gives ${Number(solved.toPrecision(4))}, not ${Number(item.check.answer.toPrecision(4))}`;
  }
  return null;
}

export function verifyPrompt(items: readonly (KeyItem & { slot: string })[]): {
  system: string;
  prompt: string;
} {
  const system = `You are a second examiner checking an answer key before a paper is printed.
For each question:
1. Solve it yourself FIRST, without looking at the key.
2. MCQ: give the letter of the correct option in "option".
3. Calculation: give your final number in "finalAnswer" and a plain calculation with numbers only (mathjs syntax) in "expression".
4. Then read the key's answer: "answersQuestion" is true only if it gives exactly what the question asks for (state the value → a value; define → a definition; derive → the full derivation; calculate → working and the final answer with units; compare → points of difference; list N → N items) and is correct. If not, say why in "issue".
Reply with JSON only: {"checks":[{"slot":"s1q1","answersQuestion":true,"issue":"","option":"b","finalAnswer":7,"expression":"2*3.5"}]}`;
  const prompt = items
    .map((q) => {
      const options = q.options?.map((o, i) => `  (${"abcd"[i]}) ${o}`).join("\n");
      return `SLOT ${q.slot} (${q.type})
QUESTION: ${q.question}${options ? `\nOPTIONS:\n${options}` : ""}
KEY ANSWER: ${q.answer}${q.reason ? `\nKEY REASON: ${q.reason}` : ""}`;
    })
    .join("\n\n---\n\n");
  return { system, prompt };
}

/** The test AI's second examiner: agrees with a correct key, re-solves numericals from the key. */
export function fakeVerify(
  items: readonly (KeyItem & { slot: string; check?: { expression: string } })[],
): z.input<typeof VerifyReplySchema> {
  return {
    checks: items.map((q) => ({
      slot: q.slot,
      answersQuestion: true,
      ...(q.type === "mcq" ? { option: "abcd"[(q.options ?? []).indexOf(q.answer)] as "a" } : {}),
      ...(q.check ? { expression: q.check.expression } : {}),
    })),
  };
}

/**
 * The student's own total (self-marking): a number from 0 to the paper's total, half marks and
 * decimals allowed (up to 2 places). Returns the number, or what's wrong with it.
 */
export function parseSelfScore(
  input: string,
  total: number,
): { ok: true; score: number } | { ok: false; message: string } {
  const s = input.trim().replace(",", ".");
  if (!s) return { ok: false, message: "Enter your total marks." };
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false, message: "Use a number like 18 or 18.5." };
  const score = Number(s);
  if (score > total) return { ok: false, message: `The paper is out of ${total}.` };
  return { ok: true, score };
}
