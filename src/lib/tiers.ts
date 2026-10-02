import type { GroundingSource } from "@/lib/prompts/lessonPrompt";

/*
 * Trust tiers (SPEC §6.1). Like the labels on a food packet: they tell the student how far
 * a lesson has been checked, so they know when to double-check against their textbook.
 */

export type TrustTier = "verified" | "sourced" | "limited";

export const tierCopy: Record<TrustTier, { badge: string; explain: string }> = {
  verified: {
    badge: "✓ Verified subject",
    explain:
      "This subject has its own test set of key facts, and our lessons score at least 95% on it.",
  },
  sourced: {
    badge: "📚 Sourced",
    explain:
      "Every section cites trusted sources and is fact-checked, but this subject's accuracy test isn't finished yet.",
  },
  limited: {
    badge: "⚠ Limited sources",
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
