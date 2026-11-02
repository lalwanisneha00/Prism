import { describe, expect, it } from "vitest";
import {
  LOOK_STORAGE_KEY,
  THEMES,
  THEME_IDS,
  THEME_STORAGE_KEY,
  TRIAL_STORAGE_KEY,
  modeFor,
  parseTrial,
  resolveTheme,
  resolveThemeId,
  storedThemeValue,
  themeScript,
} from "@/lib/theme";

describe("resolveTheme (light/dark)", () => {
  it("uses a saved choice over the device setting", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("follows the device when nothing is saved, and ignores junk", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("purple", false)).toBe("light");
  });
});

describe("resolveThemeId", () => {
  it("keeps what existing students saved before themes existed", () => {
    expect(resolveThemeId("new", true)).toBe("current");
    expect(resolveThemeId("classic", true)).toBe("classic");
  });
  it("reads the new themes and defaults to Current (Classic with the redesign flag off)", () => {
    expect(resolveThemeId("notebook", true)).toBe("notebook");
    expect(resolveThemeId(null, true)).toBe("current");
    expect(resolveThemeId("junk", true)).toBe("current");
    expect(resolveThemeId(null, false)).toBe("classic");
  });
  it("round-trips through storage", () => {
    for (const id of THEME_IDS) expect(resolveThemeId(storedThemeValue(id), true)).toBe(id);
  });
});

describe("theme data", () => {
  it("has 8 themes with names and vibe lines; only Current and Classic have both modes", () => {
    expect(THEMES.map((t) => t.id)).toEqual([...THEME_IDS]);
    for (const t of THEMES) expect(t.name && t.vibe).toBeTruthy();
    expect(THEMES.filter((t) => t.mode === "both").map((t) => t.id)).toEqual([
      "current",
      "classic",
    ]);
  });
  it("fixed-mode themes ignore the light/dark switch", () => {
    expect(modeFor("reading-room", "light")).toBe("dark");
    expect(modeFor("notebook", "dark")).toBe("light");
    expect(modeFor("current", "dark")).toBe("dark");
  });
});

describe("parseTrial", () => {
  it("accepts a valid trial and rejects anything else", () => {
    expect(parseTrial('{"theme":"index","previous":"current"}')).toEqual({
      theme: "index",
      previous: "current",
    });
    expect(parseTrial(null)).toBeNull();
    expect(parseTrial("{bad")).toBeNull();
    expect(parseTrial('{"theme":"pink","previous":"current"}')).toBeNull();
  });
});

/** Runs the pre-paint script against fake storage and returns the attributes it set. */
function runScript(
  local: Record<string, string>,
  opts: { dark?: boolean; session?: Record<string, string>; redesign?: boolean } = {},
) {
  const attrs: Record<string, string> = {};
  const store = (data: Record<string, string>) => ({ getItem: (k: string) => data[k] ?? null });
  const documentElement = {
    setAttribute: (k: string, v: string) => (attrs[k] = v),
    removeAttribute: (k: string) => delete attrs[k],
  };
  new Function(
    "localStorage",
    "sessionStorage",
    "document",
    "matchMedia",
    themeScript(opts.redesign ?? true),
  )(store(local), store(opts.session ?? {}), { documentElement }, () => ({
    matches: opts.dark ?? false,
  }));
  return attrs;
}

describe("themeScript (before the first paint)", () => {
  it("shows an existing student's saved look and mode", () => {
    expect(runScript({ [LOOK_STORAGE_KEY]: "classic", [THEME_STORAGE_KEY]: "dark" })).toEqual({
      "data-theme": "classic",
      "data-mode": "dark",
    });
    expect(runScript({ [LOOK_STORAGE_KEY]: "new" }, { dark: true })).toMatchObject({
      "data-theme": "current",
      "data-mode": "dark",
    });
  });
  it("defaults like resolveThemeId", () => {
    expect(runScript({})["data-theme"]).toBe("current");
    expect(runScript({}, { redesign: false })["data-theme"]).toBe("classic");
  });
  it("forces a fixed-mode theme's own mode and locks the switch", () => {
    expect(runScript({ [LOOK_STORAGE_KEY]: "midnight", [THEME_STORAGE_KEY]: "light" })).toEqual({
      "data-theme": "midnight",
      "data-mode": "dark",
      "data-mode-locked": "",
    });
  });
  it("shows a theme on trial over the saved one", () => {
    const session = { [TRIAL_STORAGE_KEY]: '{"theme":"studio","previous":"current"}' };
    expect(runScript({ [LOOK_STORAGE_KEY]: "new" }, { session })["data-theme"]).toBe("studio");
  });
});
