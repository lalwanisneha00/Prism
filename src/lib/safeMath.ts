import { all, create, type FunctionNode, type MathNode, type SymbolNode } from "mathjs";
import { parseFormula } from "@/visuals/expression";
import { simpson } from "@/visuals/mathTools";

/*
 * A locked-down copy of mathjs (SPEC §6.1 rule 7, §4.1 formula explorer). Expressions written
 * by the AI may only calculate: no defining functions, importing code or creating units.
 * Like a calculator with the programming keys taped over.
 */

const math = create(all);

/** A single-variable function given as text, using our own safe parser (never eval). */
function fn(expr: unknown, variable: unknown) {
  if (typeof expr !== "string" || typeof variable !== "string" || !/^[a-z]$/.test(variable)) {
    throw new Error('use nintegrate("f(x)", "x", a, b) with a quoted expression');
  }
  const f = parseFormula(expr, [variable]);
  return (v: number) => f({ [variable]: v });
}

math.import(
  {
    /** ∫ f dx from a to b, numerically. */
    nintegrate: (expr: unknown, variable: unknown, a: number, b: number) =>
      simpson(fn(expr, variable), Number(a), Number(b), 4000),
    /** f'(x0), numerically. */
    nderivative: (expr: unknown, variable: unknown, x0: number) => {
      const f = fn(expr, variable);
      const h = 1e-5;
      return (f(Number(x0) + h) - f(Number(x0) - h)) / (2 * h);
    },
  },
  { override: false },
);

// Keep private handles to the evaluator and parser, then disable them (and everything else
// risky) inside expressions, as the mathjs security guide recommends.
const evaluateExpression = math.evaluate.bind(math);
const parseExpression = math.parse.bind(math);
const disabled = (name: string) => () => {
  throw new Error(`function ${name} is not allowed`);
};
math.import(
  Object.fromEntries(
    [
      "import",
      "createUnit",
      "evaluate",
      "parse",
      "simplify",
      "derivative",
      "resolve",
      "compile",
    ].map((name) => [name, disabled(name)]),
  ),
  { override: true },
);

/** Evaluates a calculation to a plain number, or throws a readable error. */
export function evaluateCheck(expression: string): number {
  if (expression.length > 300) throw new Error("expression is too long");
  if (/[=;]|\bfunction\b|=>/.test(expression)) throw new Error("only a calculation is allowed");
  const value: unknown = evaluateExpression(expression);
  const n = typeof value === "number" ? value : Number(math.number(value as never));
  if (!Number.isFinite(n)) throw new Error("the expression did not give a finite number");
  return n;
}

/** Functions a formula-explorer formula may use. */
const FORMULA_FUNCTIONS = new Set(
  "sqrt cbrt exp log log10 log2 sin cos tan asin acos atan sinh cosh tanh abs pow min max floor ceil round nthRoot".split(
    " ",
  ),
);
const FORMULA_CONSTANTS = new Set(["pi", "e"]);
const ALLOWED_NODES = new Set([
  "ConstantNode",
  "SymbolNode",
  "OperatorNode",
  "ParenthesisNode",
  "FunctionNode",
]);

/** Why a formula can't be used with these variables, or null if it is a safe calculation. */
export function formulaProblem(formula: string, variables: string[]): string | null {
  if (formula.length > 200) return "formula is too long";
  let node: MathNode;
  try {
    node = parseExpression(formula);
  } catch (err) {
    return `formula does not parse (${(err as Error).message})`;
  }
  const functionNames = new Set<string>();
  for (const n of node.filter(() => true)) {
    if (!ALLOWED_NODES.has(n.type)) return `formula may only calculate (found ${n.type})`;
    if (n.type === "FunctionNode") {
      const name = ((n as FunctionNode).fn as SymbolNode).name;
      if (!FORMULA_FUNCTIONS.has(name)) return `function "${name}" is not allowed`;
      functionNames.add(name);
    }
  }
  for (const n of node.filter((m) => m.type === "SymbolNode")) {
    const name = (n as SymbolNode).name;
    if (functionNames.has(name) || FORMULA_CONSTANTS.has(name) || variables.includes(name))
      continue;
    return `"${name}" is not one of the variables (${variables.join(", ")})`;
  }
  return null;
}

/**
 * Our formulas use the textbook names ln (natural log) and log (base 10); mathjs calls them
 * log and log10. Rewrite before mathjs sees the formula.
 */
export function toMathjsNames(formula: string): string {
  return formula.replace(/\blog\s*\(/g, "log10(").replace(/\bln\s*\(/g, "log(");
}

/** A checked formula as a fast function of its variables (NaN when undefined there). */
export function compileFormula(
  formula: string,
  variables: string[],
): (scope: Record<string, number>) => number {
  const problem = formulaProblem(formula, variables);
  if (problem) throw new Error(problem);
  const code = parseExpression(formula).compile();
  return (scope) => {
    try {
      const value: unknown = code.evaluate({ ...scope });
      return typeof value === "number" ? value : NaN;
    } catch {
      return NaN;
    }
  };
}
