"use client";

import { useSyncExternalStore } from "react";
import { THEME_EVENT, activeThemeId, chosenMode, currentTrial, savedThemeId } from "@/lib/themeDom";
import type { Mode, ThemeId } from "@/lib/theme";

export type ThemeState = {
  /** On the page now (a trial counts). */
  active: ThemeId;
  /** What the student has kept. */
  saved: ThemeId;
  /** A "Try it on the whole app" in progress. */
  trial: ThemeId | null;
  /** The student's light/dark choice (used by themes that have both). */
  mode: Mode;
};

let cache: { key: string; value: ThemeState } | null = null;

function snapshot(): ThemeState {
  const value: ThemeState = {
    active: activeThemeId(),
    saved: savedThemeId(),
    trial: currentTrial()?.theme ?? null,
    mode: chosenMode(),
  };
  const key = `${value.active}|${value.saved}|${value.trial}|${value.mode}`;
  if (cache?.key !== key) cache = { key, value }; // same object while nothing changed
  return cache.value;
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The theme on the page and the saved one; null on the server and before hydration. */
export function useThemeState(): ThemeState | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
