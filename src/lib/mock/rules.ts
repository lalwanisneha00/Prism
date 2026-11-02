/*
 * The quality rules a mock paper is written and checked against. One wording, used by both the
 * writer's prompt (paper.ts) and the examiner's prompt (examiner.ts), so they judge alike.
 */

/** Answer size by marks: what a full-marks answer looks like. */
export const ANSWER_SIZE =
  "1 mark: one precise fact, value or result. 2 marks: a definition plus a short example or explanation. 3 marks: three distinct correct points. 4 marks: four points or a short worked answer. 5+ marks: a structured answer (sub-points, steps, an example, a diagram described if useful). Concise and correct beats long; no padding, nothing the question didn't ask.";

/** Rules both the writer and the examiner follow (one wording, so they judge alike). */
export const CORRECTNESS_RULES = `- The SYLLABUS BOUNDARY decides what may be asked, not how related an idea feels. A concept from another unit, course or programming language is off-syllabus even when it sounds related (e.g. closures or Java inheritance in a "Basics of C" unit).
- Never present implementation-defined or platform-dependent behaviour as universal (sizes of types, byte order, evaluation order). If a question needs such a fact, the question itself states the assumption (e.g. "Assume int is 4 bytes").
- Use terms exactly: e.g. declaration vs initialization vs assignment; compiler vs interpreter vs assembler vs linker; parameter vs argument. No undefined behaviour in a question that expects one answer.
- Ask for "the output" only of code that prints something; otherwise ask for the value of a variable after the code runs.
- A question must have exactly one defensible answer: define the context, give every value a numerical needs, avoid vague asks ("discuss the advantages of X" without saying of what, compared with what).
- The command word fits the marks: define/state/list for 1-2 marks; explain/differentiate/calculate/write/predict for 2-5; discuss/derive/analyse/write a full program for 5+.
- Difficulty is the thinking needed (easy: recall or recognise; medium: apply, compare, a straightforward calculation or trace; hard: several ideas together, a multi-step problem, debugging), never the length of the wording.`;
