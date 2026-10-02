/*
 * A tiny, safe maths parser for graphs. It understands numbers, variables (x by default),
 * + - * / ^, brackets, pi, e and common functions. Nothing is ever passed to eval(), so an
 * AI-written expression can only ever describe a curve, never run code.
 */

export type Fn = (x: number) => number;
/** Values for the variables of a formula, e.g. { x: 1, y: 2 }. */
export type Scope = Record<string, number>;
export type Formula = (scope: Scope) => number;

const functions: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
};
const constants: Record<string, number> = { pi: Math.PI, e: Math.E };

type Token =
  { kind: "num"; value: number } | { kind: "id"; value: string } | { kind: "op"; value: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new Error(`bad number at "${src.slice(i, i + 5)}"`);
      tokens.push({ kind: "num", value: Number(m[0]) });
      i += m[0].length;
    } else if (/[a-zA-Z_]/.test(ch)) {
      // Names may contain digits and underscores after the first letter: x, a1, c_0.
      const m = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(src.slice(i))!;
      tokens.push({ kind: "id", value: m[0].toLowerCase() });
      i += m[0].length;
    } else if ("+-*/^()".includes(ch)) {
      tokens.push({ kind: "op", value: ch });
      i++;
    } else {
      throw new Error(`unexpected character "${ch}"`);
    }
  }
  return tokens;
}

/**
 * Parses a formula in the given variables (e.g. ["x", "y"]). Throws a readable error if it
 * can't. Variables must be written apart: "x*y", not "xy".
 */
export function parseFormula(src: string, variables: readonly string[] = ["x"]): Formula {
  if (src.length > 200) throw new Error("expression is too long");
  for (const v of variables) {
    if (Object.hasOwn(functions, v) || Object.hasOwn(constants, v)) {
      throw new Error(`"${v}" can't be a variable name`);
    }
  }
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.kind === "op" && peek()!.value === v;
  const expectOp = (v: string) => {
    if (!isOp(v)) throw new Error(`expected "${v}"`);
    pos++;
  };

  function expression(): Formula {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[pos++].value;
      const l = left;
      const r = term();
      left = op === "+" ? (s) => l(s) + r(s) : (s) => l(s) - r(s);
    }
    return left;
  }

  // Starts a factor that can follow another with no "*" (implicit multiplication: 2x, 3sin(x), 2(x+1)).
  const startsFactor = () => {
    const t = peek();
    return t && (t.kind === "num" || t.kind === "id" || (t.kind === "op" && t.value === "("));
  };

  function term(): Formula {
    let left = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = tokens[pos++].value;
        const l = left;
        const r = unary();
        left = op === "*" ? (s) => l(s) * r(s) : (s) => l(s) / r(s);
      } else if (startsFactor()) {
        const l = left;
        const r = power();
        left = (s) => l(s) * r(s);
      } else {
        return left;
      }
    }
  }

  function unary(): Formula {
    if (isOp("-")) {
      pos++;
      const inner = unary();
      return (s) => -inner(s);
    }
    if (isOp("+")) {
      pos++;
      return unary();
    }
    return power();
  }

  function power(): Formula {
    const base = primary();
    if (isOp("^")) {
      pos++;
      const exponent = unary(); // right-associative: 2^3^2 = 2^9
      return (s) => Math.pow(base(s), exponent(s));
    }
    return base;
  }

  function primary(): Formula {
    const t = tokens[pos++];
    if (!t) throw new Error("expression ended too early");
    if (t.kind === "num") return () => t.value;
    if (t.kind === "op" && t.value === "(") {
      const inner = expression();
      expectOp(")");
      return inner;
    }
    if (t.kind === "id") {
      const name = t.value;
      if (variables.includes(name)) return (s) => s[name] ?? NaN;
      if (Object.hasOwn(constants, name)) return () => constants[name];
      const fn = Object.hasOwn(functions, name) ? functions[name] : undefined;
      if (fn) {
        expectOp("(");
        const arg = expression();
        expectOp(")");
        return (s) => fn(arg(s));
      }
      throw new Error(`unknown name "${name}"`);
    }
    throw new Error(`unexpected "${t.value}"`);
  }

  const formula = expression();
  if (pos < tokens.length) throw new Error(`unexpected "${tokens[pos].value}"`);
  return formula;
}

/** Parses an expression in x into a function. Throws a readable error if it can't. */
export function parseExpression(src: string): Fn {
  const formula = parseFormula(src, ["x"]);
  return (x) => formula({ x });
}

/** True if the expression parses; used to reject bad plots before a student sees them. */
export function isValidExpression(src: string, variables: readonly string[] = ["x"]): boolean {
  try {
    parseFormula(src, variables);
    return true;
  } catch {
    return false;
  }
}
