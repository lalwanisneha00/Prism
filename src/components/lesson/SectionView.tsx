import { Icon } from "@/components/Icon";
import { Card } from "@/components/lesson/BlockHeading";
import { Markdown } from "@/components/lesson/Markdown";
import { BlockNoteButton, BlockNotes } from "@/components/annotations/BlockNotes";
import { SectionHelp } from "@/components/explain/SectionHelp";
import { VisualSlot } from "@/components/lesson/VisualSlot";
import { CodeChecks } from "@/components/lesson/CodeChecks";
import { findCodeSamples } from "@/lib/code/codeBlocks";
import type { GlossaryEntry } from "@/lib/glossary";
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
      {sourced ? (
        "Sourced ✓"
      ) : (
        <>
          Verify <Icon name="warn" />
        </>
      )}
    </span>
  );
}

/** One teaching section: explanation, its visual, and the sources that back it. */
export function SectionView({
  section,
  index,
  sources,
  glossary,
  interactive = false,
}: {
  section: Section;
  index: number;
  sources: Source[];
  glossary?: GlossaryEntry[];
  /** Show the "Explain simpler" / "Another analogy" tools (not while streaming). */
  interactive?: boolean;
}) {
  const cited = section.sourceIds
    .map((id) => ({ id, number: sources.findIndex((s) => s.id === id) + 1 }))
    .filter((c) => c.number > 0);
  const fromNotes = cited.some((c) => sources[c.number - 1].kind === "notes");
  // In a lesson built from the student's notes, say which parts come from elsewhere.
  const notesLesson = sources.some((s) => s.kind === "notes");
  const outside = notesLesson && cited.some((c) => sources[c.number - 1].kind !== "notes");

  return (
    <Card className="flex flex-col gap-4" data-section-card="">
      <div
        id={`section-${section.id}`}
        className="flex scroll-mt-20 items-start justify-between gap-3"
      >
        <div>
          <p className="text-sm font-semibold text-primary">Part {index + 1}</p>
          <h3 className="text-xl font-bold tracking-tight">{section.title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {interactive && (
            <BlockNoteButton
              block={`section:${section.id}`}
              sectionId={section.id}
              label={`section ${index + 1}`}
            />
          )}
          {section.check && <CheckBadge check={section.check} />}
          {fromNotes && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-primary">
              <Icon name="book" /> From your notes
            </span>
          )}
          {outside && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-muted">
              <Icon name="library" /> {fromNotes ? "+ outside sources" : "Outside sources"}
            </span>
          )}
        </div>
      </div>
      {interactive && <BlockNotes block={`section:${section.id}`} unanchoredSection={section.id} />}
      <div data-anno-block={`section:${section.id}`} data-section-id={section.id}>
        <Markdown glossary={glossary}>{section.body}</Markdown>
      </div>
      {section.body.includes("```") && <CodeChecks samples={findCodeSamples(section.body)} />}
      {interactive && <BlockNotes block={`section:${section.id}`} />}
      {section.visual && (
        <div
          data-anno-block={`visual:${section.id}`}
          data-section-id={section.id}
          className="flex flex-col gap-2"
        >
          <VisualSlot visual={section.visual} />
          {interactive && (
            <div className="flex items-center justify-end gap-2" data-anno-skip="">
              <BlockNotes block={`visual:${section.id}`} />
              <BlockNoteButton
                block={`visual:${section.id}`}
                sectionId={section.id}
                label="this visual"
              />
            </div>
          )}
        </div>
      )}
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
      {interactive && <SectionHelp sectionId={section.id} />}
    </Card>
  );
}
