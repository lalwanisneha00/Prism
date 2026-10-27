/*
 * Numbers the owner can tune for the student correction system (syllabus fix, Phases 3 to 6).
 * Phase 3 uses the handout points and upload limits; the auto-apply rule is used from Phase 5.
 */
export const SYLLABUS_FIX_CONFIG = {
  /** Points one student's contribution adds to a proposal. */
  points: { flag: 1, handout: 3, agree: 1, disagree: -1 },
  /** A proposal goes live at this many points from at least this many different students. */
  autoApply: { minPoints: 3, minUsers: 2 },
  /**
   * A rival proposal (another change to the same course, chapter or topic) with at least this many
   * points is "strong": neither goes live, both wait in the admin conflicts queue.
   */
  conflict: { minRivalPoints: 2 },
  /**
   * Count votes whose branch and semester came from the app instead of the student's synced
   * settings. Both need sign-in; switch off if students start faking their branch.
   */
  countDeviceProfiles: true,
  /** "Agree?" prompts shown to one student per visit (session). */
  promptsPerSession: 1,
  /** Most proposals one handout upload may create (the rest are left out, oldest order kept). */
  maxChangesPerHandout: 150,
  /** Lesson mistake flags (Phase 5). */
  lessonFlags: {
    /** Different students flagging one lesson version before it is rebuilt with their feedback. */
    threshold: 4,
    /** Automatic rebuilds per lesson; flagged past the threshold again = admin review instead. */
    maxAutoRegenerations: 1,
    /** Lessons of one subject (or one chapter) that needed fixing before it gets a quality warning. */
    qualityWarningLessons: 3,
    /** A rebuild that started this long ago and never finished may be tried again. */
    regenerationLeaseMs: 10 * 60 * 1000,
  },
  /** How long the server and browsers keep the live syllabus fixes before asking again. */
  overlayCacheSeconds: 300,
  /**
   * Abuse guards (Phase 6). Most of each kind one signed-in student may send per day (UTC day).
   * Past the limit the app says "Too many reports today"; nothing else about the account changes.
   */
  dailyLimits: { flag: 20, missing: 5, handout: 5, vote: 40, lessonFlag: 20 },
  /**
   * When the admin reverts a fix, every student who backed it gets one "reverted" mark. At this
   * many marks their flags and votes stop counting (they are still saved, and the account keeps
   * working). The admin page shows paused students and can resume them.
   */
  trust: { pauseAfterReverts: 3 },
  /** Admin page (Phase 6): pending proposals this many points (or fewer) short of going live. */
  admin: { nearThresholdGap: 1, recentFixes: 50 },
} as const;
