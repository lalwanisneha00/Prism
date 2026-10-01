export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "prism-theme";

/** A saved choice wins; otherwise follow the device's dark-mode setting. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

/**
 * Runs in <head> before the first paint so the page never flashes the wrong theme.
 * Mirrors resolveTheme(); keep the two in sync.
 */
export const themeScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
