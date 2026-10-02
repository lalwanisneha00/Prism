import { Card } from "@/components/lesson/BlockHeading";
import { Formula, Markdown } from "@/components/lesson/Markdown";
import type { Lesson, Link, Source } from "@/lib/schema";

export function Prerequisites({ items }: { items: Lesson["prerequisites"] }) {
  if (items.length === 0) return <Empty>No prerequisites for this topic.</Empty>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((p) => (
        <li key={p.concept}>
          <Card className="h-full">
            <p className="font-semibold">{p.concept}</p>
            <Markdown className="mt-1 text-sm text-muted">{p.oneLiner}</Markdown>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function Analogies({ items }: { items: Lesson["analogies"] }) {
  if (items.length === 0) return <Empty>No analogies for this lesson.</Empty>;
  return (
    <div className="grid gap-4">
      {items.map((a, i) => (
        <Card key={a.concept} className="flex flex-col gap-3" data-anno-block={`analogy:${i}`}>
          <p className="text-sm font-semibold text-primary">{a.concept}</p>
          <Markdown>{a.analogy}</Markdown>
          <div className="rounded-xl bg-surface-2 p-3 text-sm">
            <p className="font-semibold">Where the analogy breaks</p>
            <Markdown className="text-muted">{a.whereItBreaks}</Markdown>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function Misconceptions({ items }: { items: Lesson["misconceptions"] }) {
  if (items.length === 0) return <Empty>No common mistakes listed.</Empty>;
  return (
    <div className="grid gap-4">
      {items.map((m, i) => (
        <Card key={m.wrong} className="flex flex-col gap-3" data-anno-block={`mistake:${i}`}>
          <div className="flex gap-2">
            <span aria-hidden="true" className="font-bold text-danger">
              ✗
            </span>
            <div className="min-w-0 flex-1">
              <p className="sr-only">Wrong:</p>
              <Markdown className="text-muted line-through decoration-danger/60">
                {m.wrong}
              </Markdown>
            </div>
          </div>
          <div className="flex gap-2">
            <span aria-hidden="true" className="font-bold text-success">
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <p className="sr-only">Right:</p>
              <Markdown className="font-medium">{m.right}</Markdown>
            </div>
          </div>
          <Markdown className="text-sm text-muted">{m.why}</Markdown>
        </Card>
      ))}
    </div>
  );
}

export function RevisionSheet({ sheet }: { sheet: Lesson["revisionSheet"] }) {
  return (
    <Card className="flex flex-col gap-5 border-primary/40" data-anno-block="revision">
      {sheet.formulas.length > 0 && (
        <div>
          <p className="font-semibold">Formulas</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {sheet.formulas.map((f) => (
              <li key={f} className="min-w-0 rounded-xl bg-surface-2 px-3">
                <Formula latex={f} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="font-semibold">Key points</p>
        <ul className="mt-2 flex flex-col gap-2">
          {sheet.keyPoints.map((k) => (
            <li key={k} className="flex gap-2">
              <span aria-hidden="true" className="text-primary">
                ●
              </span>
              <Markdown className="min-w-0 flex-1">{k}</Markdown>
            </li>
          ))}
        </ul>
      </div>
      {sheet.mnemonics && sheet.mnemonics.length > 0 && (
        <div>
          <p className="font-semibold">Memory tricks</p>
          {sheet.mnemonics.map((m) => (
            <Markdown key={m} className="mt-1 italic">
              {m}
            </Markdown>
          ))}
        </div>
      )}
    </Card>
  );
}

function LinkList({ title, links }: { title: string; links: Link[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              {l.title}
            </a>
            <span className="text-sm text-muted"> · {l.publisher}</span>
            {l.note && <p className="text-sm text-muted">{l.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FurtherLearning({ links }: { links: Lesson["furtherLearning"] }) {
  const total = links.videos.length + links.papers.length + links.readings.length;
  if (total === 0) return <Empty>No extra resources for this lesson.</Empty>;
  return (
    <Card className="flex flex-col gap-5">
      <LinkList title="Videos and lectures" links={links.videos} />
      <LinkList title="Reading and simulations" links={links.readings} />
      <LinkList title="Papers" links={links.papers} />
    </Card>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ol className="flex flex-col gap-2 text-sm">
      {sources.map((s, i) => (
        <li key={s.id} id={`source-${s.id}`} className="flex scroll-mt-20 gap-2">
          <span className="text-muted">[{i + 1}]</span>
          <span>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                {s.title}
              </a>
            ) : (
              <span className="font-medium">📒 {s.title}</span>
            )}
            <span className="text-muted">
              {" "}
              · {s.publisher}
              {s.license && ` · ${s.license}`}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-muted">{children}</p>;
}
