"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useAnnotations } from "@/components/annotations/AnnotationsProvider";
import { Formula, Markdown } from "@/components/lesson/Markdown";
import { highlightColors } from "@/lib/annotations/store";
import type { LessonRequest } from "@/lib/lessonRequest";
import type { Lesson } from "@/lib/schema";
import { tierCopy, type TrustTier } from "@/lib/tiers";

const subscribe = () => () => {};

/** "🖨️ Revision PDF": opens the print dialog, where "Save as PDF" makes the file. */
export function ExportPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold whitespace-nowrap hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      🖨️ Revision PDF
    </button>
  );
}

/**
 * The printable revision sheet (SPEC §8): only visible when printing. Rendered at the top of
 * <body> so print styles can hide the rest of the page.
 */
export function PrintSheet({
  lesson,
  request,
  tier,
}: {
  lesson: Lesson;
  request: LessonRequest;
  tier: TrustTier;
}) {
  // Portals need the browser's document: only render after hydration.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const anno = useAnnotations();
  if (!mounted) return null;
  const sheet = lesson.revisionSheet;
  const colorLabel = (c?: string) => highlightColors.find((x) => x.color === c)?.label ?? "Comment";
  const notes = [...(anno?.annotations ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  return createPortal(
    <div id="print-root" className="print-sheet">
      <header>
        <p className="print-muted">
          Prism revision sheet · {request.subject.name} › {request.chapter.name} ·{" "}
          {request.level.name}
        </p>
        <h1>{lesson.meta.title}</h1>
        <p className="print-muted">
          {tierCopy[tier].badge} · printed {new Date().toLocaleDateString()}
        </p>
      </header>

      {sheet.formulas.length > 0 && (
        <section>
          <h2>Formulas</h2>
          {sheet.formulas.map((f) => (
            <Formula key={f} latex={f} />
          ))}
        </section>
      )}
      <section>
        <h2>Key points</h2>
        <ul>
          {sheet.keyPoints.map((k) => (
            <li key={k}>
              <Markdown>{k}</Markdown>
            </li>
          ))}
        </ul>
      </section>
      {sheet.mnemonics && sheet.mnemonics.length > 0 && (
        <section>
          <h2>Memory tricks</h2>
          {sheet.mnemonics.map((m) => (
            <Markdown key={m}>{m}</Markdown>
          ))}
        </section>
      )}
      {lesson.glossary && lesson.glossary.length > 0 && (
        <section>
          <h2>Glossary</h2>
          <dl>
            {lesson.glossary.map((g) => (
              <div key={g.term}>
                <dt>{g.term}</dt>
                <dd>{g.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {lesson.workedExamples.length > 0 && (
        <section>
          <h2>Worked examples (answers)</h2>
          <ol>
            {lesson.workedExamples.map((w, i) => (
              <li key={i}>
                <Markdown>{w.problem}</Markdown>
                <div className="print-answer">
                  <Markdown>{`**Answer:** ${w.answer}`}</Markdown>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {lesson.misconceptions.length > 0 && (
        <section>
          <h2>Common mistakes</h2>
          <ul>
            {lesson.misconceptions.map((m) => (
              <li key={m.wrong}>
                <Markdown>{`✗ ${m.wrong}`}</Markdown>
                <Markdown>{`✓ ${m.right}`}</Markdown>
              </li>
            ))}
          </ul>
        </section>
      )}
      {notes.length > 0 && (
        <section>
          <h2>My notes</h2>
          <ul>
            {notes.map((n) => (
              <li key={n.id}>
                <strong>{colorLabel(n.color)}:</strong>{" "}
                {n.anchor ? `“${n.anchor.quote}”` : "(note on the lesson)"}
                {n.comment.trim() && <p className="print-comment">{n.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2>Sources</h2>
        <ol className="print-sources">
          {lesson.meta.sources.map((s) => (
            <li key={s.id}>
              {s.title} · {s.publisher}
              {s.license ? ` · ${s.license}` : ""}
              {s.url && <span className="print-muted"> · {s.url}</span>}
            </li>
          ))}
        </ol>
        <p className="print-muted">
          AI-generated study aid: check anything important against your textbook.
        </p>
      </section>
    </div>,
    document.body,
  );
}
