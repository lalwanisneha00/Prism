/*
 * Numbers the owner can tune for the student correction system (syllabus fix, Phases 3 to 6).
 * Phase 3 uses the handout points and upload limits; the auto-apply rule is used from Phase 5.
 */
export const SYLLABUS_FIX_CONFIG = {
  /** Points one student's contribution adds to a proposal. */
  points: { flag: 1, handout: 3, agree: 1, disagree: -1 },
  /** A proposal goes live at this many points from at least this many different students. */
  autoApply: { minPoints: 3, minUsers: 2 },
  /** Most proposals one handout upload may create (the rest are left out, oldest order kept). */
  maxChangesPerHandout: 150,
} as const;
