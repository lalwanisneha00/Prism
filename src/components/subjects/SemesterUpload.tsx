"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { apiFetch } from "@/lib/byok/apiFetch";
import { ACCEPT } from "@/lib/extract/detect";
import { extractFile } from "@/lib/extract/extractFile";
import { docText, ExtractError } from "@/lib/extract/types";
import { planSemesterUpload } from "@/lib/semester/autoAdd";
import {
  getMySubjects,
  saveMySubjects,
  SEMESTER_CHANGED_EVENT,
  type SemesterPicks,
} from "@/lib/semester/mySemester";
import { updateSettings } from "@/lib/storage/progress";
import { subjects as catalogue, findSubject } from "@/lib/subjects";
import { AiSyllabusSchema } from "@/lib/university/ai";
import { applyUniversity } from "@/lib/university/apply";
import { parseUniversitySyllabus, type UniSyllabus } from "@/lib/university/parse";

const field = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";

type Result = {
  semester?: number;
  builtIn: string[];
  own: string[];
  otherSemesters: number;
  /** The semester picks before this upload, so it can be undone. */
  before: SemesterPicks;
};

/**
 * "Upload my semester syllabus": the student uploads (or pastes) their semester's syllabus and
 * Prism adds that semester's subjects by itself: Prism's own subject where the names match, a
 * subject of the student's own for the rest. Everything stays on the device until they sign in.
 */
export function SemesterUpload() {
  const id = useId();
  const [semester, setSemester] = useState<string>("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function readSyllabus(source: string): Promise<UniSyllabus | null> {
    const ruled = parseUniversitySyllabus(source);
    if (ruled.subjects.length > 0) return ruled;
    // Messy layouts: let the AI read the text (it uses the student's own key if they set one).
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

  async function add(source: string) {
    setError(null);
    setResult(null);
    try {
      setBusy("Reading your syllabus…");
      const syllabus = await readSyllabus(source);
      if (!syllabus) {
        setError(
          "I couldn't find subjects with units in that text. Check that it lists each subject with its units, or paste the semester's part of the syllabus.",
        );
        return;
      }
      const plan = planSemesterUpload(syllabus, catalogue, semester ? Number(semester) : undefined);
      if (plan.entries.length === 0) {
        setError(
          `That file has no subjects for semester ${semester}. It covers other semesters: choose “Find it in the file”.`,
        );
        return;
      }
      setBusy("Adding your subjects…");
      const before = await getMySubjects();
      await applyUniversity("your semester syllabus", plan.entries, catalogue);
      if (plan.semester) await updateSettings({ semester: plan.semester });
      window.dispatchEvent(new Event(SEMESTER_CHANGED_EVENT));
      setResult({
        semester: plan.semester,
        builtIn: plan.entries.flatMap((e) =>
          e.choice.kind === "built-in" ? [findSubject(e.choice.subjectId)?.name ?? e.uni.name] : [],
        ),
        own: plan.entries.filter((e) => e.choice.kind === "own").map((e) => e.uni.name),
        otherSemesters: plan.otherSemesters,
        before,
      });
      setText("");
    } catch {
      setError("Couldn't add them. Check that this browser allows storage, then try again.");
    } finally {
      setBusy(null);
    }
  }

  async function readFile(file: File) {
    setError(null);
    setBusy("Reading your file…");
    try {
      await add(docText(await extractFile(file)));
    } catch (err) {
      setBusy(null);
      setError(err instanceof ExtractError ? err.message : "That file couldn't be read.");
    }
  }

  async function undo() {
    if (!result) return;
    await saveMySubjects(result.before);
    window.dispatchEvent(new Event(SEMESTER_CHANGED_EVENT));
    setResult(null);
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-lg border border-primary/40 bg-primary-soft p-5"
      data-testid="semester-upload"
    >
      <div>
        <h2 id={`${id}-title`} className="text-xl font-semibold">
          Upload your semester syllabus
        </h2>
        <p className="mt-1 text-sm text-muted">
          Add the syllabus for your semester (PDF, Word, slides or a photo) and Prism adds that
          semester&apos;s subjects for you. The file is read on this device.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-sem`}>
          <span className="font-semibold">Semester</span>
          <select
            id={`${id}-sem`}
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className={field}
          >
            <option value="">Find it in the file</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                Semester {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-file`}>
          <span className="font-semibold">Syllabus file</span>
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
      </div>
      <details className="text-sm">
        <summary className="w-fit cursor-pointer font-semibold">Or paste the syllabus text</summary>
        <textarea
          aria-label="Syllabus text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={
            "Semester III\nMA201 Engineering Mathematics III\nUnit 1: Complex analysis - …"
          }
          className={`${field} mt-2 w-full font-mono`}
        />
        <button
          type="button"
          onClick={() => void add(text)}
          disabled={!text.trim() || Boolean(busy)}
          className="mt-2 rounded-full bg-primary px-5 py-2 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
        >
          Add my subjects
        </button>
      </details>
      <div aria-live="polite" className="text-sm">
        {busy && <p className="text-muted">{busy}</p>}
        {error && (
          <p role="alert" className="text-danger" data-testid="semester-upload-error">
            {error}
          </p>
        )}
        {result && (
          <div className="flex flex-col gap-2" data-testid="semester-upload-done">
            <p className="font-semibold text-success">
              Added {result.builtIn.length + result.own.length} subject
              {result.builtIn.length + result.own.length === 1 ? "" : "s"}
              {result.semester ? ` for semester ${result.semester}` : ""}.
            </p>
            {result.builtIn.length > 0 && <p>Prism teaches: {result.builtIn.join(", ")}.</p>}
            {result.own.length > 0 && (
              <p>New subjects made from your syllabus: {result.own.join(", ")}.</p>
            )}
            {result.otherSemesters > 0 && (
              <p className="text-muted">
                {result.otherSemesters} subject{result.otherSemesters === 1 ? "" : "s"} from other
                semesters in the file were left out.
              </p>
            )}
            <p className="flex flex-wrap gap-4">
              <Link href="/subjects/university" className="font-semibold text-primary underline">
                Review or change what was added
              </Link>
              <button type="button" onClick={() => void undo()} className="font-semibold underline">
                Undo
              </button>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
