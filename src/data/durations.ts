/**
 * Time budgets in minutes (SPEC §7). V1 offers up to 15 minutes; the long
 * presets (30–90) need chunked audio generation and arrive in V2 · Step 3.
 */
export const durations = [
  { minutes: 5, label: "5 min", hint: "Quick look" },
  { minutes: 10, label: "10 min", hint: "Solid overview" },
  { minutes: 15, label: "15 min", hint: "Full lesson" },
] as const;

export type DurationMinutes = (typeof durations)[number]["minutes"];

export const defaultDuration: DurationMinutes = 10;

export function isDuration(n: number): n is DurationMinutes {
  return durations.some((d) => d.minutes === n);
}
