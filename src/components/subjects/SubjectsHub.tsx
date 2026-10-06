"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useCustomSubjects } from "@/components/custom/useCustomSubjects";
import { useMyBranch } from "@/components/subjects/useMyBranch";
import { useMySemester } from "@/components/subjects/useMySemester";
import { useSyllabus } from "@/components/subjects/useSyllabus";
import { countsOf, indexedSubject, subjectIndex, subjectsInSemester } from "@/lib/catalogue";
import { SEMESTERS } from "@/lib/semester/mySemester";
import { branches } from "@/lib/subjects";
import { coverageFor, NOTE_OUTSIDE, NOTE_LATER } from "@/lib/syllabus/coverage";
import { removeSemester } from "@/lib/syllabus/store";
import type { StoredSubject, SyllabusByTerm } from "@/lib/syllabus/types";

// The syllabus reader and Prism's subject data load only when the student opens "Upload".
const SyllabusUpload = dynamic(() => import("@/components/subjects/SyllabusUpload"), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-xl bg-surface-2" aria-busy="true" />,
});

const select =
  "rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-2 focus-visible:outline-primary";
const card = "flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4";

type CardData = {
  id: string;
  name: string;
  href: string;
  own: boolean;
  suggested: boolean;
  stored?: StoredSubject;
};

function Note({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "info";
}) {
  return (
    <p
      className={`rounded-xl px-3 py-2 text-xs ${tone === "info" ? "bg-primary-soft" : "bg-surface-2 text-muted"}`}
    >
      {children}
    </p>
  );
}

function SubjectCard({
  data,
  syllabus,
  semester,
  onRemove,
}: {
  data: CardData;
  syllabus: SyllabusByTerm;
  semester: number;
  onRemove?: () => void;
}) {
  const cov = data.own ? null : coverageFor(data.id, syllabus);
  const indexed = data.own ? undefined : indexedSubject(data.id);
  const totals = indexed ? countsOf(indexed) : null;
  const entry = cov?.entries.find((e) => e.semester === semester) ?? cov?.entries[0];
  const extra = cov?.entries.flatMap((e) => e.extra) ?? [];

  return (
    <li className={card} data-testid="subject-card">
      <div className="flex items-start justify-between gap-3">
        <Link href={data.href} className="font-semibold hover:underline">
          {data.name}
        </Link>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${data.name} from semester ${semester}`}
            className="shrink-0 text-xs font-semibold text-muted underline"
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-sm text-muted">
        {data.suggested && "Suggested for your branch · "}
        {entry
          ? `${entry.topicCount} topic${entry.topicCount === 1 ? "" : "s"} in your syllabus${entry.credits ? ` · ${entry.credits} credits` : ""}`
          : data.stored
            ? `${data.stored.topicCount} topics in your syllabus${data.stored.credits ? ` · ${data.stored.credits} credits` : ""}`
            : totals
              ? `${totals.chapters} chapters · ${totals.topics} topics`
              : data.own
                ? "Your own subject"
                : ""}
      </p>
      {cov && totals && (
        <Note>
          {cov.mode === "split"
            ? `${entry?.name ?? "Your syllabus"} covers ${cov.coveredCount} of ${totals.topics} topics of this subject. The rest: ${NOTE_LATER.toLowerCase()}`
            : `${totals.topics - cov.coveredCount} topics here are not in your syllabus. You can still study them for a better understanding of the subject.`}
        </Note>
      )}
      {extra.length > 0 && (
        <details className="text-sm" data-testid="not-on-prism">
          <summary className="cursor-pointer font-semibold">
            In your syllabus, not on Prism yet ({extra.length})
          </summary>
          <ul className="mt-2 list-disc pl-5 text-muted">
            {extra.slice(0, 20).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <Link
            href={`/my-subjects/new?name=${encodeURIComponent(`${data.name} (extra topics)`)}&semester=${semester}`}
            className="mt-2 inline-block font-semibold text-primary underline"
          >
            Upload faculty material for these (optional)
          </Link>
        </details>
      )}
      {data.own && (
        <Note tone="info">
          Upload the material given by your faculty to study this subject here. This is optional and
          you can do it any time.
          <Link href={`${data.href}`} className="mt-1 block font-semibold text-primary underline">
            Open this subject
          </Link>
        </Note>
      )}
    </li>
  );
}

/** "My subjects": branch and semester, the syllabus upload, personal cards, and everything else collapsed. */
export function SubjectsHub() {
  const id = useId();
  const { mine, loaded: mineLoaded, save } = useMyBranch();
  const { picks, loaded: picksLoaded, toggle } = useMySemester();
  const { syllabus } = useSyllabus();
  const custom = useCustomSubjects();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const semester = mine.semester;
  const term = semester ? syllabus[String(semester)] : undefined;
  const loaded = mineLoaded && picksLoaded && custom.loaded;

  const cards = useMemo<CardData[]>(() => {
    if (!semester) return [];
    const out: CardData[] = [];
    const seen = new Set<string>();
    for (const pid of picks) {
      const stored = term?.subjects.find(
        (s) => (s.match.kind === "prism" ? s.match.subjectId : s.match.customId) === pid,
      );
      const rec = custom.records.find((r) => r.id === pid);
      const idx = indexedSubject(pid);
      if (seen.has(pid) || (!rec && !idx)) continue;
      seen.add(pid);
      out.push(
        rec
          ? {
              id: pid,
              name: rec.name,
              href: `/my-subjects/view?id=${pid}`,
              own: true,
              suggested: false,
              stored,
            }
          : {
              id: pid,
              name: idx!.name,
              href: `/subjects/${pid}`,
              own: false,
              suggested: false,
              stored,
            },
      );
    }
    if (out.length === 0) {
      for (const s of subjectsInSemester(semester, mine.branch).slice(0, 12)) {
        out.push({
          id: s.id,
          name: s.name,
          href: `/subjects/${s.id}`,
          own: false,
          suggested: true,
        });
      }
    }
    return out;
  }, [semester, picks, term, custom.records, mine.branch]);

  const shown = new Set(cards.map((c) => c.id));
  const q = query.trim().toLowerCase();
  const others = subjectIndex.filter(
    (s) =>
      !shown.has(s.id) &&
      (!q || s.name.toLowerCase().includes(q) || s.field.toLowerCase().includes(q)),
  );

  return (
    <div className="flex flex-col gap-6" data-testid="subjects-hub">
      {/* A: branch and semester */}
      <div className="flex flex-wrap items-end gap-3" data-testid="branch-bar">
        <label htmlFor={`${id}-branch`} className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">My branch</span>
          <select
            id={`${id}-branch`}
            value={mine.branch ?? ""}
            onChange={(e) =>
              save({
                ...(e.target.value ? { branch: e.target.value } : {}),
                semester: mine.semester,
              })
            }
            className={select}
          >
            <option value="">Any branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-sem`} className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Semester</span>
          <select
            id={`${id}-sem`}
            value={mine.semester ?? ""}
            onChange={(e) =>
              save({
                branch: mine.branch,
                ...(e.target.value ? { semester: Number(e.target.value) } : {}),
              })
            }
            className={select}
          >
            <option value="">Choose…</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* B + C + D: upload and analyse */}
      <section
        aria-labelledby={`${id}-up`}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
        data-testid="syllabus-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id={`${id}-up`} className="text-lg font-semibold">
              Upload your semester&apos;s official syllabus
            </h2>
            <p className="text-sm text-muted">
              Prism matches it with its subjects and notes what your syllabus covers. The file stays
              on this device.
            </p>
          </div>
          <button
            type="button"
            disabled={!semester}
            aria-expanded={uploadOpen}
            onClick={() => setUploadOpen((o) => !o)}
            className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
          >
            {uploadOpen ? "Close" : term ? "Upload again" : "Upload syllabus"}
          </button>
        </div>
        {!semester && <p className="text-sm text-muted">Choose your semester first.</p>}
        {semester && uploadOpen && (
          <SyllabusUpload
            semester={semester}
            onDone={(m) => {
              setDone(m);
              custom.reload();
              setUploadOpen(false);
            }}
          />
        )}
        {done && (
          <p
            role="status"
            className="text-sm font-semibold text-success"
            data-testid="syllabus-done"
          >
            {done}
          </p>
        )}
        {term && (
          <p className="text-xs text-muted">
            Syllabus saved for semester {semester}
            {term.fileName ? ` (${term.fileName})` : ""}.{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                if (semester) void removeSemester(semester);
                setDone(null);
              }}
            >
              Forget it
            </button>
          </p>
        )}
      </section>

      {/* E: personalised cards */}
      <section
        aria-labelledby={`${id}-mine`}
        className="flex flex-col gap-3"
        data-testid="my-subjects"
      >
        <h2 id={`${id}-mine`} className="text-xl font-semibold">
          {semester ? `My subjects, semester ${semester}` : "My subjects"}
        </h2>
        {!loaded && (
          <div className="h-24 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
        )}
        {loaded && !semester && (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
            Choose your branch and semester to see your subjects, or browse everything below.
          </p>
        )}
        {loaded && semester && cards.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
            No subjects for this semester yet. Upload your syllabus or add some from the list below.
          </p>
        )}
        {loaded && semester && cards.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <SubjectCard
                key={c.id}
                data={c}
                syllabus={syllabus}
                semester={semester}
                onRemove={c.suggested ? undefined : () => toggle(c.id, false)}
              />
            ))}
          </ul>
        )}
        {syllabus && term && term.labs.length > 0 && (
          <p className="text-xs text-muted">
            Lab courses in your syllabus: {term.labs.join(", ")}.
          </p>
        )}
      </section>

      {/* E: everything else, collapsed */}
      <details
        className="rounded-2xl border border-border bg-surface p-4"
        data-testid="all-subjects"
        suppressHydrationWarning
      >
        <summary className="cursor-pointer text-lg font-semibold">
          All other subjects on Prism{" "}
          <span className="text-sm font-normal text-muted">({others.length})</span>
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-q`}>
            <span className="font-semibold">Search subjects</span>
            <input
              id={`${id}-q`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type part of a name"
              className="rounded-xl border border-border bg-bg px-3 py-2"
            />
          </label>
          {others.length === 0 && (
            <p className="text-sm text-muted">No subject matches “{query}”.</p>
          )}
          <ul className="grid gap-2 sm:grid-cols-2">
            {others.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <Link href={`/subjects/${s.id}`} className="font-medium hover:underline">
                  {s.name}
                  <span className="block text-xs font-normal text-muted">{s.field}</span>
                </Link>
                {semester && (
                  <button
                    type="button"
                    onClick={() => toggle(s.id, true)}
                    aria-label={`Add ${s.name} to semester ${semester}`}
                    className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-surface-2"
                  >
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </details>
      <p className="text-sm text-muted">
        Non-core subjects such as Indian Knowledge System, or one that is not listed?{" "}
        <Link href="/my-subjects" className="font-semibold text-primary underline">
          Add a subject of your own
        </Link>
        .
      </p>
      <p className="sr-only">
        {NOTE_OUTSIDE} {NOTE_LATER}
      </p>
    </div>
  );
}
