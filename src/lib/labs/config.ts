/*
 * Numbers for practical (lab) lessons (syllabus fix, Phase 7B), in one place so they are easy to
 * tune once students use them.
 */
export const LAB_CONFIG = {
  videos: {
    /** Videos shown per experiment. */
    shown: 3,
    /** Ranked videos kept in the cache, so a hidden one is replaced without a new search. */
    kept: 10,
    /** Results asked from one YouTube search (search costs 100 of the 10,000 free daily units). */
    searchResults: 15,
    /** Videos up to this long get a bonus. */
    preferMaxMinutes: 20,
    /** "Video doesn't match this experiment" from this many students hides it. */
    hideAfterFlags: 3,
    /** A cached list is searched again after this many days. */
    refreshDays: 180,
  },
  /** Templates offered to the AI for one experiment. */
  shortlist: 5,
  /**
   * Phase 7B lessons (one format for every lab) still open from the library while true. Phase 7C
   * rollout (owner approved 2026-10-30): false, so every older lesson is treated as stale and
   * rewritten in its new format when a student next opens it (no bulk rewrite).
   */
  keepPhase7BLessons: false,
} as const;
