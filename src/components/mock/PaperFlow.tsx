"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnswerSheetView } from "@/components/mock/AnswerSheetView";
import { PaperView } from "@/components/mock/PaperView";
import { PrintPaper } from "@/components/mock/PrintPaper";
import {
  canSeeAnswers,
  elapsedMs,
  formatClock,
  newClock,
  pauseClock,
  secondsLeft,
  startClock,
  type Clock,
  type PaperStage,
} from "@/lib/mock/clock";
import type { Paper } from "@/lib/mock/paper";
import { parseSelfScore } from "@/lib/mock/verify";

const btn = "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2";
const primary =
  "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60";

type Printing = { sheet: "paper" | "answers" } | null;

/**
 * Paper mode: the mock as a printed question paper. The student starts the timer, writes on paper,
 * and presses "Finish mock test"; only then does the answer sheet appear, with one box for the
 * total they give themselves. Nothing is answered or marked in the app.
 */
export function PaperFlow({
  paper,
  subjectName,
  scopeLabel,
  onSave,
  onRetake,
  onDone,
}: {
  paper: Paper;
  subjectName: string;
  scopeLabel: string;
  /** Saves the student's total and the time taken. */
  onSave: (score: number, timeTakenSec: number) => Promise<void>;
  onRetake: () => void;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<PaperStage>("paper");
  const [clock, setClock] = useState<Clock>(newClock);
  const [taken, setTaken] = useState(0);
  const [printing, setPrinting] = useState<Printing>(null);
  const top = useRef<HTMLDivElement>(null);
  const stopPrinting = useCallback(() => setPrinting(null), []);

  function finish() {
    const now = Date.now();
    setTaken(Math.round(elapsedMs(clock, now) / 1000));
    setClock((c) => pauseClock(c, now));
    setStage("finished");
    top.current?.scrollIntoView({ block: "start" });
  }

  const fileName = `${subjectName} - ${scopeLabel}`;
  return (
    <div ref={top} className="flex scroll-mt-28 flex-col gap-4" data-testid="paper-flow">
      <div className="sticky top-[6.75rem] z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm shadow-sm lg:top-[5.75rem]">
        <TimerBar
          clock={clock}
          minutes={paper.minutes}
          finished={!canSeeAnswers(stage) ? false : true}
        />
        <div className="flex flex-wrap gap-2">
          {stage === "paper" &&
            (clock.runningSince === null ? (
              <button
                type="button"
                className={btn}
                onClick={() => setClock((c) => startClock(c, Date.now()))}
              >
                {clock.started ? "Resume timer" : "Start timer"}
              </button>
            ) : (
              <button
                type="button"
                className={btn}
                onClick={() => setClock((c) => pauseClock(c, Date.now()))}
              >
                Pause timer
              </button>
            ))}
          {stage === "paper" && (
            <button type="button" className={primary} onClick={finish}>
              Finish mock test
            </button>
          )}
        </div>
      </div>

      {stage === "paper" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setPrinting({ sheet: "paper" })}>
              Download paper (PDF)
            </button>
            <button type="button" className={btn} onClick={() => setPrinting({ sheet: "paper" })}>
              Print
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-8">
            <PaperView paper={paper} subjectName={subjectName} scopeLabel={scopeLabel} />
          </div>
          <button type="button" className={`${primary} w-fit`} onClick={finish}>
            Finish mock test
          </button>
        </>
      ) : (
        <>
          <p className="text-sm">
            Done{taken ? ` in ${formatClock(taken)}` : ""}. Mark your paper with the answer sheet
            below, then enter your total.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setPrinting({ sheet: "answers" })}>
              Download answer sheet (PDF)
            </button>
            <button type="button" className={btn} onClick={() => setPrinting({ sheet: "answers" })}>
              Print
            </button>
            <button type="button" className={btn} onClick={() => setPrinting({ sheet: "paper" })}>
              Download paper (PDF)
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-8">
            <AnswerSheetView paper={paper} subjectName={subjectName} scopeLabel={scopeLabel} />
          </div>
          <SelfScore
            total={paper.totalMarks}
            onSave={(score) => onSave(score, taken)}
            onRetake={onRetake}
            onDone={onDone}
          />
        </>
      )}

      {printing && (
        <PrintPaper
          title={`${printing.sheet === "paper" ? "Mock paper" : "Answer sheet"} - ${fileName}`}
          onDone={stopPrinting}
        >
          {printing.sheet === "paper" ? (
            <PaperView paper={paper} subjectName={subjectName} scopeLabel={scopeLabel} />
          ) : (
            <AnswerSheetView paper={paper} subjectName={subjectName} scopeLabel={scopeLabel} />
          )}
        </PrintPaper>
      )}
    </div>
  );
}

/** The countdown: the only part that changes every second, so the paper doesn't re-render. */
const TimerBar = memo(function TimerBar({
  clock,
  minutes,
  finished,
}: {
  clock: Clock;
  minutes: number;
  finished: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const running = clock.runningSince !== null;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  const at = running ? now : (clock.runningSince ?? now);
  const left = secondsLeft(clock, minutes, at);
  if (finished) return <p className="font-semibold">Mock finished</p>;
  return (
    <p aria-live="off" className="font-semibold tabular-nums" data-testid="mock-timer">
      {!clock.started ? (
        <>Time allowed: {formatClock(minutes * 60)}</>
      ) : left === 0 ? (
        <span className="text-danger" role="status">
          Time&apos;s up! Finish your answer, then press Finish.
        </span>
      ) : (
        <span className={left < 300 ? "text-danger" : ""}>
          ⏱ {formatClock(left)} left{running ? "" : " (paused)"}
        </span>
      )}
    </p>
  );
});

/** One box for the total the student gives themselves, checked before saving. */
function SelfScore({
  total,
  onSave,
  onRetake,
  onDone,
}: {
  total: number;
  onSave: (score: number) => Promise<void>;
  onRetake: () => void;
  onDone: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const parsed = parseSelfScore(value, total);
    if (!parsed.ok) return setError(parsed.message);
    setError(null);
    setBusy(true);
    try {
      await onSave(parsed.score);
      setSaved(parsed.score);
    } catch {
      setError("Couldn't save. Check that storage isn't blocked, then try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      data-testid="self-score"
      aria-label="Your total marks"
    >
      {saved === null ? (
        <>
          <label className="flex flex-wrap items-center gap-2 font-semibold">
            Your total marks:
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void save()}
              aria-invalid={error ? true : undefined}
              aria-describedby="self-score-error"
              className="w-24 rounded-xl border border-border bg-bg px-3 py-2 text-right tabular-nums"
            />
            <span>/ {total}</span>
          </label>
          {error && (
            <p id="self-score-error" role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primary} disabled={busy} onClick={() => void save()}>
              Save my score
            </button>
            <button type="button" className={btn} onClick={onDone}>
              Skip
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold" role="status">
            ✓ Saved: {saved} / {total}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={onRetake}>
              Retake as a new paper
            </button>
            <button type="button" className={btn} onClick={onDone}>
              Done
            </button>
          </div>
        </>
      )}
    </section>
  );
}
