/*
 * Code samples in lessons (V3 · Step 5, SPEC §12.3 rule 8): every sample is run (or marked
 * "not executed") before a student relies on it, and the output a lesson claims is compared
 * with the output the code really prints. This file finds the samples and their claimed
 * output; the browser runs them (JavaScript in a sandboxed worker, Python in Pyodide).
 */

export type CodeLanguage = "javascript" | "python" | "c" | "other";

export type CodeSample = {
  language: CodeLanguage;
  code: string;
  /** The output the lesson says the code prints, when it shows one. */
  expected?: string;
};

const ALIASES: Record<string, CodeLanguage> = {
  js: "javascript",
  javascript: "javascript",
  node: "javascript",
  py: "python",
  python: "python",
  python3: "python",
  c: "c",
};

export function languageOf(tag: string): CodeLanguage {
  return ALIASES[tag.trim().toLowerCase()] ?? "other";
}

/**
 * The code samples in a piece of Markdown. A sample's claimed output is a fenced block tagged
 * "output" (or "text"/"console"), or one introduced by a line like "Output:", right after it.
 */
export function findCodeSamples(markdown: string): CodeSample[] {
  const blocks = [...markdown.matchAll(/```([\w+-]*)[^\n]*\n([\s\S]*?)```/g)].map((m) => ({
    tag: m[1],
    body: m[2].replace(/\n$/, ""),
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
  }));
  const samples: CodeSample[] = [];
  blocks.forEach((b, i) => {
    const language = languageOf(b.tag);
    if (language === "other" || /^(output|text|console)$/i.test(b.tag)) return;
    const next = blocks[i + 1];
    const between = next ? markdown.slice(b.end, next.start) : "";
    const isOutput =
      next &&
      (/^(output|text|console)$/i.test(next.tag) ||
        (next.tag === "" && /\boutput\b\s*:?\s*$/i.test(between.trim())));
    samples.push({
      language,
      code: b.body,
      ...(isOutput && between.trim().length < 80 ? { expected: next.body } : {}),
    });
  });
  return samples;
}

/** Outputs compared without trailing spaces or blank lines at the ends. */
export function sameOutput(actual: string, expected: string): boolean {
  const clean = (s: string) =>
    s
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n")
      .trim();
  return clean(actual) === clean(expected);
}
