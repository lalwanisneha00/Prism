import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, resolveTheme, themeScript } from "@/lib/theme";

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
    expect(themeScript).toContain(THEME_STORAGE_KEY);
  });
});
