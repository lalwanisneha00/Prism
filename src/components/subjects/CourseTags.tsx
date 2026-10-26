import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

/*
 * Small tags under a course name (Phase 4B): Core / Non-core and Theory / Practical, each with its
 * own colour and icon so the kind of course reads at a glance, plus the line linking a theory
 * course and its lab.
 */

type Tag = { label: string; icon: IconName; className: string };

const CATEGORY: Record<"core" | "non-core", Tag> = {
  core: { label: "Core", icon: "study", className: "bg-primary-soft text-primary" },
  "non-core": { label: "Non-core", icon: "feather", className: "bg-warning/15 text-fg" },
};
const TYPE: Record<"theory" | "practical", Tag> = {
  theory: { label: "Theory", icon: "book", className: "border border-border text-muted" },
  practical: { label: "Practical", icon: "lab", className: "bg-success/15 text-fg" },
};

export function CourseTags({
  category,
  type,
  extra,
}: {
  category?: "core" | "non-core";
  /** A "practice" course is taught like theory. */
  type?: "theory" | "practice" | "practical";
  extra?: string[];
}) {
  const tags = [
    ...(category ? [CATEGORY[category]] : []),
    TYPE[type === "practical" ? "practical" : "theory"],
  ];
  return (
    <ul className="flex flex-wrap gap-1.5 text-xs font-semibold" data-testid="course-tags">
      {tags.map((t) => (
        <li
          key={t.label}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${t.className}`}
        >
          <Icon name={t.icon} />
          {t.label}
        </li>
      ))}
      {extra?.map((x) => (
        <li key={x} className="rounded-full border border-border px-2 py-0.5 text-muted">
          {x}
        </li>
      ))}
    </ul>
  );
}

/** "Also has a lab: Applied Physics Lab" on a theory course; "Theory course: …" on a lab. */
export function RelatedCourseLine({
  isLab,
  related,
}: {
  isLab: boolean;
  related: readonly { id: string; name: string }[];
}) {
  if (related.length === 0) return null;
  return (
    <p className="text-sm" data-testid="related-course">
      <span className="text-muted">{isLab ? "Theory course: " : "Also has a lab: "}</span>
      {related.map((r, i) => (
        <span key={r.id}>
          {i > 0 && ", "}
          <Link href={`/subjects/${r.id}`} className="font-semibold text-primary underline">
            {r.name}
          </Link>
        </span>
      ))}
    </p>
  );
}
