import { describe, expect, it } from "vitest";
import {
  balancedPda,
  boxWidth,
  cocomo,
  cyclomatic,
  DFAS,
  entropy,
  functionPoints,
  evalLogic,
  gradientDescent,
  gridSearch,
  informationGain,
  kMeans,
  leastSquares,
  lex,
  nCr,
  nPr,
  parseHtml,
  runDfa,
  statusClass,
  threeAddressCode,
  tmIncrement,
  truthTable,
  unionSize,
} from "@/visuals/wave2/theoryModels";

describe("automata", () => {
  it("runs DFAs", () => {
    expect(runDfa(DFAS["even-zeros"], "1001").accepted).toBe(true);
    expect(runDfa(DFAS["ends-01"], "1101").accepted).toBe(true);
    expect(runDfa(DFAS["ends-01"], "110").accepted).toBe(false);
    expect(runDfa(DFAS["div-by-3"], "110").accepted).toBe(true); // 6
    expect(runDfa(DFAS["div-by-3"], "111").accepted).toBe(false); // 7
  });
  it("a Turing machine increments binary numbers", () => {
    expect(tmIncrement("1011").result).toBe("1100");
    expect(tmIncrement("111").result).toBe("1000");
  });
  it("a PDA accepts balanced brackets only", () => {
    expect(balancedPda("([]{})").accepted).toBe(true);
    expect(balancedPda("([)]").accepted).toBe(false);
    expect(balancedPda("((").accepted).toBe(false);
  });
});

describe("compilers", () => {
  it("lexes keywords, identifiers, numbers and operators", () => {
    expect(lex("int x = 42;").map((t) => t.kind)).toEqual([
      "keyword",
      "identifier",
      "operator",
      "number",
      "punctuation",
    ]);
    expect(lex("a<=b").map((t) => t.text)).toEqual(["a", "<=", "b"]);
  });
  it("generates three-address code with precedence", () => {
    expect(threeAddressCode("a = b + c * d")).toEqual(["t1 = c * d", "t2 = b + t1", "a = t2"]);
    expect(threeAddressCode("x = (a + b) * c")).toEqual(["t1 = a + b", "t2 = t1 * c", "x = t2"]);
  });
});

describe("logic and counting", () => {
  it("evaluates formulas and finds tautologies", () => {
    expect(evalLogic("p -> q", { p: true, q: false })).toBe(false);
    expect(truthTable("p | !p").tautology).toBe(true);
    expect(truthTable("p & !p").contradiction).toBe(true);
    expect(truthTable("(p -> q) <-> (!q -> !p)").tautology).toBe(true);
    expect(truthTable("p & q").rows).toHaveLength(4);
  });
  it("counts", () => {
    expect(nPr(5, 2)).toBe(20);
    expect(nCr(5, 2)).toBe(10);
    expect(unionSize(10, 8, 6, 3, 2, 2, 1)).toBe(18);
  });
});

describe("software engineering and web", () => {
  it("COCOMO and cyclomatic complexity", () => {
    expect(cocomo(32, "organic").effort).toBeCloseTo(91.3, 0);
    expect(cyclomatic(9, 7)).toBe(4);
    const fp = functionPoints(
      { inputs: 3, outputs: 2, inquiries: 1, internalFiles: 1, externalFiles: 0 },
      35,
    );
    expect(fp.ufp).toBe(36);
    expect(fp.fp).toBeCloseTo(36);
  });
  it("HTTP status classes, DOM trees and box sizes", () => {
    expect(statusClass(404)).toBe("Client error");
    const dom = parseHtml("<ul><li>One</li><li>Two</li></ul>");
    expect(dom.children[0].tag).toBe("ul");
    expect(dom.children[0].children).toHaveLength(2);
    expect(boxWidth(200, 10, 2, 5)).toEqual({ borderBox: 224, total: 234 });
  });
});

describe("AI and ML", () => {
  const pts = [
    { x: 0, y: 1 },
    { x: 1, y: 3 },
    { x: 2, y: 5 },
    { x: 3, y: 7 },
  ];
  it("gradient descent approaches the least-squares line", () => {
    const ls = leastSquares(pts);
    expect(ls.w).toBeCloseTo(2);
    expect(ls.b).toBeCloseTo(1);
    const end = gradientDescent(pts, 0.05, 2000).at(-1)!;
    expect(end.w).toBeCloseTo(2, 2);
    expect(end.cost).toBeLessThan(1e-4);
  });
  it("k-means separates two clusters", () => {
    const p = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 10, y: 9 },
      { x: 9, y: 10 },
    ];
    const last = kMeans(p, 2).at(-1)!;
    expect(new Set(last.assign.slice(0, 1).concat(last.assign[2], last.assign[3])).size).toBe(1);
    expect(last.assign[0]).not.toBe(last.assign[1]);
  });
  it("entropy and information gain", () => {
    expect(entropy([5, 5])).toBeCloseTo(1);
    expect(entropy([10, 0])).toBe(0);
    expect(
      informationGain(
        [9, 5],
        [
          [6, 2],
          [3, 3],
        ],
      ),
    ).toBeCloseTo(0.048, 3);
  });
  it("A* explores fewer cells than breadth-first and finds the same shortest path", () => {
    const grid = ["S....", ".###.", "....G"];
    const a = gridSearch(grid, true);
    const b = gridSearch(grid, false);
    expect(a.length).toBe(6);
    expect(b.length).toBe(6);
    expect(a.visited.length).toBeLessThanOrEqual(b.visited.length);
  });
});
