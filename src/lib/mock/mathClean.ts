import katex from "katex";

/*
 * Tidying the AI's maths before anyone sees it (mock test redesign). The AI is asked for LaTeX
 * inside $...$, but replies still arrive with doubled backslashes from JSON ("\\frac"), LaTeX
 * outside the dollar signs ("\sqrt{-1}"), or stray escapes ("\n" as two characters). Like a
 * proof-reader with a red pen: fix what can be fixed, flag what can't, and never let raw code
 * reach the page. Pure; KaTeX is used only to test whether each piece of maths renders.
 */

/** A piece of text: plain words, or maths (inline $...$ or display $$...$$). */
export type Piece = { math: false; text: string } | { math: true; text: string; display: boolean };

/** Splits text at $$...$$, $...$, \[...\] and \(...\) (an unclosed $ is treated as text). */
export function splitMath(text: string): Piece[] {
  const out: Piece[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ math: false, text: text.slice(last, m.index) });
    const display = m[1] !== undefined || m[2] !== undefined;
    out.push({ math: true, display, text: (m[1] ?? m[2] ?? m[3] ?? m[4]).trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ math: false, text: text.slice(last) });
  return out;
}

const join = (pieces: readonly Piece[]) =>
  pieces
    .filter((p) => !p.math || p.text.trim())
    .map((p) => (p.math ? (p.display ? `$$${p.text}$$` : `$${p.text}$`) : p.text))
    .join("");

/** LaTeX commands that start with n or t, so "\nabla" isn't read as a typed-out newline. */
const N_COMMANDS = /^(nabla|neq|ne|nu|not|notin|neg|ni|newline|nexists|nleq|ngeq|nmid)(?![a-zA-Z])/;
const T_COMMANDS =
  /^(theta|tau|times|text\w*|tan|tanh|to|top|triangle\w*|tilde|tfrac|therefore|tbinom)(?![a-zA-Z])/;

/** A typed-out "\n" or "\t" (two characters) as a real line break or space, keeping \nabla etc. */
function unescapeTyped(text: string): string {
  return text.replace(/\\([nt])(?=([a-zA-Z]*))/g, (whole, letter: string, word: string) => {
    if ((letter === "n" ? N_COMMANDS : T_COMMANDS).test(letter + word)) return whole;
    return letter === "n" ? "\n" : " ";
  });
}

/** A LaTeX command with its {…} or […] arguments (two levels of nesting), e.g. \frac{a}{b^{2}}. */
const LATEX_RUN =
  /[A-Za-z0-9.]*(?:\^|_)?\\[a-zA-Z]+(?:\s*(?:\{(?:[^{}]|\{[^{}]*\})*\}|\[[^\]]*\]))*(?:[\^_](?:\{(?:[^{}]|\{[^{}]*\})*\}|[A-Za-z0-9]))*/g;

/** Plain-text parts: escapes undone, LaTeX commands wrapped in $...$, stray backslashes gone. */
function cleanPlain(text: string): string {
  return (
    // "\n" and "\t" typed out as two characters (but not \nabla, \theta…).
    unescapeTyped(text)
      .replace(/\\(["'`])/g, "$1")
      .replace(LATEX_RUN, (run) => `$${run.trim()}$`)
      // A backslash left over that starts nothing.
      .replace(/\\(?![a-zA-Z$])/g, "")
  );
}

/** Maths parts: doubled backslashes from JSON made single (a "\\" line break is kept). */
function cleanMath(latex: string): string {
  return latex.replace(/\\\\(?=[a-zA-Z])/g, "\\").trim();
}

/**
 * The AI's text with its maths in one consistent form: every LaTeX command inside $...$ or
 * $$...$$, single backslashes, no stray escape characters.
 */
export function cleanAiText(text: string): string {
  // Doubled backslashes before a command mean JSON escaping went wrong: undo everywhere first.
  const single = text.replace(/\\\\(?=[a-zA-Z]{2,})/g, "\\");
  const pieces = splitMath(single).map((p): Piece =>
    p.math ? { ...p, text: cleanMath(p.text) } : { math: false, text: cleanPlain(p.text) },
  );
  // Wrapping commands may have created new $...$ pieces next to old ones: split once more.
  return join(splitMath(join(pieces)))
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Whether KaTeX can render this LaTeX. */
export function rendersOk(latex: string, display = false): boolean {
  try {
    katex.renderToString(latex, { throwOnError: true, displayMode: display, strict: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * What would show up wrong on the page: a backslash in plain text (raw LaTeX or a stray escape)
 * or maths that KaTeX can't render. Empty when the text is safe to show.
 */
export function displayProblems(text: string): string[] {
  const problems: string[] = [];
  for (const p of splitMath(text)) {
    if (!p.math && /\\/.test(p.text))
      problems.push(`raw code in text: "${p.text.trim().slice(0, 40)}"`);
    if (p.math && !rendersOk(p.text, p.display))
      problems.push(`maths that can't render: "${p.text.slice(0, 40)}"`);
  }
  return problems;
}

const SYMBOLS: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  varphi: "φ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Sigma: "Σ",
  Phi: "Φ",
  Omega: "Ω",
  Pi: "Π",
  infty: "∞",
  times: "×",
  cdot: "·",
  div: "÷",
  pm: "±",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  partial: "∂",
  nabla: "∇",
  int: "∫",
  sum: "Σ",
  prod: "Π",
  degree: "°",
  circ: "°",
  hbar: "ħ",
  in: "∈",
  cup: "∪",
  cap: "∩",
  forall: "∀",
  exists: "∃",
};

/** LaTeX turned into readable plain text, for maths KaTeX can't render (never raw code). */
export function readableMath(latex: string): string {
  let s = latex;
  for (let i = 0; i < 4; i++) {
    s = s
      .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, "$1√($2)")
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)")
      .replace(/\\(?:text|mathrm|mathbf|operatorname|vec|hat|bar)\s*\{([^{}]*)\}/g, "$1")
      .replace(/\^\{([^{}]*)\}/g, "^$1")
      .replace(/_\{([^{}]*)\}/g, "_$1");
  }
  return s
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => SYMBOLS[name] ?? name)
    .replace(/\\[,;:! ]/g, " ")
    .replace(/[{}\\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Text ready for the Markdown renderer: cleaned, and any maths KaTeX can't render replaced by
 * its readable form, so the page never shows broken code.
 */
export function safeMathText(text: string): string {
  return join(
    splitMath(cleanAiText(text)).map((p): Piece =>
      p.math && !rendersOk(p.text, p.display) ? { math: false, text: readableMath(p.text) } : p,
    ),
  );
}
