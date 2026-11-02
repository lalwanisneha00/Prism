import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEMES } from "@/lib/theme";

/*
 * Contrast of every theme's colour tokens (WCAG 2.x AA): text 4.5:1, coloured marks 3:1.
 * Each theme is checked as the browser builds it: the light (or dark) base, then its own block.
 */

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = block('[data-mode="light"]');
const dark = { ...light, ...block('[data-mode="dark"]') };

const COLOUR_TOKENS = [
  "bg",
  "surface",
  "surface-2",
  "border",
  "fg",
  "muted",
  "primary",
  "primary-hover",
  "primary-fg",
  "primary-soft",
  "success",
  "warning",
  "danger",
];

const palettes: [string, Record<string, string>][] = [
  ["Prism (current) light", light],
  ["Prism (current) dark", dark],
  ["Classic light", { ...light, ...block('[data-theme="classic"][data-mode="light"]') }],
  ["Classic dark", { ...dark, ...block('[data-theme="classic"][data-mode="dark"]') }],
  ...THEMES.filter((t) => t.mode !== "both").map((t): [string, Record<string, string>] => [
    t.name,
    { ...(t.mode === "dark" ? dark : light), ...block(`[data-theme="${t.id}"]`) },
  ]),
];

describe("colour tokens", () => {
  it("covers all 8 themes (10 palettes: Prism and Classic have light and dark)", () => {
    expect(palettes).toHaveLength(10);
  });

  for (const t of THEMES.filter((x) => x.mode !== "both")) {
    it(`${t.name} defines every colour itself (so a preview never borrows the page's)`, () => {
      const own = block(`[data-theme="${t.id}"]`);
      for (const k of COLOUR_TOKENS) expect(own[k], k).toBeDefined();
    });
  }

  for (const [name, t] of palettes) {
    describe(name, () => {
      it("body text, muted text and links are readable on every surface", () => {
        for (const bg of ["bg", "surface", "surface-2"]) {
          expect(contrast(t.fg, t[bg]), `fg on ${bg}`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(t.muted, t[bg]), `muted on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(t.primary, t.bg), "primary on bg").toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.primary, t.surface), "primary on surface").toBeGreaterThanOrEqual(4.5);
        expect(contrast(t["primary-fg"], t.primary), "button text").toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(t["primary-fg"], t["primary-hover"]),
          "button hover",
        ).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.primary, t["primary-soft"]), "primary on soft").toBeGreaterThanOrEqual(
          4.5,
        );
      });
      it("status colours are readable as text on cards", () => {
        for (const s of ["success", "warning", "danger"]) {
          expect(contrast(t[s], t.surface), s).toBeGreaterThanOrEqual(4.5);
        }
      });
      it("each level colour stands out from the page (3:1) and from the others", () => {
        const levels = Object.entries(t).filter(([k]) => k.startsWith("level-"));
        expect(levels).toHaveLength(6);
        for (const [k, v] of levels) expect(contrast(v, t.bg), k).toBeGreaterThanOrEqual(3);
        // No two level colours may be close in lightness AND hue: check pairwise distance in RGB.
        for (let i = 0; i < levels.length; i++) {
          for (let j = i + 1; j < levels.length; j++) {
            const a = Number.parseInt(levels[i][1].slice(1), 16);
            const b = Number.parseInt(levels[j][1].slice(1), 16);
            const d = Math.hypot(
              ((a >> 16) & 255) - ((b >> 16) & 255),
              ((a >> 8) & 255) - ((b >> 8) & 255),
              (a & 255) - (b & 255),
            );
            expect(d, `${levels[i][0]} vs ${levels[j][0]}`).toBeGreaterThan(50);
          }
        }
      });
    });
  }
});
