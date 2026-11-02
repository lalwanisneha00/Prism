/*
 * Putting a theme on the page (browser only). The choice lives in localStorage (fast, read before
 * the first paint) and in the synced settings (so it follows the student to other devices).
 */
import { updateSettings } from "@/lib/storage/progress";
import {
  LOOK_STORAGE_KEY,
  THEME_STORAGE_KEY,
  TRIAL_STORAGE_KEY,
  modeFor,
  parseTrial,
  resolveTheme,
  resolveThemeId,
  storedThemeValue,
  themeInfo,
  type Mode,
  type ThemeId,
} from "@/lib/theme";
import { FLAGS } from "@/lib/flags";

/** Fired on window whenever the theme or mode on the page changes. */
export const THEME_EVENT = "prism-theme-change";

function read(key: string, session = false): string | null {
  try {
    return (session ? sessionStorage : localStorage).getItem(key);
  } catch {
    return null; // storage blocked (private mode)
  }
}
function write(key: string, value: string | null, session = false) {
  try {
    const s = session ? sessionStorage : localStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // Not saved, but the change still works for this visit.
  }
}

export function chosenMode(): Mode {
  return resolveTheme(read(THEME_STORAGE_KEY), matchMedia("(prefers-color-scheme: dark)").matches);
}

/** The theme the student has saved (ignores a trial in progress). */
export function savedThemeId(): ThemeId {
  return resolveThemeId(read(LOOK_STORAGE_KEY), FLAGS.redesign);
}

/** The theme on the page right now (a trial counts). */
export function activeThemeId(): ThemeId {
  return resolveThemeId(document.documentElement.getAttribute("data-theme"), FLAGS.redesign);
}

export function currentTrial() {
  return parseTrial(read(TRIAL_STORAGE_KEY, true));
}

/** Sets the attributes on <html> (nothing is saved). */
export function paintTheme(id: ThemeId, mode: Mode = chosenMode()) {
  const html = document.documentElement;
  html.setAttribute("data-theme", id);
  const shown = modeFor(id, mode);
  const info = themeInfo(id);
  html.setAttribute("data-mode", shown);
  html.toggleAttribute("data-mode-locked", info.mode !== "both");
  const bar = shown === "dark" && info.barColorDark ? info.barColorDark : info.barColor;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", bar));
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Saves a theme on this device and in the synced settings, and shows it. */
export function applyTheme(id: ThemeId) {
  write(TRIAL_STORAGE_KEY, null, true);
  write(LOOK_STORAGE_KEY, storedThemeValue(id));
  paintTheme(id);
  void updateSettings({ appTheme: id }).catch(() => {});
}

/** Saves the light/dark choice (Current and Classic only follow it). */
export function applyMode(mode: Mode) {
  write(THEME_STORAGE_KEY, mode);
  paintTheme(activeThemeId(), mode);
  void updateSettings({ theme: mode }).catch(() => {});
}

/** "Try it on the whole app": shows a theme without saving it. */
export function startTrial(id: ThemeId) {
  const previous = currentTrial()?.previous ?? savedThemeId();
  write(TRIAL_STORAGE_KEY, JSON.stringify({ theme: id, previous }), true);
  paintTheme(id);
}

/** Ends a trial: keep the theme on trial, or go back to the saved one. */
export function endTrial(keep: boolean) {
  const trial = currentTrial();
  if (!trial) return;
  if (keep) applyTheme(trial.theme);
  else {
    write(TRIAL_STORAGE_KEY, null, true);
    paintTheme(trial.previous);
  }
}

/** Puts synced settings into effect on this device (another device chose a theme). */
export function adoptSyncedTheme(appTheme: ThemeId | undefined, mode: Mode | undefined) {
  if (mode) write(THEME_STORAGE_KEY, mode);
  if (appTheme) write(LOOK_STORAGE_KEY, storedThemeValue(appTheme));
  if (!currentTrial()) paintTheme(savedThemeId());
}
