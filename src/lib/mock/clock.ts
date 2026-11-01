/*
 * The mock's stopwatch (mock test redesign): counts down the chosen time, can be paused, and
 * keeps counting how long the student took. Nothing locks when time runs out. Pure: the caller
 * passes the current time, so it is easy to test.
 */

export type Clock = {
  /** Milliseconds the clock has run, not counting the current run. */
  elapsedMs: number;
  /** When the current run started, or null while paused / not started. */
  runningSince: number | null;
  started: boolean;
};

export const newClock = (): Clock => ({ elapsedMs: 0, runningSince: null, started: false });

export function startClock(c: Clock, now: number): Clock {
  return c.runningSince !== null ? c : { ...c, runningSince: now, started: true };
}

export function pauseClock(c: Clock, now: number): Clock {
  return c.runningSince === null
    ? c
    : { ...c, elapsedMs: c.elapsedMs + (now - c.runningSince), runningSince: null };
}

export function elapsedMs(c: Clock, now: number): number {
  return c.elapsedMs + (c.runningSince === null ? 0 : now - c.runningSince);
}

/** Seconds left of the time limit (0 when time is up; never negative). */
export function secondsLeft(c: Clock, limitMinutes: number, now: number): number {
  return Math.max(0, Math.ceil((limitMinutes * 60_000 - elapsedMs(c, now)) / 1000));
}

/** "1:05:09" or "05:09". */
export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** The paper flow's stages: the answer sheet exists only after "Finish mock test". */
export type PaperStage = "paper" | "finished";
export const canSeeAnswers = (stage: PaperStage) => stage === "finished";
