import type { GroundingSource } from "@/lib/prompts/lessonPrompt";

/*
 * Trust tiers (SPEC §6.1). Like the labels on a food packet: they tell the student how far
 * a lesson has been checked, so they know when to double-check against their textbook.
 */

/** Most trusted first (SPEC §12.3 rule 3). */
export const TIERS = ["verified", "tested", "sourced", "limited"] as const;
export type TrustTier = (typeof TIERS)[number];

export const tierCopy: Record<TrustTier, { badge: string; explain: string }> = {
  verified: {
    badge: "✓ Verified subject",
    explain:
      "This subject has its own test set of key facts, and our lessons score at least 95% on it.",
  },
  tested: {
    badge: "Tested subject",
    explain:
      "This subject has its own test set of key facts taken from trusted sources, and our lessons score at least 85% on it (the exact score is on the accuracy page).",
  },
  sourced: {
    badge: "Sourced",
    explain:
      "Every section cites trusted sources and is fact-checked. This subject's accuracy test either hasn't been run yet or hasn't reached 85% yet: the accuracy page shows which, and its score if it has one.",
  },
  limited: {
    badge: "Limited sources",
    explain:
      "We found little source text for this topic, so this lesson is shorter. Please verify it against your textbook.",
  },
};

/**
 * The tier of one lesson: the subject's tier, lowered to "limited" when retrieval found no
 * source text at all (no excerpts and no notes), because then nothing grounds the facts.
 */
export function effectiveTier(subjectTier: TrustTier, sources: GroundingSource[]): TrustTier {
  const grounded = sources.some((s) => Boolean(s.excerpt?.trim()));
  return grounded ? subjectTier : "limited";
}
