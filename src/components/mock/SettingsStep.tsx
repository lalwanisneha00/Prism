"use client";

import { describePattern, examStyleLabel, scalePattern, type ExamStyle } from "@/lib/mock/pattern";
import {
  MARK_PRESETS,
  MINUTE_PRESETS,
  minutesFor,
  patternForStyle,
  type PaperInfo,
} from "@/lib/mock/plan";
import type { MockSettings } from "@/lib/storage/db";

const chip = (on: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2"}`;
const field = "w-24 rounded-xl border border-border bg-bg px-3 py-2 text-sm";

/** Step 4: marks, time (suggested from the pattern), exam style, difficulty. */
export function SettingsStep({
  settings,
  styles,
  papers,
  onChange,
}: {
  settings: MockSettings;
  styles: readonly ExamStyle[];
  papers: readonly PaperInfo[];
  onChange: (s: MockSettings) => void;
}) {
  const suggested = minutesFor(settings.marks, papers, settings.style);
  const { pattern, fromPapers } = patternForStyle(papers, settings.style);
  const preview = describePattern(scalePattern(pattern, settings.marks));
  const setMarks = (marks: number) => {
    // The time follows the marks unless the student set their own.
    const wasSuggested = settings.minutes === minutesFor(settings.marks, papers, settings.style);
    onChange({
      ...settings,
      marks,
      minutes: wasSuggested ? minutesFor(marks, papers, settings.style) : settings.minutes,
    });
  };
  const setStyle = (style: MockSettings["style"]) =>
    onChange({ ...settings, style, minutes: minutesFor(settings.marks, papers, style) });
  const papersFor = (s: ExamStyle) => papers.filter((p) => p.kind === s);
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Total marks</legend>
        <div
          className="flex flex-wrap items-center gap-2"
          role="radiogroup"
          aria-label="Total marks"
        >
          {MARK_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={settings.marks === m}
              onClick={() => setMarks(m)}
              className={chip(settings.marks === m)}
            >
              {m}
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm">
            Custom
            <input
              className={field}
              type="number"
              min={5}
              max={200}
              aria-label="Custom total marks"
              value={settings.marks}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                if (n >= 5 && n <= 200) setMarks(n);
              }}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Time limit</legend>
        <div
          className="flex flex-wrap items-center gap-2"
          role="radiogroup"
          aria-label="Time limit"
        >
          {[...new Set([suggested, ...MINUTE_PRESETS])]
            .sort((a, b) => a - b)
            .map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={settings.minutes === m}
                onClick={() => onChange({ ...settings, minutes: m })}
                className={chip(settings.minutes === m)}
              >
                {m} min{m === suggested ? " (suggested)" : ""}
              </button>
            ))}
          <label className="flex items-center gap-2 text-sm">
            Custom
            <input
              className={field}
              type="number"
              min={5}
              max={360}
              aria-label="Custom time in minutes"
              value={settings.minutes}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                if (n >= 5 && n <= 360) onChange({ ...settings, minutes: n });
              }}
            />
          </label>
        </div>
        <p className="text-xs text-muted">
          Suggested from{" "}
          {fromPapers ? "the pace of your uploaded papers" : "the usual pace of a university paper"}
          .
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Exam style</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Exam style">
          {styles.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={settings.style === s}
              onClick={() => setStyle(s)}
              className={chip(settings.style === s)}
            >
              {examStyleLabel[s]} ({papersFor(s).length})
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={settings.style === "default"}
            onClick={() => setStyle("default")}
            className={chip(settings.style === "default")}
          >
            Standard university pattern
          </button>
        </div>
        <p className="text-xs text-muted" data-testid="pattern-note">
          {styles.length === 0
            ? "You haven't uploaded papers for this subject, so the mock uses a standard Indian university pattern. "
            : settings.style !== "default" && !fromPapers
              ? "Your papers of this kind are still being read (or had no readable questions), so the standard pattern is used for now. "
              : ""}
          Paper: {preview}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Difficulty (optional)</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Difficulty">
          {(["easy", "mixed", "hard"] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={settings.difficulty === d}
              onClick={() => onChange({ ...settings, difficulty: d })}
              className={chip(settings.difficulty === d)}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </fieldset>

      {papers.length > 0 && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.pyqRepeat}
            onChange={(e) => onChange({ ...settings, pyqRepeat: e.target.checked })}
          />
          <span>
            Include a few real past questions (up to a fifth of the marks, each labelled &quot;PYQ
            repeat&quot;).
          </span>
        </label>
      )}
    </div>
  );
}
