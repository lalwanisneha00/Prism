"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useUniversityScope } from "@/components/university/useUniversityScope";
import { apiFetch } from "@/lib/byok/apiFetch";
import { ACCEPT } from "@/lib/extract/detect";
import { extractFile } from "@/lib/extract/extractFile";
import { docText, ExtractError } from "@/lib/extract/types";
import { subjects as catalogue, type Subject } from "@/lib/subjects";
import { applyUniversity, clearUniversity, type ReviewEntry } from "@/lib/university/apply";
import { AiSyllabusSchema } from "@/lib/university/ai";
import { matchSubject, scopeFor, type SubjectMatch } from "@/lib/university/match";
import { parseUniversitySyllabus, type UniSyllabus } from "@/lib/university/parse";

const field = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

type Row = ReviewEntry & { match: SubjectMatch };

function toRows(syllabus: UniSyllabus): Row[] {
  return syllabus.subjects.map((uni) => {
    const match = matchSubject(uni, catalogue);
    return {
      uni,
      semester: uni.semester,
      match,
      choice: match.best ? { kind: "built-in", subjectId: match.best.subject.id } : { kind: "own" },
    };
  });
}

const choiceValue = (c: ReviewEntry["choice"]) =>
  c.kind === "built-in" ? `built:${c.subjectId}` : c.kind;

function RowView({ row, onChange }: { row: Row; onChange: (next: Row) => void }) {
  const id = useId();
  const subject: Subject | undefined =
    row.choice.kind === "built-in"
      ? catalogue.find((s) => s.id === (row.choice as { subjectId: string }).subjectId)
      : undefined;
  const scope = useMemo(
    () => (subject ? scopeFor(subject, [row.uni]) : undefined),
    [subject, row.uni],
  );
  const hidden = new Set(row.hiddenChapters ?? []);
  const included = new Set(row.includedChapters ?? []);
  const topics = row.uni.units.reduce((n, u) => n + u.topics.length, 0);
  const candidates = [row.match.best, ...row.match.others].filter((c): c is NonNullable<typeof c> =>
    Boolean(c),
  );

  return (
    <li
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      data-testid="uni-row"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {row.uni.name}
          {row.uni.code && (
            <span className="ml-2 text-sm font-normal text-muted">{row.uni.code}</span>
          )}
        </p>
        <p className="text-xs text-muted">
          {row.uni.units.length} unit{row.uni.units.length === 1 ? "" : "s"} · {topics} topics read
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-use`}>
          <span className="font-semibold">Use</span>
          <select
            id={`${id}-use`}
            value={choiceValue(row.choice)}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...row,
                hiddenChapters: [],
                choice: v.startsWith("built:")
                  ? { kind: "built-in", subjectId: v.slice(6) }
                  : v === "own"
                    ? { kind: "own" }
                    : { kind: "skip" },
              });
            }}
            className={field}
          >
            {candidates.map((c) => (
              <option key={c.subject.id} value={`built:${c.subject.id}`}>
                Prism&apos;s {c.subject.name}
              </option>
            ))}
            <option value="own">A subject of my own (from this syllabus)</option>
            <option value="skip">Skip it</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-sem`}>
          <span className="font-semibold">Semester</span>
          <select
            id={`${id}-sem`}
            value={row.semester ?? ""}
            onChange={(e) =>
              onChange({ ...row, semester: e.target.value ? Number(e.target.value) : undefined })
            }
            className={field}
          >
            <option value="">Not placed in a semester</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {subject && (
        <details className="rounded-xl border border-border p-3 text-sm">
          <summary className="cursor-pointer font-semibold">
            {scope
              ? `Your university teaches ${subject.chapters.filter((c) => (scope[c.id] ? !hidden.has(c.id) : included.has(c.id))).length} of ${subject.chapters.length} chapters of ${subject.name}`
              : `Couldn't tell which chapters of ${subject.name} are left out: all ${subject.chapters.length} are kept`}
          </summary>
          <p className="mt-2 text-muted">
            Untick a chapter your university does not teach; it is then hidden everywhere.
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {subject.chapters.map((c) => {
              const taught = scope ? Boolean(scope[c.id]) : true;
              const on = taught ? !hidden.has(c.id) : included.has(c.id);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        // A chapter the syllabus mentions is hidden by unticking it; one it does
                        // not mention starts hidden and is added back by ticking it.
                        const set = new Set(taught ? hidden : included);
                        if (taught ? e.target.checked : !e.target.checked) set.delete(c.id);
                        else set.add(c.id);
                        onChange(
                          taught
                            ? { ...row, hiddenChapters: [...set] }
                            : { ...row, includedChapters: [...set] },
                        );
                      }}
                      className="mt-1 accent-primary"
                    />
                    <span>
                      {c.name}
                      {scope && !scope[c.id] && (
                        <span className="block text-xs text-muted">Not in your syllabus</span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </li>
  );
}

/**
 * "My university syllabus": the student adds their official syllabus; Prism reads it, matches its
 * subjects to the ones it teaches, and shows only the subjects, chapters and topics their university
 * actually teaches. They review everything before it is applied, and can undo it.
 */
export function UniversitySyllabus() {
  const id = useId();
  const applied = useUniversityScope();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  function show(syllabus: UniSyllabus): boolean {
    if (syllabus.subjects.length === 0) return false;
    setRows(toRows(syllabus));
    setMessage(null);
    return true;
  }

  async function readFile(file: File) {
    setBusy("Reading your file…");
    try {
      setText(docText(await extractFile(file)));
      setMessage(null);
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof ExtractError ? err.message : "That file couldn't be read.",
      });
    } finally {
      setBusy(null);
    }
  }

  function analyse() {
    if (!show(parseUniversitySyllabus(text))) {
      setRows(null);
      setMessage({
        kind: "error",
        text: "I couldn't find subjects with units in that text. Check that it lists each subject with its units, or try “Read it with AI”.",
      });
    }
  }

  async function analyseWithAi() {
    setBusy("The AI is reading your syllabus…");
    try {
      const res = await apiFetch("/api/syllabus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        syllabus?: unknown;
        message?: string;
      } | null;
      const parsed = AiSyllabusSchema.safeParse(body?.syllabus);
      if (res.ok && body?.ok && parsed.success && show(parsed.data)) return;
      setMessage({
        kind: "error",
        text: body?.message ?? "The AI couldn't read that syllabus. Try again in a minute.",
      });
    } catch {
      setMessage({ kind: "error", text: "Couldn't reach Prism. Check your connection." });
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    if (!rows) return;
    setBusy("Applying…");
    try {
      const result = await applyUniversity(name || "your university", rows, catalogue);
      applied.reload();
      setMessage({
        kind: "ok",
        text: `Done. ${result.scoped} subject${result.scoped === 1 ? "" : "s"} now show only what your university teaches${result.created ? `, and ${result.created} new subject${result.created === 1 ? "" : "s"} of your own ${result.created === 1 ? "was" : "were"} added` : ""}.`,
      });
      setRows(null);
    } catch {
      setMessage({ kind: "error", text: "Couldn't save. Check that this browser allows storage." });
    } finally {
      setBusy(null);
    }
  }

  const semesters = rows
    ? [...new Set(rows.map((r) => r.semester ?? 0))].sort((a, b) => (a || 99) - (b || 99))
    : [];

  return (
    <div className="flex flex-col gap-6" data-testid="university-syllabus">
      {applied.loaded && Object.keys(applied.scopes).length > 0 && (
        <section
          aria-label="Applied syllabus"
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-2 p-4 text-sm"
          data-testid="uni-applied"
        >
          <p className="font-semibold">
            {applied.active
              ? `Applied: ${applied.name || "your university"}`
              : "Your university syllabus is saved but switched off"}
          </p>
          <p className="text-muted">
            {Object.keys(applied.scopes).length} subject
            {Object.keys(applied.scopes).length === 1 ? "" : "s"} are limited to what it teaches.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applied.setOff(applied.active)}
              className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-bg"
            >
              {applied.active ? "Show everything again" : "Use my university's syllabus again"}
            </button>
            <button
              type="button"
              onClick={() => void clearUniversity().then(applied.reload)}
              className="rounded-full border border-danger/40 px-4 py-2 font-semibold text-danger hover:bg-danger/10"
            >
              Remove it
            </button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <div>
          <h2 className="text-xl font-semibold">Add your official syllabus</h2>
          <p className="mt-1 text-sm text-muted">
            Upload your branch&apos;s syllabus (PDF, Word, slides, a photo) or paste it. Prism reads
            it on this device, works out which subjects you study in which semester and which
            chapters your university leaves out, and shows you everything to check before it changes
            anything.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-name`}>
          <span className="font-semibold">University and branch (optional)</span>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Anna University, Mechanical"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-file`}>
          <span className="font-semibold">Upload the syllabus</span>
          <input
            id={`${id}-file`}
            type="file"
            accept={ACCEPT}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
              e.target.value = "";
            }}
            className="text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-text`}>
          <span className="font-semibold">Or paste it here</span>
          <textarea
            id={`${id}-text`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={
              "Semester I\nMA101 Engineering Mathematics I\nUnit 1: Matrices - rank, eigenvalues, …"
            }
            className={`${field} font-mono`}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={analyse}
            disabled={!text.trim() || Boolean(busy)}
            className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
          >
            Read my syllabus
          </button>
          <button
            type="button"
            onClick={() => void analyseWithAi()}
            disabled={text.trim().length < 40 || Boolean(busy)}
            className="rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-surface-2 disabled:opacity-60"
          >
            Read it with AI
          </button>
          <span className="text-xs text-muted">
            The AI option sends the text (not the file) to the AI to read messy layouts.
          </span>
        </div>
        <div aria-live="polite" className="min-h-5 text-sm">
          {busy && <p className="text-muted">{busy}</p>}
          {message && (
            <p
              role={message.kind === "error" ? "alert" : "status"}
              className={message.kind === "error" ? "text-danger" : "text-success"}
              data-testid={message.kind === "ok" ? "uni-done" : "uni-error"}
            >
              {message.text}
            </p>
          )}
        </div>
      </section>

      {rows && (
        <section className="flex flex-col gap-4" aria-label="Review">
          <div>
            <h2 className="text-xl font-semibold">Check what I found</h2>
            <p className="text-sm text-muted">
              {rows.length} subject{rows.length === 1 ? "" : "s"} found. Change anything that is
              wrong; nothing is applied until you press the button at the end.
            </p>
          </div>
          {semesters.map((sem) => (
            <div key={sem} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-muted uppercase">
                {sem ? `Semester ${sem}` : "Semester not found"}
              </h3>
              <ul className="flex flex-col gap-3">
                {rows.map((r, i) =>
                  (r.semester ?? 0) === sem ? (
                    <RowView
                      key={`${r.uni.name}-${i}`}
                      row={r}
                      onChange={(next) => setRows(rows.map((x, k) => (k === i ? next : x)))}
                    />
                  ) : null,
                )}
              </ul>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void apply()}
              disabled={Boolean(busy)}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
            >
              Apply my syllabus
            </button>
            <button
              type="button"
              onClick={() => setRows(null)}
              className="rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-surface-2"
            >
              Start again
            </button>
          </div>
        </section>
      )}

      <p className="text-sm text-muted">
        After applying, see your subjects under{" "}
        <Link href="/subjects" className="font-semibold text-primary underline">
          Subjects
        </Link>
        . Your file stays on this device; only the subjects and chapters chosen are saved to your
        account.
      </p>
    </div>
  );
}
