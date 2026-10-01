import { Card } from "@/components/lesson/BlockHeading";
import { Markdown } from "@/components/lesson/Markdown";
import { VisualSlot } from "@/components/lesson/VisualSlot";
import type { Section, Source } from "@/lib/schema";

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
      <div id={`section-${section.id}`} className="scroll-mt-20">
        <p className="text-sm font-semibold text-primary">Part {index + 1}</p>
        <h3 className="text-xl font-bold tracking-tight">{section.title}</h3>
      </div>
      <Markdown>{section.body}</Markdown>
      {section.visual && <VisualSlot visual={section.visual} />}
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
    </Card>
  );
}
