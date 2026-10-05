"use client";

import { Icon } from "@/components/Icon";
import { apiFetch } from "@/lib/byok/apiFetch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { OutlineEditor } from "@/components/custom/OutlineEditor";
import { chaptersFromDraft, guessTeaching, SUGGESTED_NAMES } from "@/lib/custom/customSubject";
import { outlineExcerpts, outlineFromMaterial } from "@/lib/custom/outline";
import { createCustomSubject, updateCustomSubject } from "@/lib/custom/store";
import { matchSyllabus } from "@/lib/custom/matchSyllabus";
import { subjects as builtIn } from "@/lib/subjects";
import { draftToText, parseSyllabusText, type DraftChapter } from "@/lib/custom/syllabusText";
import { ACCEPT } from "@/lib/extract/detect";
import { extractFile } from "@/lib/extract/extractFile";
import { docText, ExtractError, type ExtractedDoc } from "@/lib/extract/types";
import { guessKind } from "@/lib/notes/kinds";
import { addNote } from "@/lib/notes/store";
import type { CustomSubjectRecord } from "@/lib/storage/db";
import { splitPaper } from "@/lib/worksheet/splitPaper";

type Pending = { name: string; size: number; doc: ExtractedDoc; bytes: ArrayBuffer; mime: string };
type Details = CustomSubjectRecord["details"];

const field = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";
const label = "flex flex-col gap-1 text-sm";

/**
 * Set up (or edit) one of the student's own subjects (V3 · Step 4): a name, optionally their
 * units and topics (typed, pasted or from a syllabus file), optionally their material, and
 * optional exam details. At least topics or material are needed, so lessons match the course.
 */
export function CustomSubjectForm({
  existing,
  initialName = "",
}: {
  existing?: CustomSubjectRecord;
  initialName?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState(existing?.name ?? initialName);
  const [teaching, setTeaching] = useState<"theory" | "skill">(
    existing?.teaching ?? guessTeaching(initialName),
  );
  const [teachingChosen, setTeachingChosen] = useState(Boolean(existing));
  const [syllabus, setSyllabus] = useState("");
  const [draft, setDraft] = useState<DraftChapter[] | null>(
    existing
      ? existing.chapters.map((c) => ({ name: c.name, topics: c.topics.map((t) => t.name) }))
      : null,
  );
  const [outlineFrom, setOutlineFrom] = useState<CustomSubjectRecord["outlineFrom"]>(
    existing?.outlineFrom ?? "typed",
  );
  const [files, setFiles] = useState<Pending[]>([]);
  const [details, setDetails] = useState<Details>(existing?.details ?? {});
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function rename(next: string) {
    setName(next);
    if (!teachingChosen) setTeaching(guessTeaching(next));
  }

  function checkOutline(text = syllabus, from: CustomSubjectRecord["outlineFrom"] = "typed") {
    const parsed = parseSyllabusText(text);
    if (parsed.length === 0) {
      setMessage({
        kind: "error",
        text: "No topics found. Put each topic on its own line, or start units with “Unit 1:”.",
      });
      return null;
    }
    setDraft(parsed);
    setOutlineFrom(from);
    setMessage(null);
    return parsed;
  }

  async function readSyllabusFile(file: File) {
    setBusy("Reading your syllabus…");
    try {
      const text = docText(await extractFile(file));
      setSyllabus(text);
      checkOutline(text, "syllabus");
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof ExtractError ? err.message : "That file couldn't be read.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function addMaterial(list: FileList) {
    setBusy("Reading your files on this device…");
    const added: Pending[] = [];
    for (const file of [...list].slice(0, 20)) {
      try {
        added.push({
          name: file.name,
          size: file.size,
          doc: await extractFile(file),
          bytes: await file.arrayBuffer(),
          mime: file.type || "application/octet-stream",
        });
      } catch (err) {
        setMessage({
          kind: "error",
          text: `${file.name}: ${err instanceof ExtractError ? err.message : "couldn't be read."}`,
        });
      }
    }
    setFiles((f) => [...f, ...added]);
    setBusy(null);
  }

  /** An outline from the material: tidied by the AI when it can, built on the device otherwise. */
  async function buildFromMaterial(): Promise<DraftChapter[] | null> {
    const teachingFiles = files.filter((f) => guessKind(f.name, f.doc) !== "pyq");
    const papers = files.filter((f) => guessKind(f.name, f.doc) === "pyq");
    const material = teachingFiles.map((f) => ({ name: f.name, sections: f.doc.sections }));
    const local = outlineFromMaterial(material);
    setBusy("Building an outline from your material…");
    let built: DraftChapter[] = local;
    try {
      const res = await apiFetch("/api/outline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "My subject",
          excerpts: outlineExcerpts(material).slice(0, 80),
          pyqs: papers
            .flatMap((p) => splitPaper(docText(p.doc)))
            .map((q) => q.slice(0, 500))
            .slice(0, 30),
        }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (body && typeof body === "object" && "ok" in body && body.ok && "chapters" in body) {
        built = body.chapters as DraftChapter[];
      }
    } catch {
      // Offline or quota: the outline built on the device is used.
    }
    setBusy(null);
    if (built.length === 0) {
      setMessage({
        kind: "error",
        text: "Your files didn't have clear headings or slide titles. Type a few topics instead.",
      });
      return null;
    }
    setDraft(built);
    setOutlineFrom("material");
    setMessage({
      kind: "info",
      text: "Check the outline built from your material: rename, reorder, merge or delete anything, then save.",
    });
    return built;
  }

  async function save() {
    if (!name.trim()) return setMessage({ kind: "error", text: "Give your subject a name." });
    let outline = draft;
    if (!outline && syllabus.trim())
      outline = checkOutline(syllabus, outlineFrom === "syllabus" ? "syllabus" : "typed");
    if (!outline && files.length > 0) {
      // Show the material outline first: the student checks it, then saves again.
      await buildFromMaterial();
      return;
    }
    if (!outline) {
      return setMessage({
        kind: "error",
        text: "Add your topics, paste your syllabus, or upload some of your material, so Prism can build lessons that match your course.",
      });
    }
    const chapters = chaptersFromDraft(outline, existing?.chapters ?? []);
    if (chapters.length === 0)
      return setMessage({ kind: "error", text: "Every unit needs at least one topic." });
    setBusy("Saving…");
    try {
      const nextExam = (details.nextExam ?? []).filter((c) => chapters.some((x) => x.id === c));
      const input = {
        name: name.trim().slice(0, 120),
        teaching,
        chapters,
        details: { ...details, nextExam },
        outlineFrom,
      };
      const record = existing
        ? await updateCustomSubject(existing.id, input)
        : await createCustomSubject(input);
      if (!record) throw new Error("not saved");
      for (const f of files) {
        await addNote(
          { name: f.name, size: f.size },
          f.doc,
          Date.now(),
          { kind: guessKind(f.name, f.doc), subject: record.id },
          { bytes: f.bytes, mime: f.mime },
        );
      }
      router.push(`/my-subjects/view?id=${record.id}`);
    } catch {
      setBusy(null);
      setMessage({
        kind: "error",
        text: "Saving failed. Check that this browser allows storage, then try again.",
      });
    }
  }

  const units = draft ?? [];
  // Built-in subjects that cover most of these topics (with verified material and visuals).
  const matches = matchSyllabus(units, builtIn);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-7 rounded-2xl border border-border bg-surface p-5 sm:p-8"
      data-testid="custom-subject-form"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className="font-semibold">
          Subject name
        </label>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => rename(e.target.value)}
          placeholder="e.g. Indian Knowledge System"
          maxLength={120}
          className={field}
        />
        {!existing && (
          <div className="flex flex-wrap gap-2" aria-label="Suggestions">
            {SUGGESTED_NAMES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => rename(n)}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-surface-2"
              >
                {n}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted">
          Suggestions only fill in the name: your course&apos;s own syllabus is what Prism follows.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">What kind of subject is it?</legend>
        {(
          [
            ["theory", "Theory", "Mostly reading and writing answers (most non-core subjects)"],
            [
              "skill",
              "Skill",
              "Practice-based, like English Communication (exercises and formats)",
            ],
          ] as const
        ).map(([v, t, d]) => (
          <label key={v} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="teaching"
              className="mt-1"
              checked={teaching === v}
              onChange={() => {
                setTeaching(v);
                setTeachingChosen(true);
              }}
            />
            <span>
              <strong>{t}</strong> <span className="text-muted">· {d}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <p className="font-semibold">
          Units and topics <span className="font-normal text-muted">(optional)</span>
        </p>
        {draft ? (
          <>
            {matches.length > 0 && (
              <div
                role="status"
                className="rounded-xl border border-border bg-bg p-3 text-sm"
                data-testid="syllabus-match"
              >
                <p className="font-semibold">Prism already teaches much of this.</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {matches.map((m) => (
                    <li key={m.subject.id}>
                      <Link
                        href={`/subjects/${m.subject.id}`}
                        className="font-semibold text-primary underline"
                      >
                        {m.subject.name}
                      </Link>{" "}
                      <span className="text-muted">
                        covers {m.matched} of your {m.total} topics
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-muted">You can still save your own subject below.</p>
              </div>
            )}
            <OutlineEditor
              value={units}
              onChange={setDraft}
              label={outlineFrom === "material" ? "Outline built from your material" : undefined}
            />
            <button
              type="button"
              onClick={() => {
                setSyllabus(draftToText(units));
                setDraft(null);
              }}
              className="w-fit text-sm font-semibold text-primary underline"
            >
              Edit as text instead
            </button>
          </>
        ) : (
          <>
            <label htmlFor={`${id}-syllabus`} className="text-sm text-muted">
              Type your topics (one per line), or paste your syllabus. Start units with “Unit 1:”.
            </label>
            <textarea
              id={`${id}-syllabus`}
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              rows={6}
              placeholder={"Unit 1: Introduction – meaning, scope, importance\nUnit 2: …"}
              className={field}
            />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                disabled={!syllabus.trim()}
                onClick={() => checkOutline()}
                className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-surface-2 disabled:opacity-50"
              >
                Check my outline
              </button>
              <label className="cursor-pointer font-semibold text-primary underline">
                or upload your syllabus file
                <input
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void readSyllabusFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-semibold">
          Your material <span className="font-normal text-muted">(optional, recommended)</span>
        </p>
        <p className="text-sm text-muted">
          Faculty slides and notes, previous-year papers, worksheets: any format. Exams follow these
          closely, so lessons use them first. <Icon name="lock" /> They stay on this device.
        </p>
        <label className="w-fit cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2">
          Add files
          <input
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            data-testid="custom-material-input"
            onChange={(e) => {
              if (e.target.files?.length) void addMaterial(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {files.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm" data-testid="custom-material-list">
            {files.map((f, i) => (
              <li
                key={`${i}-${f.name}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-1.5"
              >
                <span className="min-w-0 truncate">
                  <Icon name="book" /> {f.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((list) => list.filter((_, k) => k !== i))}
                  className="text-xs font-semibold text-primary underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {files.length > 0 && !draft && (
          <button
            type="button"
            onClick={() => void buildFromMaterial()}
            className="w-fit rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            Build the outline from my material
          </button>
        )}
      </div>

      <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer font-semibold">
          Exam details{" "}
          <span className="font-normal text-muted">
            (optional, makes lessons and tests match your exam)
          </span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Exam date
            <input
              type="date"
              value={details.examDate ?? ""}
              onChange={(e) => setDetails((d) => ({ ...d, examDate: e.target.value || undefined }))}
              className={field}
            />
          </label>
          <label className={label}>
            Marks per question
            <input
              value={details.marksPattern ?? ""}
              onChange={(e) =>
                setDetails((d) => ({
                  ...d,
                  marksPattern: e.target.value.slice(0, 100) || undefined,
                }))
              }
              placeholder="e.g. 2, 5 and 10 marks"
              className={field}
            />
          </label>
          <label className={label}>
            Question style
            <select
              value={details.examStyle ?? ""}
              onChange={(e) =>
                setDetails((d) => ({
                  ...d,
                  examStyle: (e.target.value || undefined) as Details["examStyle"],
                }))
              }
              className={field}
            >
              <option value="">Not sure</option>
              <option value="theory">Written answers</option>
              <option value="mcq">Multiple choice</option>
              <option value="mixed">Both</option>
            </select>
          </label>
          <label className={label}>
            Exam
            <select
              value={details.examKind ?? ""}
              onChange={(e) =>
                setDetails((d) => ({
                  ...d,
                  examKind: (e.target.value || undefined) as Details["examKind"],
                }))
              }
              className={field}
            >
              <option value="">Not sure</option>
              <option value="internal">Internal / mid-semester</option>
              <option value="end-sem">End-semester</option>
            </select>
          </label>
          <label className={label}>
            Semester
            <select
              value={details.semester ?? ""}
              onChange={(e) =>
                setDetails((d) => ({
                  ...d,
                  semester: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className={field}
            >
              <option value="">Not sure</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Language of teaching
            <input
              value={details.language ?? ""}
              onChange={(e) =>
                setDetails((d) => ({ ...d, language: e.target.value.slice(0, 40) || undefined }))
              }
              placeholder="e.g. English"
              className={field}
            />
          </label>
        </div>
        {units.length > 0 && (
          <fieldset className="mt-3 flex flex-col gap-1 text-sm">
            <legend className="font-semibold">Units in the next exam</legend>
            {chaptersFromDraft(units, existing?.chapters ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={details.nextExam?.includes(c.id) ?? false}
                  onChange={(e) =>
                    setDetails((d) => ({
                      ...d,
                      nextExam: e.target.checked
                        ? [...(d.nextExam ?? []), c.id]
                        : (d.nextExam ?? []).filter((x) => x !== c.id),
                    }))
                  }
                />
                {c.name}
              </label>
            ))}
          </fieldset>
        )}
      </details>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`text-sm ${message.kind === "error" ? "text-danger" : "text-primary"}`}
        >
          {message.text}
        </p>
      )}
      {busy && (
        <p role="status" className="animate-pulse text-sm text-muted">
          {busy}
        </p>
      )}
      <button
        type="submit"
        disabled={Boolean(busy)}
        className="w-fit rounded-full bg-primary px-6 py-3 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
      >
        {existing ? "Save changes" : "Save my subject"}
      </button>
    </form>
  );
}
