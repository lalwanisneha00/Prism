import { describe, expect, it } from "vitest";
import {
  LOOK_STORAGE_KEY,
  THEME_STORAGE_KEY,
  resolveLook,
  resolveTheme,
  themeScript,
} from "@/lib/theme";

describe("resolveTheme", () => {
  it("uses a saved choice over the device setting", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the device when nothing is saved", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("ignores junk values in storage", () => {
    expect(resolveTheme("purple", false)).toBe("light");
  });
});

describe("themeScript", () => {
  it("reads the same storage key the toggle writes", () => {
    expect(themeScript(true)).toContain(THEME_STORAGE_KEY);
    expect(themeScript(true)).toContain(LOOK_STORAGE_KEY);
  });
  it("leaves the look alone when the redesign flag is off", () => {
    expect(themeScript(false)).not.toContain(LOOK_STORAGE_KEY);
  });
});

describe("resolveLook", () => {
  it("defaults to the new look and honours a saved Classic choice", () => {
    expect(resolveLook(null, true)).toBe("new");
    expect(resolveLook("classic", true)).toBe("classic");
    expect(resolveLook("junk", true)).toBe("new");
  });
  it("is Classic for everyone when the redesign flag is off", () => {
    expect(resolveLook("new", false)).toBe("classic");
  });
});
