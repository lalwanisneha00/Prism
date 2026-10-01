import { Card } from "@/components/lesson/BlockHeading";
import { Markdown } from "@/components/lesson/Markdown";
import { VisualSlot } from "@/components/lesson/VisualSlot";
import type { Section, Source } from "@/lib/schema";

/** The fact-check result for a section (SPEC §6.4). */
function CheckBadge({ check }: { check: NonNullable<Section["check"]> }) {
  const sourced = check.status === "sourced";
  return (
    <span
      title={check.note}
      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        sourced
          ? "border-success/40 bg-success/10 text-success"
          : "border-warning/40 bg-warning/10 text-warning"
      }`}
    >
      {sourced ? "Sourced ✓" : "Verify ⚠"}
    </span>
  );
}

/** One teaching section: explanation, its visual, and the sources that back it. */
export function SectionView({
  section,
  index,
  sources,
}: {
  section: Section;
  index: number;
  sources: Source[];
}) {
  const cited = section.sourceIds
    .map((id) => ({ id, number: sources.findIndex((s) => s.id === id) + 1 }))
    .filter((c) => c.number > 0);

  return (
    <Card className="flex flex-col gap-4">
      <div
        id={`section-${section.id}`}
        className="flex scroll-mt-20 items-start justify-between gap-3"
      >
        <div>
          <p className="text-sm font-semibold text-primary">Part {index + 1}</p>
          <h3 className="text-xl font-bold tracking-tight">{section.title}</h3>
        </div>
        {section.check && <CheckBadge check={section.check} />}
      </div>
      <Markdown>{section.body}</Markdown>
      {section.visual && <VisualSlot visual={section.visual} />}
      {section.check?.status === "verify" && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
          <span className="font-semibold">Double-check this part.</span>{" "}
          {section.check.note ?? "Our fact-check couldn't fully confirm it against the sources."}
        </p>
      )}
      {cited.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Sources:</span>
          {cited.map((c) => (
            <a
              key={c.id}
              href={`#source-${c.id}`}
              className="rounded-full border border-border px-2 py-0.5 font-medium hover:bg-surface-2"
            >
              [{c.number}]
            </a>
          ))}
        </p>
      )}
    </Card>
  );
}
