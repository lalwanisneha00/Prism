import katex from "katex";
import type { Lesson } from "@/lib/schema";

const mathPattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

/** KaTeX's complaint about a formula, or null if it typesets cleanly. */
export function katexError(latex: string, displayMode = false): string | null {
  try {
    katex.renderToString(latex, { throwOnError: true, displayMode, strict: "ignore" });
    return null;
  } catch (err) {
    return (err as Error).message.replace(/^KaTeX parse error: /, "").slice(0, 160);
  }
}

/** Every $…$ / $$…$$ formula inside a markdown string that KaTeX cannot render. */
export function mathErrorsInMarkdown(markdown: string): string[] {
  const errors: string[] = [];
  for (const match of markdown.matchAll(mathPattern)) {
    const display = match[1] !== undefined;
    const error = katexError((match[1] ?? match[2]).trim(), display);
    if (error)
      errors.push(
        `${display ? "$$" : "$"}${(match[1] ?? match[2]).trim().slice(0, 60)}… → ${error}`,
      );
  }
  return errors;
}

/**
 * Deterministic check (SPEC §6.3): every formula in the lesson must typeset.
 * Returns "path: problem" lines in the same style as schema problems, for the repair prompt.
 */
export function findMathErrors(lesson: Lesson): string[] {
  const problems: string[] = [];
  const check = (path: string, text: string) => {
    for (const e of mathErrorsInMarkdown(text))
      problems.push(`${path}: maths does not render (${e})`);
  };

  check("hook", lesson.hook);
  lesson.prerequisites.forEach((p, i) => check(`prerequisites.${i}.oneLiner`, p.oneLiner));
  lesson.sections.forEach((s, i) => check(`sections.${i}.body`, s.body));
  lesson.analogies.forEach((a, i) => {
    check(`analogies.${i}.analogy`, a.analogy);
    check(`analogies.${i}.whereItBreaks`, a.whereItBreaks);
  });
  lesson.workedExamples.forEach((w, i) => {
    check(`workedExamples.${i}.problem`, w.problem);
    w.steps.forEach((step, j) => check(`workedExamples.${i}.steps.${j}`, step));
    check(`workedExamples.${i}.answer`, w.answer);
  });
  lesson.misconceptions.forEach((m, i) => {
    check(`misconceptions.${i}.wrong`, m.wrong);
    check(`misconceptions.${i}.right`, m.right);
    check(`misconceptions.${i}.why`, m.why);
  });
  lesson.quiz.forEach((q, i) => {
    check(`quiz.${i}.question`, q.question);
    q.options?.forEach((o, j) => check(`quiz.${i}.options.${j}`, o));
    check(`quiz.${i}.answer`, q.answer);
    check(`quiz.${i}.explanation`, q.explanation);
  });
  lesson.revisionSheet.formulas.forEach((f, i) => {
    const error = katexError(f, true);
    if (error) problems.push(`revisionSheet.formulas.${i}: maths does not render (${error})`);
  });
  lesson.revisionSheet.keyPoints.forEach((k, i) => check(`revisionSheet.keyPoints.${i}`, k));
  return problems;
}
