import type { Purpose } from "@/lib/slides/plan";

/*
 * Is the slide count enough for what was chosen? (Deck quality overhaul.) More slides should mean
 * more depth, never padding, so a whole chapter in 8 slides gets a warning and a better number
 * before anything is generated. Plain code: no AI call.
 */

/** Slides each topic needs at least, and the fixed slides of the deck (title, recap, sources…). */
const NEED: Record<Purpose, { perTopic: number; fixed: number }> = {
  teach: { perTopic: 4, fixed: 5 },
  study: { perTopic: 4, fixed: 3 },
  revise: { perTopic: 2, fixed: 3 },
  practice: { perTopic: 3, fixed: 3 },
  summary: { perTopic: 0, fixed: 1 },
};

/** Most slides worth making per topic (beyond this the deck would repeat itself). */
const MOST_PER_TOPIC: Record<Purpose, number> = {
  teach: 12,
  study: 12,
  revise: 6,
  practice: 8,
  summary: 0,
};

export type CountAdvice =
  { ok: true } | { ok: false; tooFew: boolean; suggested: number; message: string };

/** Whether `slides` suits `topics` topics for this purpose, and a better number if not. */
export function countAdvice(purpose: Purpose, topics: number, slides: number): CountAdvice {
  if (purpose === "summary" || topics <= 0) return { ok: true };
  const need = NEED[purpose];
  const least = need.fixed + need.perTopic * topics;
  const most = need.fixed + MOST_PER_TOPIC[purpose] * topics;
  if (slides < least) {
    const suggested = Math.ceil(least / 5) * 5;
    const each = Math.max(0, Math.floor((slides - need.fixed) / topics));
    const per = each <= 1 ? "at most one slide" : `about ${each} slides`;
    return {
      ok: false,
      tooFew: true,
      suggested,
      message: `${slides} slides is too few for ${topics} ${topics === 1 ? "topic" : "topics"}: each would get ${per}, too little to explain it properly. About ${suggested} would do it justice.`,
    };
  }
  if (slides > most) {
    const suggested = Math.floor(most / 5) * 5 || most;
    return {
      ok: false,
      tooFew: false,
      suggested,
      message: `${slides} slides is more than ${topics === 1 ? "one topic" : `${topics} topics`} can fill without repeating. About ${suggested} keeps every slide useful.`,
    };
  }
  return { ok: true };
}

/** Activities a teaching deck should have: about 1 per 8-10 slides, at least 2 from 12 slides. */
export function activitiesFor(slides: number): number {
  const n = Math.round(slides / 9);
  return slides >= 12 ? Math.max(2, n) : Math.max(1, n);
}
