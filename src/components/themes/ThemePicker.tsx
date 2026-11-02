"use client";

import { useRef, useState } from "react";
import { applyTheme, startTrial } from "@/lib/themeDom";
import { THEMES, themeInfo, type ThemeId, type ThemeInfo } from "@/lib/theme";
import { ThemeScope } from "@/components/themes/ThemeScope";
import {
  MiniPreview,
  SampleDashboard,
  SampleLesson,
  SampleMockTest,
} from "@/components/themes/ThemeSamples";
import { useThemeState } from "@/components/themes/useThemeState";

const SCREENS = [
  { id: "dashboard", label: "Dashboard", Screen: SampleDashboard },
  { id: "lesson", label: "Lesson", Screen: SampleLesson },
  { id: "mock", label: "Mock test", Screen: SampleMockTest },
] as const;
type ScreenId = (typeof SCREENS)[number]["id"];

function modeLabel(t: ThemeInfo) {
  return t.mode === "both" ? "Light + dark" : t.mode === "light" ? "Light" : "Dark";
}

/** The Themes page: a card per theme, a large preview, Apply and "Try it on the whole app". */
export function ThemePicker() {
  const state = useThemeState();
  const [picked, setPicked] = useState<ThemeId | null>(null);
  const [screen, setScreen] = useState<ScreenId>("dashboard");
  const pane = useRef<HTMLElement>(null);

  // Before the browser has told us the theme, show the cards without "current" marks.
  const saved = state?.saved ?? null;
  const mode = state?.mode ?? "light";
  const selected = picked ?? state?.active ?? null;

  function pick(id: ThemeId) {
    setPicked(id);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    pane.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  const Screen = SCREENS.find((s) => s.id === screen)?.Screen ?? SampleDashboard;

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Themes">
        {THEMES.map((t) => {
          const isSaved = saved === t.id;
          const isSelected = selected === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => pick(t.id)}
                aria-pressed={isSelected}
                className={`flex w-full flex-col overflow-hidden rounded-2xl border bg-surface text-left hover:border-primary ${
                  isSelected ? "border-primary ring-2 ring-primary" : "border-border"
                }`}
              >
                <ThemeScope
                  theme={t.id}
                  mode={mode}
                  className="pointer-events-none h-44 overflow-hidden border-b border-border"
                >
                  <div aria-hidden="true" className="h-full">
                    <MiniPreview />
                  </div>
                </ThemeScope>
                <span className="flex flex-col gap-1 p-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{t.name}</span>
                    {isSaved && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-fg">
                        Your theme
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-muted">{t.vibe}</span>
                  <span className="text-xs text-muted">{modeLabel(t)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <section
        ref={pane}
        aria-labelledby="theme-preview-title"
        className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-6"
      >
        {selected === null ? (
          <div
            className="h-80 animate-pulse rounded-xl bg-surface-2"
            aria-label="Loading preview"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="theme-preview-title" className="text-2xl font-bold">
                  {themeInfo(selected).name}
                </h2>
                <p className="text-muted">{themeInfo(selected).vibe}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startTrial(selected)}
                  disabled={state?.active === selected}
                  className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50"
                >
                  Try it on the whole app
                </button>
                <button
                  type="button"
                  onClick={() => applyTheme(selected)}
                  disabled={saved === selected && !state?.trial}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
                >
                  {saved === selected && !state?.trial ? "This is your theme" : "Apply"}
                </button>
              </div>
            </div>

            <div role="tablist" aria-label="Sample screen" className="flex flex-wrap gap-2">
              {SCREENS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={screen === s.id}
                  onClick={() => setScreen(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    screen === s.id
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <ThemeScope
              theme={selected}
              mode={mode}
              className="overflow-hidden rounded-xl border border-border"
            >
              <div role="tabpanel" aria-label={`${themeInfo(selected).name} sample`} inert>
                <Screen />
              </div>
            </ThemeScope>
            <p className="text-sm text-muted">
              {themeInfo(selected).mode === "both"
                ? "This theme follows the light/dark switch in the top bar."
                : `This theme is always ${themeInfo(selected).mode}; the light/dark switch is hidden while it is on.`}{" "}
              Your choice is saved on this device and, when you are signed in, on your other devices
              too.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
