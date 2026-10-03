import Link from "next/link";
import { tierCopy, type TrustTier } from "@/lib/tiers";

const tierStyle: Record<TrustTier, string> = {
  verified: "border-success/40 bg-success/10 text-success",
  sourced: "border-primary/30 bg-primary-soft text-primary",
  limited: "border-warning/40 bg-warning/10 text-warning",
};

/** How far this lesson can be trusted (SPEC §6.1), with a tap-to-explain line. */
export function TierBadge({ tier }: { tier: TrustTier }) {
  return (
    <details className="group">
      <summary
        className={`w-fit cursor-pointer list-none rounded-full border px-3 py-1 text-sm font-medium marker:hidden ${tierStyle[tier]}`}
      >
        {tierCopy[tier].badge} <span className="text-xs opacity-70">ⓘ</span>
      </summary>
      <p className="mt-2 max-w-md rounded-xl border border-border bg-surface p-3 text-sm text-muted">
        {tierCopy[tier].explain}{" "}
        <Link href="/accuracy" className="font-semibold text-primary underline">
          How we measure accuracy
        </Link>
      </p>
    </details>
  );
}

/** Shown on "limited" lessons: verify, and add your own material. */
export function LimitedBanner() {
  return (
    <p role="note" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <span className="font-semibold">⚠ Limited sources, please verify.</span> We found very little
      trusted source text for this topic, so this lesson is short and parts may be unchecked.
      Compare it with your textbook, or{" "}
      <Link href="/notes" className="font-semibold text-primary underline">
        upload your own notes
      </Link>{" "}
      and build the lesson from them.
    </p>
  );
}
