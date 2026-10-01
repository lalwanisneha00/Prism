/**
 * remark-math only treats $$…$$ as display maths when the $$ markers sit on their own
 * lines; "$$x$$" on one line becomes small inline maths. Lesson text (hand-written or AI)
 * often puts a display formula on a single line, so split those onto separate lines.
 */
export function normalizeDisplayMath(markdown: string): string {
  return markdown.replace(
    /^[ \t]*\$\$([^\n$]+?)\$\$[ \t]*$/gm,
    (_, latex: string) => `$$\n${latex.trim()}\n$$`,
  );
}
