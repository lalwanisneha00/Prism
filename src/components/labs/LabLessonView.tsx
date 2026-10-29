"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ApparatusDiagram } from "@/components/labs/ApparatusDiagram";
import { ApparatusIcon } from "@/components/labs/ApparatusIcon";
import {
  CircuitFallback,
  CircuitLab,
  CircuitProcedure,
  WiringSteps,
} from "@/components/labs/circuit/CircuitLab";
import { LiveGraph } from "@/components/labs/circuit/CircuitViews";
import { CodeExamples, FixList, PracticeList, TraceView } from "@/components/labs/CodeLab";
import { DrawingBoard } from "@/components/labs/DrawingBoard";
import { LabVideos } from "@/components/labs/LabVideos";
import { ObservationTable } from "@/components/labs/ObservationTable";
import { ProcedureSteps } from "@/components/labs/ProcedureSteps";
import { Formula, Markdown } from "@/components/lesson/Markdown";
import { VisualSlot } from "@/components/lesson/VisualSlot";
import { archetypeById, type SectionSpec } from "@/lib/labs/archetypes";
import type { LabLesson } from "@/lib/labs/labLesson";
import type { LabSimulation } from "@/lib/labs/practicalSchema";
import type { SectionValue } from "@/lib/labs/sections";

/*
 * A lab lesson v2 (syllabus fix, Phase 7C): its archetype's sections, numbered, in order. Sections
 * the lesson left out (optional ones written as null) are skipped.
 */

function Part({
  n,
  title,
  children,
  id,
}: {
  n: number;
  title: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <section
      aria-labelledby={`lab-part-${id}`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5"
      data-testid="lab-section"
      data-section={id}
    >
      <h2 id={`lab-part-${id}`} className="text-xl font-bold tracking-tight">
        <span className="text-muted">{n}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

function List({ items, warning }: { items: string[]; warning?: boolean }) {
  const list = (
    <ul className="list-disc pl-5">
      {items.map((s, i) => (
        <li key={i}>
          <Markdown>{s}</Markdown>
        </li>
      ))}
    </ul>
  );
  if (!warning) return list;
  return (
    <div
      className="rounded-xl border-2 border-warning/60 bg-warning/10 p-3"
      role="note"
      data-testid="safety-box"
    >
      <p className="mb-1 font-semibold text-warning">⚠ Read before you start</p>
      {list}
    </div>
  );
}

/** Parts of a setup as cards with their pictures and roles. */
function PartsList({ setup }: { setup: SectionValue<"setup"> }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {setup.parts.map((p, i) => (
        <li
          key={p.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-2"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-fg text-xs font-bold text-surface">
            {i + 1}
          </span>
          <span className="shrink-0 text-fg">
            {p.icon ? <ApparatusIcon name={p.icon} /> : null}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">{p.label}</span>
            {p.role && <span className="block text-sm text-muted">{p.role}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LabLessonView({ lesson }: { lesson: LabLesson }) {
  const archetype = archetypeById(lesson.archetype);
  if (!archetype) return null;
  const { meta } = lesson;
  const v = (id: string) => lesson.sections[id];
  const visible = archetype.sections.filter(
    (s) =>
      s.kind === "wiring" ||
      s.kind === "videos" ||
      (v(s.id) ?? null) !== null ||
      s.kind === "simulation",
  );
  const diagramUsers = new Set(archetype.sections.map((s) => s.diagram).filter(Boolean));
  // Links to the related theory topics go under the first theory section.
  const firstTheory = archetype.sections.find((s) => s.kind === "theory")?.id;

  const body = (s: SectionSpec): ReactNode | null => {
    const value = v(s.id);
    switch (s.kind) {
      case "text":
        return <Markdown>{value as string}</Markdown>;
      case "theory": {
        const t = value as SectionValue<"theory">;
        const links = s.id === firstTheory && meta.theoryLinks?.length ? meta.theoryLinks : null;
        return (
          <>
            <Markdown>{t.body}</Markdown>
            {t.formulas.length > 0 && (
              <ul className="flex flex-col gap-2">
                {t.formulas.map((f, i) => (
                  <li key={i} className="rounded-xl bg-surface-2 px-3 py-2">
                    <Formula latex={f.latex} />
                    <p className="text-sm text-muted">{f.meaning}</p>
                  </li>
                ))}
              </ul>
            )}
            {links && (
              <div className="text-sm">
                <p className="font-semibold">Revise the theory first:</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {links.map((l) => (
                    <li key={`${l.subject}/${l.topic}`}>
                      <Link
                        href={`/start?${new URLSearchParams({ subject: l.subject, chapter: l.chapter, topic: l.topic })}`}
                        className="inline-block rounded-full border border-border px-3 py-1 hover:bg-surface-2"
                      >
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        );
      }
      case "list":
        return <List items={value as string[]} warning={s.tone === "warning"} />;
      case "steps": {
        const steps = value as SectionValue<"steps">;
        const target = s.diagram ? archetype.sections.find((t) => t.id === s.diagram) : undefined;
        const setup =
          target?.kind === "setup" ? (v(target.id) as SectionValue<"setup"> | null) : null;
        const circuit =
          target?.kind === "circuit" ? (v(target.id) as SectionValue<"circuit"> | null) : null;
        if (circuit)
          return (
            <CircuitProcedure
              steps={steps}
              circuit={circuit}
              playLabel={`Play the ${s.title.toLowerCase()}`}
            />
          );
        if (setup)
          return (
            <ProcedureSteps
              lesson={{ procedure: steps, apparatus: setup }}
              playLabel={`Play the ${s.title.toLowerCase()}`}
            />
          );
        return (
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            {steps.map((st, i) => (
              <li key={i}>
                <Markdown>{st.text}</Markdown>
              </li>
            ))}
          </ol>
        );
      }
      case "setup": {
        const setup = value as SectionValue<"setup">;
        return (
          <>
            {!diagramUsers.has(s.id) && <ApparatusDiagram apparatus={setup} />}
            <PartsList setup={setup} />
            {setup.notes && <Markdown>{setup.notes}</Markdown>}
            {diagramUsers.has(s.id) && (
              <p className="text-sm text-muted">
                The procedure below walks through this setup step by step.
              </p>
            )}
          </>
        );
      }
      case "circuit": {
        const c = value as SectionValue<"circuit">;
        return c.fallback ? <CircuitFallback circuit={c} /> : <CircuitLab circuit={c} />;
      }
      case "wiring": {
        const c = s.diagram ? (v(s.diagram) as SectionValue<"circuit"> | null) : null;
        if (!c) return null;
        if (c.fallback)
          return (
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {c.wiring.map((w, i) => (
                <li key={i}>
                  <Markdown>{w.text}</Markdown>
                </li>
              ))}
            </ol>
          );
        return <WiringSteps circuit={c} />;
      }
      case "observations":
        return <ObservationTable table={value as SectionValue<"observations">} />;
      case "calculations": {
        const calc = value as SectionValue<"calculations">;
        return (
          <>
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {calc.steps.map((st, i) => (
                <li key={i}>
                  {/* A long worked line scrolls inside its step instead of widening the page. */}
                  <div className="overflow-x-auto">
                    <Markdown>{st}</Markdown>
                  </div>
                </li>
              ))}
            </ol>
            {calc.check && (
              <p className="text-sm text-success" data-testid="calc-checked">
                ✓ Prism recalculated this result from the sample values.
              </p>
            )}
          </>
        );
      }
      case "graph": {
        const g = value as SectionValue<"graph">;
        return (
          <figure className="flex flex-col gap-1">
            <p className="font-semibold">{g.title}</p>
            <div className="rounded-xl border border-border bg-surface p-2">
              <LiveGraph
                points={[...g.points].sort((a, b) => a.x - b.x)}
                xLabel={g.xLabel}
                yLabel={g.yLabel}
                xUnit=""
                yUnit=""
                line={g.line !== "points"}
                dots
              />
            </div>
            <figcaption className="text-sm text-muted">
              Plotted by Prism from the sample observations.
            </figcaption>
          </figure>
        );
      }
      case "result": {
        const r = value as SectionValue<"result">;
        return (
          <>
            <Markdown>{r.statement}</Markdown>
            <p className="text-sm">
              <b>{s.rangeLabel ?? "Typical values"}:</b> {r.typicalRange}
            </p>
          </>
        );
      }
      case "precautions": {
        const p = value as SectionValue<"precautions">;
        return (
          <>
            <h3 className="font-semibold">Precautions</h3>
            <List items={p.precautions} />
            <h3 className="font-semibold">Sources of error</h3>
            <List items={p.errors} />
          </>
        );
      }
      case "qa":
        return (
          <ul className="flex flex-col gap-2">
            {(value as SectionValue<"qa">).map((q, i) => (
              <li key={i}>
                <details className="rounded-xl border border-border px-3 py-2">
                  <summary className="cursor-pointer font-semibold">
                    Q{i + 1}. {q.question}
                  </summary>
                  <div className="mt-2">
                    <Markdown>{q.answer}</Markdown>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        );
      case "code":
        return <CodeExamples examples={value as SectionValue<"code">} />;
      case "trace": {
        const code = archetype.sections.find((x) => x.kind === "code");
        const examples = code ? (v(code.id) as SectionValue<"code"> | null) : null;
        return examples ? (
          <TraceView trace={value as SectionValue<"trace">} examples={examples} />
        ) : null;
      }
      case "fixes":
        return <FixList items={value as SectionValue<"fixes">} />;
      case "practice":
        return <PracticeList items={value as SectionValue<"practice">} />;
      case "drawing":
        return <DrawingBoard drawing={value as SectionValue<"drawing">} still={s.still} />;
      case "codes":
        return (
          <>
            <ul className="flex flex-col gap-1">
              {(value as SectionValue<"codes">).map((c) => (
                <li key={c.number}>
                  <b>{c.number}</b>: {c.title}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">
              Prism names the standard only. Read its text from the Bureau of Indian Standards (BIS)
              or your lab manual.
            </p>
          </>
        );
      case "simulation":
        // Nothing to try (no template fits and no Virtual Lab): no empty section.
        if (!value && !meta.virtualLab) return null;
        return (
          <Simulation lesson={lesson} sim={(value as LabSimulation | null | undefined) ?? null} />
        );
      case "videos":
        return <LabVideos subject={meta.subject} topic={meta.topic} />;
    }
  };

  const rendered = visible
    .map((s) => ({ s, node: body(s) }))
    .filter(
      (x): x is { s: SectionSpec; node: ReactNode } => x.node !== null && x.node !== undefined,
    );
  const hasSimSection = rendered.some((x) => x.s.kind === "simulation");

  return (
    <div
      className="flex flex-col gap-4"
      data-testid="practical-lesson"
      data-archetype={archetype.id}
    >
      {rendered.map(({ s, node }, i) => (
        <Part key={s.id} n={i + 1} title={s.title} id={s.id}>
          {node}
        </Part>
      ))}
      {!hasSimSection && meta.virtualLab && <VirtualLab lab={meta.virtualLab} />}
      <Footer meta={meta} />
    </div>
  );
}

function Simulation({ lesson, sim }: { lesson: LabLesson; sim: LabSimulation | null }) {
  return (
    <>
      {sim ? (
        <VisualSlot visual={sim} />
      ) : (
        <p className="text-sm text-muted" data-testid="sim-fallback">
          Prism has no interactive model for this experiment yet.
        </p>
      )}
      {lesson.meta.virtualLab && <VirtualLab lab={lesson.meta.virtualLab} />}
    </>
  );
}

function VirtualLab({ lab }: { lab: NonNullable<LabLesson["meta"]["virtualLab"]> }) {
  return (
    <p className="text-sm" data-testid="virtual-lab">
      Also try:{" "}
      <a
        href={lab.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary underline"
      >
        {lab.title}
      </a>{" "}
      <span className="text-muted">({lab.lab}, Virtual Labs, Government of India, free)</span>
    </p>
  );
}

function Footer({ meta }: { meta: LabLesson["meta"] }) {
  return (
    <footer className="flex flex-col gap-1 text-sm text-muted">
      {meta.sources.length > 0 ? (
        <p>
          Sources:{" "}
          {meta.sources.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ", "}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {s.title}
                </a>
              ) : (
                s.title
              )}{" "}
              ({s.publisher}
              {s.license ? `, ${s.license}` : ""})
            </span>
          ))}
        </p>
      ) : (
        <p>No outside sources were found; this lesson follows standard lab-manual content.</p>
      )}
      {meta.generatedBy && (
        <p>
          Written by {meta.generatedBy.provider}
          {meta.generatedBy.model ? ` (${meta.generatedBy.model})` : ""}. Check values against your
          lab manual.
        </p>
      )}
    </footer>
  );
}
