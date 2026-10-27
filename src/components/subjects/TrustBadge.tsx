"use client";

import { Icon } from "@/components/Icon";
import { useSyllabusOverlay } from "@/components/subjects/useSyllabusOverlay";
import { findBranch } from "@/lib/subjects";
import { badgeFor, liveSupport, type Badge, type Support } from "@/lib/syllabusFix/badges";
import type { ResolvedMeta } from "@/lib/syllabusFix/tree";

/*
 * Trust badges on courses and chapters (syllabus fix, Phase 7): "Verified by 3 students from
 * Computer Engineering" or "From official website, may be outdated. Help verify?". The words are
 * worked out in `src/lib/syllabusFix/badges.ts`; this only draws them.
 */

/** Asks the handout banner on the course page to open (it may have been dismissed). */
export const HELP_VERIFY_EVENT = "prism:help-verify";

const STYLE = {
  verified: { className: "bg-success/15 text-fg", icon: "verified" },
  pending: { className: "bg-warning/15 text-fg", icon: "again" },
  unverified: { className: "bg-warning/15 text-fg", icon: "warn" },
} as const;

/** A live fix's voters with their branch's display name. */
export function named(support: Support | undefined) {
  if (!support) return undefined;
  return { ...support, branchName: findBranch(support.branch)?.name ?? support.branch };
}

export function BadgeView({
  badge,
  size = "md",
  testId,
}: {
  badge: Badge;
  size?: "sm" | "md";
  testId?: string;
}) {
  const style = STYLE[badge.tone];
  const text = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";
  return (
    <p
      className={`inline-flex w-fit flex-wrap items-center gap-1.5 rounded-2xl font-semibold ${text} ${style.className}`}
      data-testid={testId}
      data-tone={badge.tone}
    >
      <Icon name={style.icon} />
      <span>{badge.text}</span>
      {badge.helpVerify && size === "md" && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(HELP_VERIFY_EVENT))}
          className="font-semibold text-primary underline underline-offset-2"
        >
          Help verify?
        </button>
      )}
    </p>
  );
}

/** The course's badge: from its data, or from the students who voted a fix to it through. */
export function CourseBadge({ subjectId, meta }: { subjectId: string; meta: ResolvedMeta }) {
  const overlay = useSyllabusOverlay();
  const badge = badgeFor(meta, named(liveSupport(overlay, subjectId)));
  return <BadgeView badge={badge} testId="verification-badge" />;
}
