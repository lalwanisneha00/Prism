/*
 * The app's themes (data) and how the choice is read before the first paint.
 *
 * Two attributes on <html> carry the choice:
 *   data-theme = which theme ("current", "notebook", …): fonts, corners, textures, colours
 *   data-mode  = light or dark. Current and Classic have both; every other theme has one fixed mode.
 *
 * Storage keeps the names it had before themes existed, so nobody's choice is lost:
 *   "prism-theme" = light/dark mode, "prism-look" = theme id ("new" is the old name of Current).
 */

export type Mode = "light" | "dark";
/** Kept for older imports: the light/dark choice. */
export type Theme = Mode;

export const THEME_IDS = [
  "current",
  "classic",
  "notebook",
  "reading-room",
  "drafting",
  "midnight",
  "index",
  "studio",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeInfo = {
  id: ThemeId;
  name: string;
  /** One line about how it feels. */
  vibe: string;
  /** "both" = follows the light/dark switch; otherwise the theme is always this mode. */
  mode: Mode | "both";
  /** Browser bar colour on phones. */
  barColor: string;
  /** Browser bar colour in dark mode (themes that have both modes). */
  barColorDark?: string;
};

export const THEMES: readonly ThemeInfo[] = [
  {
    id: "current",
    name: "Prism",
    vibe: "Paper and ink with the six level colours",
    mode: "both",
    barColor: "#f4efe4",
    barColorDark: "#14181f",
  },
  {
    id: "classic",
    name: "Classic",
    vibe: "The original violet Prism, bright and friendly",
    mode: "both",
    barColor: "#f8f7fc",
    barColorDark: "#0f0d1a",
  },
  {
    id: "notebook",
    name: "Notebook",
    vibe: "Warm ruled paper for daytime study",
    mode: "light",
    barColor: "#f7f3ea",
  },
  {
    id: "reading-room",
    name: "Reading Room",
    vibe: "A quiet library under a brass lamp",
    mode: "dark",
    barColor: "#1a1f1a",
  },
  {
    id: "drafting",
    name: "Drafting Table",
    vibe: "Blueprint grid for engineers",
    mode: "light",
    barColor: "#eef2f4",
  },
  {
    id: "midnight",
    name: "Midnight Desk",
    vibe: "Low blue light for 2am revision",
    mode: "dark",
    barColor: "#191715",
  },
  {
    id: "index",
    name: "Index",
    vibe: "Bold black and white, like a printed index",
    mode: "light",
    barColor: "#ffffff",
  },
  {
    id: "studio",
    name: "Studio",
    vibe: "Soft clay and sand, calm and cosy",
    mode: "light",
    barColor: "#f1ebe2",
  },
];

export const THEME_STORAGE_KEY = "prism-theme"; // light/dark
export const LOOK_STORAGE_KEY = "prism-look"; // theme id
/** "Try it on the whole app": the theme on trial and the one to go back to (this tab only). */
export const TRIAL_STORAGE_KEY = "prism-theme-trial";

export function themeInfo(id: ThemeId): ThemeInfo {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

/** A saved light/dark choice wins; otherwise follow the device's dark-mode setting. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Mode {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

/**
 * Which theme to show. A saved choice wins ("new" is how Current was stored before); the
 * "redesign" feature flag decides the default (off = Classic, as before).
 */
export function resolveThemeId(stored: string | null, redesignOn: boolean): ThemeId {
  if (stored === "new") return "current";
  if (isThemeId(stored)) return stored;
  return redesignOn ? "current" : "classic";
}

/** The value written to storage ("current" keeps its old stored name, so older tabs agree). */
export function storedThemeValue(id: ThemeId): string {
  return id === "current" ? "new" : id;
}

/** The mode a theme shows in: its fixed mode, or the student's light/dark choice. */
export function modeFor(id: ThemeId, chosen: Mode): Mode {
  const m = themeInfo(id).mode;
  return m === "both" ? chosen : m;
}

/** A trial ("Try it on the whole app") read back from storage, or null if absent or broken. */
export function parseTrial(raw: string | null): { theme: ThemeId; previous: ThemeId } | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const { theme, previous } = v as Record<string, unknown>;
    return isThemeId(theme) && isThemeId(previous) ? { theme, previous } : null;
  } catch {
    return null;
  }
}

/**
 * Runs in <head> before the first paint so the page never flashes the wrong theme.
 * Mirrors resolveTheme(), resolveThemeId(), modeFor() and parseTrial(); keep them in sync
 * (theme.test.ts runs this script against the same cases).
 */
export const themeScript = (redesignOn: boolean) => {
  const fixed = Object.fromEntries(
    THEMES.filter((t) => t.mode !== "both").map((t) => [t.id, t.mode]),
  );
  return `(function(){try{var d=document.documentElement,ids=${JSON.stringify(THEME_IDS)},fx=${JSON.stringify(fixed)};var s=localStorage.getItem("${THEME_STORAGE_KEY}");var m=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var l=localStorage.getItem("${LOOK_STORAGE_KEY}");if(l==="new")l="current";if(ids.indexOf(l)<0)l=${JSON.stringify(redesignOn ? "current" : "classic")};try{var tr=JSON.parse(sessionStorage.getItem("${TRIAL_STORAGE_KEY}")||"null");if(tr&&ids.indexOf(tr.theme)>=0)l=tr.theme}catch(e){}if(fx[l]){m=fx[l];d.setAttribute("data-mode-locked","")}else d.removeAttribute("data-mode-locked");d.setAttribute("data-theme",l);d.setAttribute("data-mode",m)}catch(e){}})()`;
};
