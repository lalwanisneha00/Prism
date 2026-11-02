import { z } from "zod";
import { ANSWER_SIZE, CORRECTNESS_RULES } from "@/lib/mock/rules";
import { sameNumber, type KeyItem } from "@/lib/mock/verify";

/*
 * The paper's examiner (mock quality upgrade). After the whole paper is written, ONE separate AI
 * call reads every question with its answer key, like an external examiner moderating a paper
 * before it is printed. Its job is to find errors, not to agree: it solves each question itself
 * first, then checks syllabus, correctness, ambiguity, repeats, command word vs marks and the
 * answer. Code then re-runs what it can (the MCQ option it picked, its own calculation) instead of
 * trusting either AI. Only questions with a clean verdict reach the student.
 */

/** The most questions one examiner call reads (bigger papers are sent in two calls). */
export const EXAMINE_LIMIT = 12;

const letter = z.preprocess(
  (v) =>
    typeof v === "string"
      ? v
          .trim()
          .toLowerCase()
          .replace(/^\(?([a-d])\)?$/, "$1")
      : v,
  z.enum(["a", "b", "c", "d"]),
);

/**
 * The checks the examiner answers one by one for every question (true = fine). A question passes
 * only when every one is true: the examiner can't wave a question through with a single "pass".
 */
export const EXAM_CHECKS = {
  syllabus: "inside the syllabus boundary, tested as this course teaches it",
  correct: "every statement in the question, answer, reason and scheme is technically correct",
  unambiguous: "exactly one defensible answer; every needed value and assumption is stated",
  notRepeat: "doesn't test the same learning outcome as another question",
  commandFitsMarks: "the command word fits the marks and the question is at exam level",
  answerComplete:
    "the answer gives what the command word asks, covers every scheme point and is sized to the marks",
  codeAndNumbers:
    "code compiles (unless finding the error is the task), outputs are exact, numbers and units are right (true when there are none)",
} as const;
export type ExamCheck = keyof typeof EXAM_CHECKS;
const CHECK_KEYS = Object.keys(EXAM_CHECKS) as ExamCheck[];

export const ReviewReplySchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().max(20),
        /** The examiner's own short answer, written before it reads the key. */
        solution: z.string().trim().max(1500).default(""),
        /** Each check answered on its own; a missing one counts as failed. */
        checks: z.record(z.string(), z.boolean()).default({}),
        pass: z.boolean().optional(),
        issues: z.array(z.string().trim().max(400)).max(10).default([]),
        fix: z.string().trim().max(800).default(""),
        /** MCQs: the option the examiner picked, solving it without the key. */
        option: letter.optional().catch(undefined),
        /** Calculations: the examiner's own final number and the plain calculation behind it. */
        finalAnswer: z.number().optional().catch(undefined),
        expression: z.string().trim().max(300).optional().catch(undefined),
      }),
    )
    .max(60),
});
export type ReviewResult = z.infer<typeof ReviewReplySchema>["results"][number];

/** What the paper gets back for one question. */
export type Verdict = { id: string; pass: boolean; issues: string[]; fix: string };

/** A question as the examiner sees it (the key included). */
export type ExamItem = KeyItem & {
  id: string;
  topic: string;
  marks: number;
  learningOutcome?: string;
  relevance?: string;
  difficulty?: string;
  check?: { expression: string; answer: number; unit?: string };
};

/**
 * The examiner's verdict on one question, with code's own checks on top: an MCQ passes only when
 * the examiner picked the key's option, a numerical only when the examiner's calculation (run by
 * code) gives the key's number. No result at all is a fail: a question is never called checked
 * when it wasn't.
 */
export function verdictFor(
  item: ExamItem,
  result: ReviewResult | undefined,
  evaluate: (expression: string) => number,
): Verdict {
  if (!result)
    return {
      id: item.id,
      pass: false,
      issues: ["the examiner didn't check this question"],
      fix: "",
    };
  const issues = [...result.issues.filter((i) => i.length > 0)];
  const failed = CHECK_KEYS.filter((k) => result.checks[k] !== true);
  let pass = failed.length === 0 && result.pass !== false;
  if (failed.length && issues.length === 0)
    issues.push(...failed.map((k) => `fails the check: ${EXAM_CHECKS[k]}`));
  if (item.type === "mcq") {
    const key = "abcd"[(item.options ?? []).indexOf(item.answer)];
    if (!result.option) {
      pass = false;
      issues.push("the examiner didn't say which option is correct");
    } else if (key && result.option !== key) {
      pass = false;
      issues.push(`solved without the key, the examiner picked (${result.option}), not (${key})`);
    }
  }
  if (item.type === "numerical" && item.check) {
    let solved = result.finalAnswer;
    if (result.expression) {
      try {
        solved = evaluate(result.expression);
      } catch {
        // Keep the stated number.
      }
    }
    if (solved === undefined) {
      pass = false;
      issues.push("the examiner couldn't re-solve the calculation");
    } else if (!sameNumber(solved, item.check.answer)) {
      pass = false;
      issues.push(
        `solved again, the answer is ${Number(solved.toPrecision(4))}, not ${Number(item.check.answer.toPrecision(4))}`,
      );
    }
  }
  if (!pass && issues.length === 0) issues.push("the examiner rejected it without a reason");
  return { id: item.id, pass, issues, fix: pass ? "" : result.fix };
}

export type ReviewInput = {
  course: string;
  /** The chosen topics as "name (unit)": the syllabus boundary. */
  topics: readonly string[];
  /** Other topics of the course, not in this paper. */
  outside: readonly string[];
  syllabus?: string;
  /** The subject checklist as text (see checklist.ts), if the subject has one. */
  checklist?: string;
  questions: readonly ExamItem[];
  /** Questions already accepted in the paper (for the repeat check). */
  accepted: readonly string[];
};

export function reviewPrompt(input: ReviewInput): { system: string; prompt: string } {
  const system = `You are a strict external examiner moderating a mock exam for ${input.course} before it is printed. Your job is to FIND ERRORS, not to agree with the setter. Assume there are mistakes until you have checked.
For every question:
1. "solution": solve it yourself FIRST, briefly, before reading the key (for code: follow the language's rules, not the indentation, trace it line by line and write the exact output). MCQ: also put the correct letter in "option". Calculation: also put your final number in "finalAnswer" and a plain calculation with numbers only (mathjs syntax) in "expression".
2. Compare your solution with the key, then answer each check with true (fine) or false (a problem) in "checks":
${CHECK_KEYS.map((k) => `   - "${k}": ${EXAM_CHECKS[k]}`).join("\n")}
   Full-marks answer size: ${ANSWER_SIZE}
3. Be strict. Any of these makes a check false: a wrong answer, off-syllabus content, no valid answer, ambiguity, invalid code, wrong numbers, wrong or loose terminology, implementation-defined behaviour presented as universal, a repeat, an incomplete or padded answer, a command word that doesn't fit, a scheme point the answer doesn't cover, an "output" asked of code that prints nothing.
4. "issues": each problem in one precise sentence (what is wrong and what is right). "fix": what the setter must change, concretely (e.g. "State 'assume int is 4 bytes' in the question; the answer is 40 bytes"). Both empty when every check is true.
Rules the paper was written to:
${CORRECTNESS_RULES}${input.checklist ? `\n\n${input.checklist}` : ""}
Reply with JSON only, one result per question id, in this order of fields: {"results":[{"id":"s1q1","solution":"...","option":"b","checks":{${CHECK_KEYS.map((k) => `"${k}":true`).join(",")}},"issues":[],"fix":""},{"id":"s1q2","solution":"...","finalAnswer":7,"expression":"2*3.5","checks":{${CHECK_KEYS.map((k, i) => `"${k}":${i === 1 ? "false" : "true"}`).join(",")}},"issues":["..."],"fix":"..."}]}`;
  const questions = input.questions
    .map((q) => {
      const options = q.options?.map((o, i) => `  (${"abcd"[i]}) ${o}`).join("\n");
      const scheme = q.scheme.map((p) => `  - ${p.point} [${p.marks}]`).join("\n");
      const meta = [
        `topic ${q.topic}`,
        q.learningOutcome && `outcome: ${q.learningOutcome}`,
        q.relevance && `setter's relevance ${q.relevance}`,
        q.difficulty && `difficulty ${q.difficulty}`,
      ]
        .filter(Boolean)
        .join("; ");
      return `ID ${q.id} (${q.type}, ${q.marks} ${q.marks === 1 ? "mark" : "marks"}; ${meta})
QUESTION: ${q.question}${options ? `\nOPTIONS:\n${options}` : ""}
KEY ANSWER: ${q.answer}${q.reason ? `\nKEY REASON: ${q.reason}` : ""}${scheme ? `\nSCHEME:\n${scheme}` : ""}`;
    })
    .join("\n\n---\n\n");
  const prompt = `Course: ${input.course}

SYLLABUS BOUNDARY (the topics this paper may test):
${input.topics.map((t) => `- ${t}`).join("\n")}${input.outside.length ? `\n\nNOT IN THIS PAPER (other units):\n${input.outside.map((t) => `- ${t}`).join("\n")}` : ""}${input.syllabus ? `\n\nSYLLABUS (uploaded by the student):\n${input.syllabus}` : ""}${input.accepted.length ? `\n\nALREADY ACCEPTED (for the repeat check only; don't review these):\n${input.accepted.map((q) => `- ${q}`).join("\n")}` : ""}

QUESTIONS TO CHECK:

${questions}`;
  return { system, prompt };
}

/** The test AI's examiner: passes a correct key, re-solving MCQs and numericals from the key. */
export function fakeReview(items: readonly ExamItem[]): z.input<typeof ReviewReplySchema> {
  return {
    results: items.map((q) => ({
      id: q.id,
      solution: "Solved the same way as the key (test examiner).",
      checks: Object.fromEntries(CHECK_KEYS.map((k) => [k, true])),
      issues: [],
      fix: "",
      ...(q.type === "mcq" ? { option: "abcd"[(q.options ?? []).indexOf(q.answer)] } : {}),
      ...(q.check ? { expression: q.check.expression } : {}),
    })),
  };
}
