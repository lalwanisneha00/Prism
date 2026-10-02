/**
 * Time budgets in minutes (SPEC §7). Long lessons get a longer audio narration, written
 * chapter by chapter; the lesson text itself stays a readable length.
 */
export const durations = [
  { minutes: 5, label: "5 min", hint: "Quick look" },
  { minutes: 10, label: "10 min", hint: "Overview" },
  { minutes: 15, label: "15 min", hint: "Full lesson" },
  { minutes: 30, label: "30 min", hint: "Deep study" },
  { minutes: 45, label: "45 min", hint: "Lecture" },
  { minutes: 60, label: "60 min", hint: "Full hour" },
  { minutes: 90, label: "90 min", hint: "Marathon" },
] as const;

export type DurationMinutes = (typeof durations)[number]["minutes"];

export const defaultDuration: DurationMinutes = 10;

export function isDuration(n: number): n is DurationMinutes {
  return durations.some((d) => d.minutes === n);
}
