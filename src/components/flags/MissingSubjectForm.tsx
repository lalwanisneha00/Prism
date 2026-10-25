"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { deviceProfile, postFlag, type Profile } from "@/components/flags/flagApi";
import { HandoutPreview } from "@/components/subjects/HandoutEditor";
import { readHandoutFile } from "@/components/subjects/readHandoutFile";
import branchData from "@/data/branches.json";
import type { Candidate } from "@/lib/syllabusFix/missingSubject";
import type { StudentHandout } from "@/lib/syllabusFix/studentHandout";

const btn = "rounded-full border border-border px-4 py-2 font-semibold hover:bg-surface-2";
const primary =
  "rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60";
const field = "rounded-xl border border-border bg-bg px-3 py-2";

const shortName = new Map(branchData.branches.map((b) => [b.id, b.short]));
/** "ece 3" → "ECE sem 3". */
const place = (w: string) => {
  const [b, n] = w.split(" ");
  return `${shortName.get(b) ?? b.toUpperCase()} sem ${n}`;
};

type Step = "details" | "checking" | "pick" | "done";

/**
 * "My subject isn't here" (syllabus fix, Phase 4): the course name, code (optional), semester and
 * optionally its handout. Prism first looks for the same course elsewhere ("Is it this one?") so
 * it gets linked to the student's semester, not copied. Either way it is a suggestion that goes
 * live once enough students agree (Phase 5).
 */
export function MissingSubjectForm({
  semester: initialSemester,
  onClose,
}: {
  semester?: number;
  onClose: () => void;
}) {
  const id = useId();
  const { status, user, signIn } = useAuth();
  const [profile, setProfile] = useState<Profile>({});
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState(initialSemester ? String(initialSemester) : "");
  const [handout, setHandout] = useState<StudentHandout | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pick, setPick] = useState<string>("new");
  const [step, setStep] = useState<Step>("details");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState("");

  useEffect(() => {
    void deviceProfile().then((p) => {
      setProfile(p);
      if (!initialSemester && p.semester) setSemester(String(p.semester));
    });
  }, [initialSemester]);

  const missing = () => ({
    name: name.trim(),
    ...(code.trim() ? { code: code.trim() } : {}),
    semester: Number(semester),
    ...(handout ? { handout } : {}),
    ...(note.trim() ? { note: note.trim() } : {}),
  });

  async function onFile(file: File) {
    setError(null);
    if (name.trim().length < 2) return setError("Write the course name first.");
    setReading("Reading the handout on this device…");
    const read = await readHandoutFile(
      file,
      { name: name.trim(), codes: code.trim() ? [code.trim()] : [] },
      () => setReading("Reading the layout with AI…"),
    );
    setReading(null);
    if (read.ok) setHandout(read.handout);
    else setError(`${read.message} You can still send the course without it.`);
  }

  async function check() {
    setError(null);
    if (name.trim().length < 2) return setError("Write the course name.");
    if (code.trim() && !/^[A-Za-z0-9]+$/.test(code.trim()))
      return setError("The course code has letters and digits only, like 24CP301T.");
    if (!semester) return setError("Pick the semester.");
    setStep("checking");
    const r = await postFlag("/api/syllabus/missing", { check: true, missing: missing(), profile });
    if (!r.ok) {
      setStep("details");
      return setError(r.message);
    }
    const found = r.candidates ?? [];
    setCandidates(found);
    setPick(found.find((c) => !c.alreadyHere)?.id ?? "new");
    setStep("pick");
  }

  async function send() {
    setError(null);
    if (!user) return setError("Sign in so your suggestion can be counted (one per student).");
    setSending(true);
    try {
      const token = await user.getIdToken().catch(() => undefined);
      const body = {
        missing: { ...missing(), ...(pick !== "new" ? { linkTo: pick } : {}) },
        profile,
      };
      const r = await postFlag("/api/syllabus/missing", body, token);
      if (!r.ok) return setError(r.message);
      setDone(
        !r.counted
          ? "You suggested this already. Thanks!"
          : r.linked
            ? "Thanks! The course will show in your semester once another student from your branch agrees."
            : "Thanks! Your suggestion is counted. The course is added once another student from your branch agrees.",
      );
      setStep("done");
    } finally {
      setSending(false);
    }
  }

  if (step === "done")
    return (
      <div className="flex flex-col gap-3" role="status" data-testid="flag-done">
        <p>{done}</p>
        <button type="button" className={`${btn} w-fit`} onClick={onClose}>
          Close
        </button>
      </div>
    );

  if (step === "checking")
    return (
      <p role="status" aria-busy="true" className="text-muted">
        Looking for this course on Prism…
      </p>
    );

  if (step === "pick")
    return (
      <div className="flex flex-col gap-3" data-testid="missing-pick">
        {candidates.length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">Is it this one?</legend>
            {candidates.map((c) => (
              <label key={c.id} className="flex items-start gap-2">
                <input
                  type="radio"
                  name={`${id}-pick`}
                  className="mt-1"
                  value={c.id}
                  disabled={c.alreadyHere}
                  checked={pick === c.id}
                  onChange={() => setPick(c.id)}
                />
                <span>
                  <Link
                    href={`/subjects/${c.id}`}
                    target="_blank"
                    className="font-medium underline"
                  >
                    {c.name}
                  </Link>
                  <span className="block text-xs text-muted">
                    {c.alreadyHere
                      ? "Already in your semester's list"
                      : c.where.length
                        ? `On Prism for ${c.where.map(place).join(", ")}`
                        : "On Prism"}
                    {c.how === "code" ? " · same course code" : ""}
                  </span>
                </span>
              </label>
            ))}
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name={`${id}-pick`}
                className="mt-1"
                value="new"
                checked={pick === "new"}
                onChange={() => setPick("new")}
              />
              <span>None of these: it&apos;s a different course</span>
            </label>
          </fieldset>
        ) : (
          <p>
            Prism doesn&apos;t have <b>{name.trim()}</b> yet. Send it as a new course for semester{" "}
            {semester}?
          </p>
        )}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {status === "unavailable" ? (
          <p className="text-muted">Suggesting needs sign-in, which is not set up here.</p>
        ) : (
          !user && (
            <button type="button" className={`${btn} w-fit`} onClick={() => void signIn()}>
              Sign in to send it
            </button>
          )
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primary}
            disabled={sending || !user}
            onClick={() => void send()}
          >
            {sending ? "Sending…" : "Send"}
          </button>
          <button type="button" className={btn} onClick={() => setStep("details")}>
            Back
          </button>
        </div>
      </div>
    );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void check();
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="font-semibold">Course name</span>
        <input
          className={field}
          value={name}
          maxLength={160}
          onChange={(e) => setName(e.target.value)}
          placeholder="For example, Introduction to Artificial Intelligence"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span>Course code (optional)</span>
          <input
            className={`${field} w-40`}
            value={code}
            maxLength={20}
            onChange={(e) => setCode(e.target.value)}
            placeholder="24CP301T"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Semester</span>
          <select
            className={`${field} w-fit`}
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option value="">Choose…</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                Semester {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span>Course handout (optional)</span>
        <span className="text-xs text-muted">
          A PDF is best. It is read on your device: only its units and topics are sent.
        </span>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.odt"
          className="text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </label>
      {reading && (
        <p role="status" aria-busy="true" className="text-muted">
          {reading}
        </p>
      )}
      {handout && (
        <details className="rounded-xl bg-surface-2 px-3 py-2">
          <summary className="cursor-pointer font-semibold">
            Read from the handout:{" "}
            {handout.courseType === "practical"
              ? `${handout.experiments.length} experiments`
              : `${handout.units.length} units`}
          </summary>
          <div className="mt-2">
            <HandoutPreview handout={handout} />
          </div>
        </details>
      )}
      <label className="flex flex-col gap-1">
        <span>Anything to add? (optional)</span>
        <textarea
          className={field}
          rows={2}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {!profile.branch && (
        <p className="rounded-xl bg-warning/10 px-3 py-2">
          Choose your branch on My subjects first, so we know where you study.
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primary} disabled={Boolean(reading)}>
          Next
        </button>
        <button type="button" className={btn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
