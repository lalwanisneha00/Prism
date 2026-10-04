/*
 * Turning lesson text (markdown with KaTeX maths) into short plain text for slides and PDFs.
 * Slides carry short lines; the full explanation goes in the speaker notes. Maths inside a
 * sentence becomes readable Unicode (ε₀, E², ∇·E); display formulas are drawn as pictures.
 */

const GREEK: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
};

const SYMBOLS: Record<string, string> = {
  nabla: "∇",
  partial: "∂",
  infty: "∞",
  cdot: " · ",
  times: " × ",
  pm: "±",
  mp: "∓",
  leq: "≤",
  le: "≤",
  geq: "≥",
  ge: "≥",
  neq: "≠",
  ne: "≠",
  approx: "≈",
  equiv: "≡",
  propto: "∝",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  Leftrightarrow: "⇔",
  int: "∫",
  oint: "∮",
  iint: "∬",
  iiint: "∭",
  sum: "Σ",
  prod: "Π",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  cup: "∪",
  cap: "∩",
  forall: "∀",
  exists: "∃",
  degree: "°",
  circ: "°",
  ldots: "…",
  cdots: "…",
  dots: "…",
  hbar: "ħ",
  ell: "ℓ",
  angle: "∠",
  perp: "⊥",
  parallel: "∥",
  quad: " ",
  qquad: "  ",
  ",": " ",
  ";": " ",
  "!": "",
  left: "",
  right: "",
};

const SUP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "−": "⁻",
  n: "ⁿ",
  i: "ⁱ",
};
const SUB: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  n: "ₙ",
  i: "ᵢ",
  x: "ₓ",
};

function script(text: string, map: Record<string, string>, mark: string): string {
  const mapped = [...text].map((c) => map[c]);
  return mapped.every(Boolean)
    ? mapped.join("")
    : `${mark}(${text})`.replace(/\(([^()]{1})\)$/, "$1");
}

/** Finds the matching closing brace for the "{" at `start`; returns its index (or -1). */
function closing(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

/** A readable one-line version of a LaTeX formula. Unknown commands lose the backslash. */
export function latexToPlain(latex: string): string {
  let s = ` ${latex} `;
  // \frac{a}{b}, \sqrt{x}, \vec{E}, \text{...} and friends: handled from the inside out.
  for (let guard = 0; guard < 200; guard++) {
    const m =
      /\\(frac|dfrac|tfrac|sqrt|vec|hat|bar|overline|dot|ddot|text|mathrm|mathbf|mathbb|operatorname|boldsymbol)\s*(\[[^\]]*\])?\s*\{/.exec(
        s,
      );
    if (!m) break;
    const open = m.index + m[0].length - 1;
    const end = closing(s, open);
    if (end < 0) break;
    const arg = s.slice(open + 1, end);
    let after = end + 1;
    let out: string;
    if (m[1] === "frac" || m[1] === "dfrac" || m[1] === "tfrac") {
      const second = s.slice(after).match(/^\s*\{/);
      const open2 = second ? after + second[0].length - 1 : -1;
      const end2 = open2 >= 0 ? closing(s, open2) : -1;
      if (end2 < 0) {
        out = arg;
      } else {
        const b = s.slice(open2 + 1, end2);
        after = end2 + 1;
        // A single symbol (with an optional sub- or superscript) needs no brackets.
        const simple = /^\\?[A-Za-z0-9.·]+(?:[_^]\{?[A-Za-z0-9+-]+\}?)?$/;
        const wrap = (t: string) => (simple.test(t.trim()) ? t.trim() : `(${t.trim()})`);
        out = `${wrap(arg)}/${wrap(b)}`;
      }
    } else if (m[1] === "sqrt") {
      out = `√(${arg})`;
    } else if (m[1] === "vec") {
      out = `${arg}⃗`;
    } else if (m[1] === "hat") {
      out = `${arg}̂`;
    } else if (m[1] === "bar" || m[1] === "overline") {
      out = `${arg}̄`;
    } else {
      out = arg;
    }
    s = s.slice(0, m.index) + out + s.slice(after);
  }
  s = s.replace(/\\([A-Za-z]+|[,;!])/g, (_, name: string) => GREEK[name] ?? SYMBOLS[name] ?? name);
  // Superscripts and subscripts: x^{2}, x^2, E_0, E_{ab}.
  s = s.replace(/\^\{([^{}]*)\}|\^([A-Za-z0-9+\-−])/g, (_, a?: string, b?: string) =>
    script((a ?? b ?? "").trim(), SUP, "^"),
  );
  s = s.replace(/_\{([^{}]*)\}|_([A-Za-z0-9+\-−])/g, (_, a?: string, b?: string) =>
    script((a ?? b ?? "").trim(), SUB, "_"),
  );
  return s
    .replace(/[{}]/g, "")
    .replace(/\\\\/g, "; ")
    .replace(/&/g, " ")
    .replace(/~/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Display formulas ($$…$$ blocks) found in markdown, as LaTeX. */
export function displayFormulas(markdown: string): string[] {
  const out: string[] = [];
  for (const m of markdown.matchAll(/\$\$([\s\S]+?)\$\$/g)) {
    const latex = m[1].trim();
    if (latex) out.push(latex);
  }
  return out;
}

/** Markdown → plain text: formulas inline as Unicode, display formulas removed, markup gone. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\$\$[\s\S]+?\$\$/g, " ")
    .replace(/\$([^$\n]+?)\$/g, (_, latex: string) => latexToPlain(latex))
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sentences of a text (keeps decimals and common abbreviations together). */
export function sentences(text: string): string[] {
  return text
    .replace(/\b(e\.g|i\.e|etc|vs|Fig|Eq|approx)\./gi, (m) => m.replace(".", "∙"))
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(“"'])/)
    .map((s) => s.replace(/∙/g, ".").trim())
    .filter((s) => s.length > 0);
}

/** Cuts text to at most `max` characters at a word boundary, adding "…" when it was cut. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, "")}…`;
}

/** The first `n` sentences, each clipped to `max` characters: the "short points" of a section. */
export function keyPoints(text: string, n: number, max = 110): string[] {
  const picked = sentences(text).filter((s) => s.length >= 12);
  return picked.slice(0, n).map((s) => clip(s, max));
}
