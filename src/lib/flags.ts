/*
 * Feature flags: one place to switch a whole feature on or off (overnight final run, 2026-10-05).
 * Each flag has a default here; set the environment variable to "0" or "1" (in Vercel, then
 * redeploy) to change it without touching code. Variables must be spelled out in full so Next.js
 * can inline them into the browser code.
 */

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return fallback;
}

export const FLAGS = {
  /** Settings → "Your API keys": use your own provider key for lessons. */
  byoKey: flag(process.env.NEXT_PUBLIC_FLAG_BYO_KEY, true),
  /** "Make slides or a PDF instead" in the lesson maker, and "My slides and PDFs". */
  slidesPdf: flag(process.env.NEXT_PUBLIC_FLAG_SLIDES_PDF, true),
  /** The redesigned look (the "Classic" look stays available either way). */
  redesign: flag(process.env.NEXT_PUBLIC_FLAG_REDESIGN, true),
  /** Community branches: not built yet; stays off until its Firestore rules are applied. */
  community: flag(process.env.NEXT_PUBLIC_FLAG_COMMUNITY, false),
} as const;

export type FlagName = keyof typeof FLAGS;
