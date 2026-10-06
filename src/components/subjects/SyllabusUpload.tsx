"use client";

import { useId, useMemo, useState } from "react";
import { apiFetch } from "@/lib/byok/apiFetch";
import { ACCEPT } from "@/lib/extract/detect";
import { extractFile } from "@/lib/extract/extractFile";
import { ExtractError, pagedText } from "@/lib/extract/types";
import { subjects as catalogue } from "@/lib/subjects";
import { coverageOf, propose, topicsOf, type Proposal } from "@/lib/syllabus/propose";
import { applySemester, type Choice } from "@/lib/syllabus/store";
import { AiSyllabusSchema } from "@/lib/university/ai";
import { parseUniversitySyllabus, type UniSyllabus } from "@/lib/university/parse";

const field = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";
const btn = "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2";

type Review = { syllabus: UniSyllabus; proposals: Proposal[]; fileName?: string };
type Row = { choice: Choice; resolved: boolean };

/** A clear match is used as is; an uncertain one waits for the student's answer. */
function initial(p: Proposal): Row {
  if (p.confidence === "high" && p.best)
    return { choice: { kind: "prism", subjectId: p.best.subject.id, by: "auto" }, resolved: true };
  if (p.confidence === "none") return { choice: { kind: "own" }, resolved: true };
  return {
    choice: p.suggestion
      ? { kind: "prism", subjectId: p.suggestion.subject.id, by: "confirmed" }
      : { kind: "own" },
    resolved: false,
  };
}

function MatchRow({
  proposal,
  row,
  onChange,
}: {
  proposal: Proposal;
  row: Row;
  onChange: (row: Row) => void;
}) {
  const id = useId();
  const [other, setOther] = useState(false);
  const { choice, resolved } = row;
  const target = choice.kind === "prism" ? catalogue.find((s) => s.id === choice.subjectId) : null;
  const sample = useMemo(() => {
    if (!target) return [];
    const names = new Map(topicsOf(target).map((t) => [t.key, t.name]));
    return coverageOf(target, proposal.uni)
      .covered.slice(0, 4)
      .map((k) => names.get(k) ?? "")
      .filter(Boolean);
  }, [target, proposal.uni]);
  const asking = !resolved;

  return (
    <li
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm"
      data-testid={asking ? "confirm-match" : "match-row"}
    >
      <p className="font-semibold">
        {proposal.uni.name}
        {proposal.uni.code ? (
          <span className="font-normal text-muted"> · {proposal.uni.code}</span>
        ) : null}
        {proposal.uni.unclear.length > 0 && (
          <span className="ml-2 font-normal text-danger">
            unclear: {proposal.uni.unclear.join(", ")}
          </span>
        )}
      </p>
      {asking && target && (
        <p>
          We think <strong>{proposal.uni.name}</strong> is <strong>{target.name}</strong>
          {sample.length > 0 ? <> (topics: {sample.join(", ")}…)</> : null}. Is this right?
        </p>
      )}
      {asking && (
        <div className="flex flex-wrap gap-2">
          {target && (
            <button
              type="button"
              className={btn}
              onClick={() => onChange({ choice, resolved: true })}
            >
              Yes
            </button>
          )}
          <button type="button" className={btn} onClick={() => setOther(true)}>
            Choose another subject
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => onChange({ choice: { kind: "own" }, resolved: true })}
          >
            Treat as new subject
          </button>
        </div>
      )}
      {other && (
        <label className="flex flex-col gap-1" htmlFor={id}>
          <span className="font-semibold">Which Prism subject is it?</span>
          <select
            id={id}
            className={field}
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              onChange({
                choice: { kind: "prism", subjectId: e.target.value, by: "confirmed" },
                resolved: true,
              });
              setOther(false);
            }}
          >
            <option value="">Choose…</option>
            {catalogue.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {resolved && (
        <p className="text-muted" data-testid="match-result">
          {choice.kind === "prism"
            ? `On Prism: ${target?.name ?? choice.subjectId}`
            : "Not on Prism: added as your own subject (uploading faculty material is optional)"}{" "}
          <button
            type="button"
            className="font-semibold text-primary underline"
            onClick={() => {
              setOther(false);
              onChange({ choice, resolved: false });
            }}
          >
            Change
          </button>
        </p>
      )}
    </li>
  );
}

/**
 * Upload the semester's official syllabus: it is read on this device (the file and its full text
 * are not stored), each subject is matched with Prism's, uncertain matches are put to the student,
 * and the result is saved as their personal syllabus. Loaded only when "Upload" is opened.
 */
export default function SyllabusUpload({
  semester,
  onDone,
}: {
  semester: number;
  onDone: (message: string) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  async function readSyllabus(source: string): Promise<UniSyllabus | null> {
    const ruled = parseUniversitySyllabus(source);
    if (ruled.subjects.length > 0) return ruled;
    if (source.trim().length < 40) return null;
    setBusy("Reading the layout with AI…");
    const res = await apiFetch("/api/syllabus", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: source }),
    });
    const body = (await res.json().catch(() => null)) as { syllabus?: unknown } | null;
    const parsed = AiSyllabusSchema.safeParse(body?.syllabus);
    return res.ok && parsed.success && parsed.data.subjects.length > 0 ? parsed.data : null;
  }

  async function analyse(source: string, fileName?: string) {
    setError(null);
    setReview(null);
    try {
      setBusy("Reading your syllabus…");
      const read = await readSyllabus(source);
      if (!read) {
        setError(
          "I couldn't find subjects with units in that text. Check that it lists each subject with its units, or paste just this semester's part.",
        );
        return;
      }
      // This semester's subjects (and ones the file does not date); other semesters are left out.
      const mine = read.subjects.filter((s) => !s.semester || s.semester === semester);
      if (mine.length === 0) {
        setError(
          `That file has no subjects for semester ${semester}. It covers other semesters: change the semester above.`,
        );
        return;
      }
      const proposals = mine.map((u) => propose(u, catalogue));
      setReview({ syllabus: { ...read, subjects: mine }, proposals, fileName });
      setRows(proposals.map(initial));
    } catch {
      setError("That couldn't be analysed. Try again, or paste the text instead.");
    } finally {
      setBusy(null);
    }
  }

  async function readFile(file: File) {
    setError(null);
    setBusy("Reading your file…");
    try {
      await analyse(pagedText(await extractFile(file)), file.name);
    } catch (err) {
      setBusy(null);
      setError(err instanceof ExtractError ? err.message : "That file couldn't be read.");
    }
  }

  async function save() {
    if (!review) return;
    setBusy("Saving…");
    try {
      const decisions = review.proposals.map((p, i) => ({ uni: p.uni, choice: rows[i].choice }));
      const { stored, created } = await applySemester(semester, decisions, catalogue, {
        fileName: review.fileName,
        labs: review.syllabus.labs,
      });
      const n = stored.subjects.length;
      onDone(
        `Saved ${n} subject${n === 1 ? "" : "s"} for semester ${semester}${created ? ` (${created} new of your own)` : ""}.`,
      );
      setReview(null);
      setText("");
    } catch {
      setError("Couldn't save. Check that this browser allows storage, then try again.");
    } finally {
      setBusy(null);
    }
  }

  const waiting = rows.filter((r) => !r.resolved).length;
  const labs = review?.syllabus.labs?.length ?? 0;

  return (
    <div className="flex flex-col gap-4" data-testid="syllabus-upload">
      {!review && (
        <>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-file`}>
            <span className="font-semibold">Syllabus file (PDF, Word, slides or photos)</span>
            <input
              id={`${id}-file`}
              type="file"
              accept={ACCEPT}
              disabled={Boolean(busy)}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void readFile(f);
                e.target.value = "";
              }}
              className="text-sm"
            />
          </label>
          <details className="text-sm">
            <summary className="w-fit cursor-pointer font-semibold">
              Or paste the syllabus text
            </summary>
            <textarea
              aria-label="Syllabus text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={"MA201 Engineering Mathematics III\nUnit 1: Complex analysis - …"}
              className={`${field} mt-2 w-full font-mono`}
            />
            <button
              type="button"
              onClick={() => void analyse(text)}
              disabled={!text.trim() || Boolean(busy)}
              className="mt-2 rounded-full bg-primary px-5 py-2 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
            >
              Analyse
            </button>
          </details>
        </>
      )}

      {review && (
        <div className="flex flex-col gap-3" data-testid="syllabus-review">
          <p className="text-sm text-muted">
            Found {review.proposals.length} subject{review.proposals.length === 1 ? "" : "s"}
            {labs > 0
              ? ` and ${labs} lab course${labs === 1 ? "" : "s"} (labs are not made into subjects)`
              : ""}
            . Check the matches, then save. Anything unclear is marked, never guessed.
          </p>
          <ul className="flex flex-col gap-3">
            {review.proposals.map((p, i) => (
              <MatchRow
                key={`${p.uni.code ?? ""}${p.uni.name}`}
                proposal={p}
                row={rows[i]}
                onChange={(row) => setRows((all) => all.map((x, k) => (k === i ? row : x)))}
              />
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={waiting > 0 || Boolean(busy)}
              onClick={() => void save()}
              className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
            >
              Save to my semester {semester}
            </button>
            <button type="button" className={btn} onClick={() => setReview(null)}>
              Cancel
            </button>
            {waiting > 0 && <span className="text-sm text-muted">{waiting} to confirm first</span>}
          </div>
        </div>
      )}

      <div aria-live="polite" className="text-sm">
        {busy && <p className="text-muted">{busy}</p>}
        {error && (
          <p role="alert" className="text-danger" data-testid="syllabus-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
