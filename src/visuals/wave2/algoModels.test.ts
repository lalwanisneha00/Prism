import { describe, expect, it } from "vitest";
import {
  bstFrom,
  bstSearchPath,
  dijkstra,
  evalPostfix,
  hashInsertAll,
  heapExtract,
  heapInsert,
  height,
  knapsack,
  kruskal,
  layoutTree,
  pathTo,
  shuntingYard,
  traversal,
  traverse,
  type Graph,
} from "@/visuals/wave2/algoModels";

describe("stacks and postfix", () => {
  it("converts infix to postfix with precedence and brackets", () => {
    expect(shuntingYard("3+4*2").at(-1)!.output).toEqual(["3", "4", "2", "*", "+"]);
    expect(shuntingYard("(3+4)*2").at(-1)!.output).toEqual(["3", "4", "+", "2", "*"]);
    expect(shuntingYard("2^3^2").at(-1)!.output).toEqual(["2", "3", "2", "^", "^"]);
  });
  it("evaluates postfix with a stack", () => {
    expect(evalPostfix(["3", "4", "2", "*", "+"]).value).toBe(11);
  });
});

describe("trees and heaps", () => {
  const t = bstFrom([50, 30, 70, 20, 40, 60, 80]);
  it("gives the three traversal orders, in-order being sorted", () => {
    expect(traverse(t, "in")).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expect(traverse(t, "pre")).toEqual([50, 30, 20, 40, 70, 60, 80]);
    expect(traverse(t, "post")).toEqual([20, 40, 30, 60, 80, 70, 50]);
    expect(height(t)).toBe(3);
    expect(bstSearchPath(t, 60)).toEqual([50, 70, 60]);
    expect(layoutTree(t)).toHaveLength(7);
  });
  it("keeps the smallest element at the root of a min-heap", () => {
    let h: number[] = [];
    for (const v of [5, 3, 8, 1]) h = heapInsert(h, v).at(-1)!;
    expect(h[0]).toBe(1);
    const { min, states } = heapExtract(h);
    expect(min).toBe(1);
    expect(states.at(-1)![0]).toBe(3);
  });
});

describe("hashing", () => {
  it("resolves collisions by probing or chaining", () => {
    const lin = hashInsertAll([10, 20, 30], 10, "linear");
    expect(lin.table!.slice(0, 3)).toEqual([10, 20, 30]);
    expect(lin.log[2].probes).toBe(3);
    expect(hashInsertAll([10, 20], 10, "chaining").buckets![0]).toEqual([10, 20]);
  });
});

describe("graphs", () => {
  const g: Graph = {
    nodes: ["A", "B", "C", "D", "E"],
    edges: [
      { a: "A", b: "B", w: 4 },
      { a: "A", b: "C", w: 1 },
      { a: "C", b: "B", w: 2 },
      { a: "B", b: "D", w: 5 },
      { a: "C", b: "D", w: 8 },
      { a: "D", b: "E", w: 3 },
    ],
  };
  it("visits breadth-first and depth-first", () => {
    expect(traversal(g, "A", "bfs").order).toEqual(["A", "B", "C", "D", "E"]);
    expect(traversal(g, "A", "dfs").order).toEqual(["A", "B", "C", "D", "E"]);
  });
  it("finds shortest paths and a minimum spanning tree", () => {
    const d = dijkstra(g, "A");
    expect(d.dist).toEqual({ A: 0, B: 3, C: 1, D: 8, E: 11 });
    expect(pathTo(d.prev, "D")).toEqual(["A", "C", "B", "D"]);
    expect(kruskal(g).total).toBe(1 + 2 + 3 + 5);
  });
});

describe("dynamic programming", () => {
  it("solves 0/1 knapsack and recovers the chosen items", () => {
    const r = knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7);
    expect(r.value).toBe(9);
    expect(r.chosen).toEqual([1, 2]);
  });
});
