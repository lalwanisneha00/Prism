import { describe, expect, it } from "vitest";
import { isValidExpression, parseExpression } from "@/visuals/expression";

const at = (src: string, x: number) => parseExpression(src)(x);

describe("parseExpression", () => {
  it("handles arithmetic with the usual precedence", () => {
    expect(at("1 + 2 * 3", 0)).toBe(7);
    expect(at("(1 + 2) * 3", 0)).toBe(9);
    expect(at("2^3^2", 0)).toBe(512); // right-associative
    expect(at("-x^2", 3)).toBe(-9); // power before minus
    expect(at("10/4/5", 0)).toBe(0.5);
  });

  it("knows x, constants and functions", () => {
    expect(at("1/x^2", 2)).toBe(0.25);
    expect(at("cos(x)", 0)).toBe(1);
    expect(at("sin(pi/2)", 0)).toBe(1);
    expect(at("exp(-x)", 0)).toBe(1);
    expect(at("ln(e)", 0)).toBe(1);
    expect(at("log(1000)", 0)).toBeCloseTo(3, 12);
    expect(at("sqrt(abs(x))", -16)).toBe(4);
  });

  it("supports implicit multiplication and scientific notation", () => {
    expect(at("2x", 3)).toBe(6);
    expect(at("2pi", 0)).toBeCloseTo(2 * Math.PI, 12);
    expect(at("3sin(x)", Math.PI / 2)).toBeCloseTo(3, 12);
    expect(at("1.5e3 * x", 2)).toBe(3000);
  });

  it("rejects anything that is not maths", () => {
    for (const bad of ["alert(1)", "x;process.exit()", "window", "1 +", "(x", "2 ** 3", "x$"]) {
      expect(isValidExpression(bad)).toBe(false);
    }
  });

  it("never evaluates code", () => {
    expect(() => parseExpression("constructor")).toThrow(/unknown name/);
  });
});
