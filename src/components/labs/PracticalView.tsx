"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LabVideos } from "@/components/labs/LabVideos";
import { ObservationTable } from "@/components/labs/ObservationTable";
import { ProcedureSteps } from "@/components/labs/ProcedureSteps";
import { Formula, Markdown } from "@/components/lesson/Markdown";
import { VisualSlot } from "@/components/lesson/VisualSlot";
import type { PracticalLesson } from "@/lib/labs/practicalSchema";

/** The 11 parts of a lab lesson, in lab-record order (syllabus fix, Phase 7B). */
export const PRACTICAL_SECTIONS = [
  "Aim",
  "Theory",
  "Apparatus",
  "Procedure",
  "Observation table",
  "Calculations",
  "Result",
  "Precautions and sources of error",
  "Viva questions",
  "Interactive simulation",
  "Video demonstrations",
] as const;

function Part({ n, children }: { n: number; children: ReactNode }) {
  const title = PRACTICAL_SECTIONS[n - 1];
  return (
    <section
      aria-labelledby={`lab-part-${n}`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5"
      data-testid="lab-section"
    >
      <h2 id={`lab-part-${n}`} className="text-xl font-bold tracking-tight">
        <span className="text-muted">{n}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

export function PracticalView({ lesson }: { lesson: PracticalLesson }) {
  const { meta } = lesson;
  return (
    <div className="flex flex-col gap-4" data-testid="practical-lesson">
      <Part n={1}>
        <Markdown>{lesson.aim}</Markdown>
      </Part>

      <Part n={2}>
        <Markdown>{lesson.theory.body}</Markdown>
        {lesson.theory.formulas.length > 0 && (
          <ul className="flex flex-col gap-2">
            {lesson.theory.formulas.map((f, i) => (
              <li key={i} className="rounded-xl bg-surface-2 px-3 py-2">
                <Formula latex={f.latex} />
                <p className="text-sm text-muted">{f.meaning}</p>
              </li>
            ))}
          </ul>
        )}
        {meta.theoryLinks && meta.theoryLinks.length > 0 && (
          <div className="text-sm">
            <p className="font-semibold">Revise the theory first:</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {meta.theoryLinks.map((t) => (
                <li key={`${t.subject}/${t.topic}`}>
                  <Link
                    href={`/start?${new URLSearchParams({ subject: t.subject, chapter: t.chapter, topic: t.topic })}`}
                    className="inline-block rounded-full border border-border px-3 py-1 hover:bg-surface-2"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Part>

      <Part n={3}>
        <ul className="list-disc pl-5">
          {lesson.apparatus.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          The setup diagram is with the procedure below: tap a step to see the parts it uses.
        </p>
      </Part>

      <Part n={4}>
        <ProcedureSteps lesson={lesson} />
      </Part>

      <Part n={5}>
        <ObservationTable table={lesson.observations} />
      </Part>

      <Part n={6}>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          {lesson.calculations.steps.map((s, i) => (
            <li key={i}>
              <Markdown>{s}</Markdown>
            </li>
          ))}
        </ol>
        {lesson.calculations.check && (
          <p className="text-sm text-success" data-testid="calc-checked">
            ✓ Prism recalculated this result from the sample values.
          </p>
        )}
      </Part>

      <Part n={7}>
        <Markdown>{lesson.result.statement}</Markdown>
        <p className="text-sm">
          <b>Typical values:</b> {lesson.result.typicalRange}
        </p>
      </Part>

      <Part n={8}>
        <h3 className="font-semibold">Precautions</h3>
        <ul className="list-disc pl-5">
          {lesson.precautions.map((p, i) => (
            <li key={i}>
              <Markdown>{p}</Markdown>
            </li>
          ))}
        </ul>
        <h3 className="font-semibold">Sources of error</h3>
        <ul className="list-disc pl-5">
          {lesson.errors.map((p, i) => (
            <li key={i}>
              <Markdown>{p}</Markdown>
            </li>
          ))}
        </ul>
      </Part>

      <Part n={9}>
        <ul className="flex flex-col gap-2">
          {lesson.viva.map((v, i) => (
            <li key={i}>
              <details className="rounded-xl border border-border px-3 py-2">
                <summary className="cursor-pointer font-semibold">
                  Q{i + 1}. {v.question}
                </summary>
                <div className="mt-2">
                  <Markdown>{v.answer}</Markdown>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Part>

      <Part n={10}>
        {lesson.simulation ? (
          <VisualSlot visual={lesson.simulation} />
        ) : (
          <>
            <p className="text-sm text-muted" data-testid="sim-fallback">
              No interactive model fits this experiment yet, so here is its procedure, step by step.
            </p>
            <ProcedureSteps lesson={lesson} animated />
          </>
        )}
        {meta.virtualLab && (
          <p className="text-sm" data-testid="virtual-lab">
            Also try:{" "}
            <a
              href={meta.virtualLab.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline"
            >
              {meta.virtualLab.title}
            </a>{" "}
            <span className="text-muted">
              ({meta.virtualLab.lab}, Virtual Labs, Government of India, free)
            </span>
          </p>
        )}
      </Part>

      <Part n={11}>
        <LabVideos subject={meta.subject} topic={meta.topic} />
      </Part>

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
            {meta.generatedBy.model ? ` (${meta.generatedBy.model})` : ""}. Check values against
            your lab manual.
          </p>
        )}
      </footer>
    </div>
  );
}
