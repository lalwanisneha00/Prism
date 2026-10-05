export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "prism-theme";

/** A saved choice wins; otherwise follow the device's dark-mode setting. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

export const LOOK_STORAGE_KEY = "prism-look";
export type Look = "new" | "classic";

/** The saved look wins; the "redesign" feature flag decides the default (off = Classic for everyone). */
export function resolveLook(stored: string | null, redesignOn: boolean): Look {
  if (!redesignOn) return "classic";
  return stored === "classic" || stored === "new" ? stored : "new";
}

/**
 * Runs in <head> before the first paint so the page never flashes the wrong theme or look.
 * Mirrors resolveTheme() and resolveLook(); keep them in sync.
 */
export const themeScript = (redesignOn: boolean) =>
  `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);${
    redesignOn
      ? `var l=localStorage.getItem("${LOOK_STORAGE_KEY}");document.documentElement.setAttribute("data-look",l==="classic"?"classic":"new");`
      : ""
  }}catch(e){}})()`;
