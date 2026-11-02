"use client";

import { endTrial } from "@/lib/themeDom";
import { themeInfo } from "@/lib/theme";
import { useThemeState } from "@/components/themes/useThemeState";

/** Floating bar while a theme is on trial ("Try it on the whole app"): keep it or go back. */
export function ThemeTrialBar() {
  const state = useThemeState();
  if (!state?.trial) return null;
  return (
    <div
      role="region"
      aria-label="Theme trial"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-sm text-fg shadow-xl sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <p className="min-w-0 flex-1">
        Trying <strong>{themeInfo(state.trial).name}</strong>
      </p>
      <button
        type="button"
        onClick={() => endTrial(false)}
        className="rounded-xl border border-border px-3 py-2 font-semibold hover:bg-surface-2"
      >
        Go back
      </button>
      <button
        type="button"
        onClick={() => endTrial(true)}
        className="rounded-xl bg-primary px-3 py-2 font-semibold text-primary-fg hover:bg-primary-hover"
      >
        Keep this theme
      </button>
    </div>
  );
}
