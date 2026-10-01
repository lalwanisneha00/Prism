/*
 * A tiny, safe maths parser for graphs. It understands numbers, x, + - * / ^, brackets,
 * pi, e and common functions. Nothing is ever passed to eval(), so an AI-written
 * expression can only ever describe a curve, never run code.
 */

export type Fn = (x: number) => number;

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
    } else if (/[a-zA-Z]/.test(ch)) {
      const m = /^[a-zA-Z]+/.exec(src.slice(i))!;
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

/** Parses an expression in x into a function. Throws a readable error if it can't. */
export function parseExpression(src: string): Fn {
  if (src.length > 200) throw new Error("expression is too long");
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.kind === "op" && peek()!.value === v;
  const expectOp = (v: string) => {
    if (!isOp(v)) throw new Error(`expected "${v}"`);
    pos++;
  };

  function expression(): Fn {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[pos++].value;
      const l = left;
      const r = term();
      left = op === "+" ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
    }
    return left;
  }

  // Starts a factor that can follow another with no "*" (implicit multiplication: 2x, 3sin(x), 2(x+1)).
  const startsFactor = () => {
    const t = peek();
    return t && (t.kind === "num" || t.kind === "id" || (t.kind === "op" && t.value === "("));
  };

  function term(): Fn {
    let left = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = tokens[pos++].value;
        const l = left;
        const r = unary();
        left = op === "*" ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
      } else if (startsFactor()) {
        const l = left;
        const r = power();
        left = (x) => l(x) * r(x);
      } else {
        return left;
      }
    }
  }

  function unary(): Fn {
    if (isOp("-")) {
      pos++;
      const inner = unary();
      return (x) => -inner(x);
    }
    if (isOp("+")) {
      pos++;
      return unary();
    }
    return power();
  }

  function power(): Fn {
    const base = primary();
    if (isOp("^")) {
      pos++;
      const exponent = unary(); // right-associative: 2^3^2 = 2^9
      return (x) => Math.pow(base(x), exponent(x));
    }
    return base;
  }

  function primary(): Fn {
    const t = tokens[pos++];
    if (!t) throw new Error("expression ended too early");
    if (t.kind === "num") return () => t.value;
    if (t.kind === "op" && t.value === "(") {
      const inner = expression();
      expectOp(")");
      return inner;
    }
    if (t.kind === "id") {
      if (t.value === "x") return (x) => x;
      if (Object.hasOwn(constants, t.value)) return () => constants[t.value];
      const fn = Object.hasOwn(functions, t.value) ? functions[t.value] : undefined;
      if (fn) {
        expectOp("(");
        const arg = expression();
        expectOp(")");
        return (x) => fn(arg(x));
      }
      throw new Error(`unknown name "${t.value}"`);
    }
    throw new Error(`unexpected "${t.value}"`);
  }

  const fn = expression();
  if (pos < tokens.length) throw new Error(`unexpected "${tokens[pos].value}"`);
  return fn;
}

/** True if the expression parses; used to reject bad plots before a student sees them. */
export function isValidExpression(src: string): boolean {
  try {
    parseExpression(src);
    return true;
  } catch {
    return false;
  }
}
