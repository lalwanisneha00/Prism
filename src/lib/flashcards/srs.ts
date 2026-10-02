/*
 * Spaced repetition (SPEC §8, V2 · Step 11) with the SM-2 method used by most flashcard apps.
 * Like a teacher who asks the hard question again tomorrow and the easy one next month:
 * each answer you rate pushes the card's next review further away, or brings it back.
 */

export type Grade = "again" | "hard" | "good" | "easy";

export type SrsState = {
  /** When the card is next due (ms since 1970). */
  due: number;
  /** Days until the next review after the last one. */
  interval: number;
  /** How easy this card is for you (SM-2 "ease factor", starts at 2.5, never below 1.3). */
  ease: number;
  /** Successful reviews in a row. */
  reps: number;
  /** Times you forgot it. */
  lapses: number;
  lastReviewed?: number;
};

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export function newSrs(now: number): SrsState {
  return { due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

/** The card's state after one review. */
export function review(state: SrsState, grade: Grade, now: number): SrsState {
  if (grade === "again") {
    // Forgotten: see it again in 10 minutes, and start the run of correct answers over.
    return {
      ...state,
      reps: 0,
      lapses: state.lapses + 1,
      interval: 0,
      ease: Math.max(1.3, state.ease - 0.2),
      due: now + 10 * MINUTE,
      lastReviewed: now,
    };
  }
  const quality = { hard: 3, good: 4, easy: 5 }[grade];
  const ease = Math.max(1.3, state.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  let interval: number;
  if (state.reps === 0) interval = grade === "easy" ? 4 : 1;
  else if (state.reps === 1) interval = grade === "hard" ? 3 : grade === "easy" ? 8 : 6;
  else interval = state.interval * (grade === "hard" ? 1.2 : grade === "easy" ? ease * 1.3 : ease);
  interval = Math.round(Math.min(365, Math.max(1, interval)));
  return {
    ...state,
    reps: state.reps + 1,
    interval,
    ease,
    due: now + interval * DAY,
    lastReviewed: now,
  };
}

/** "10 min", "1 day", "6 days", "2 mo": shown on each rating button before you press it. */
export function describeNext(state: SrsState, grade: Grade, now: number): string {
  const next = review(state, grade, now);
  const ms = next.due - now;
  if (ms < DAY) return `${Math.round(ms / MINUTE)} min`;
  const days = Math.round(ms / DAY);
  if (days < 31) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return "1 yr";
}

export function isDue(state: SrsState, now: number): boolean {
  return state.due <= now;
}
