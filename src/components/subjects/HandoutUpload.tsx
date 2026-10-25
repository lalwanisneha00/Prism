"use client";

import { useId, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { HandoutEditor, HandoutPreview } from "@/components/subjects/HandoutEditor";
import { getSettings, updateSettings } from "@/lib/storage/progress";
import { readHandoutFile } from "@/components/subjects/readHandoutFile";
import { isEmptyHandout, type StudentHandout } from "@/lib/syllabusFix/studentHandout";

const btn = "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2";
const primary =
  "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60";
const field = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";

type Step =
  | { kind: "pick" }
  | { kind: "busy"; message: string }
  | { kind: "preview"; handout: StudentHandout; notes: string[] }
  | { kind: "edit"; handout: StudentHandout; notes: string[] }
  | { kind: "done"; message: string };

type Profile = { branch?: string; semester?: number; batchYear?: number };
type ApiReply =
  | { ok: true; summary: string[]; changes: number; saved?: { proposals: number; counted: number } }
  | { ok: false; kind: string; message: string };

/** Ask the server how the handout differs from Prism (dry run) or send it (confirm). */
async function post(
  body: { subject: string; dryRun?: boolean; handout: StudentHandout; profile: Profile },
  token?: string,
): Promise<ApiReply> {
  try {
    const res = await fetch("/api/syllabus/handout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as ApiReply | null;
    return data ?? { ok: false, kind: "unavailable", message: "Prism could not be reached." };
  } catch {
    return { ok: false, kind: "offline", message: "You seem to be offline. Try again later." };
  }
}

/**
 * Upload a course handout (syllabus fix, Phase 3). Read on this device, shown for a check
 * (Confirm / Edit / Cancel), then sent: each difference becomes a proposal worth 3 points. Nothing
 * changes for anyone until enough students agree.
 */
export default function HandoutUpload({
  subjectId,
  subjectName,
  codes,
  onClose,
}: {
  subjectId: string;
  subjectName: string;
  codes: string[];
  onClose: () => void;
}) {
  const id = useId();
  const { status, user, signIn } = useAuth();
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string[] | null>(null);
  const [batchYear, setBatchYear] = useState<number | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const thisYear = new Date().getFullYear();

  async function profile(): Promise<Profile> {
    const s = await getSettings().catch(() => undefined);
    const year = batchYear ?? s?.batchYear;
    return {
      ...(s?.branch ? { branch: s.branch } : {}),
      ...(s?.semester ? { semester: s.semester } : {}),
      ...(year ? { batchYear: year } : {}),
    };
  }

  async function showPreview(handout: StudentHandout, notes: string[]) {
    setStep({ kind: "preview", handout, notes });
    setSummary(null);
    const r = await post({ subject: subjectId, dryRun: true, handout, profile: await profile() });
    setSummary(r.ok ? r.summary : null);
  }

  async function onFile(file: File) {
    setError(null);
    setStep({ kind: "busy", message: "Reading your handout on this device…" });
    const read = await readHandoutFile(file, { name: subjectName, codes }, () =>
      setStep({ kind: "busy", message: "Reading the layout with AI…" }),
    );
    if (read.ok) return showPreview(read.handout, read.notes);
    setStep({ kind: "pick" });
    setError(read.message);
  }

  async function confirm(handout: StudentHandout) {
    setError(null);
    if (!user) return setError("Sign in so your fix can be counted (one vote per student).");
    setSending(true);
    try {
      if (batchYear) await updateSettings({ batchYear }).catch(() => undefined);
      const token = await user.getIdToken().catch(() => undefined);
      const r = await post({ subject: subjectId, handout, profile: await profile() }, token);
      if (!r.ok) return setError(r.message);
      setStep({
        kind: "done",
        message:
          r.changes === 0
            ? "Your handout matches Prism. Thanks for checking!"
            : `Thank you! Your handout added to ${r.saved?.proposals ?? r.changes} suggested fixes. They go live once another student from your branch agrees.`,
      });
    } finally {
      setSending(false);
    }
  }

  if (step.kind === "busy")
    return (
      <p role="status" aria-busy="true" className="text-muted">
        {step.message}
      </p>
    );

  if (step.kind === "done")
    return (
      <div className="flex flex-col gap-2" role="status" data-testid="handout-done">
        <p>{step.message}</p>
        <button type="button" className={`${btn} w-fit`} onClick={onClose}>
          Close
        </button>
      </div>
    );

  if (step.kind === "edit")
    return (
      <div className="flex flex-col gap-2">
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <HandoutEditor
          handout={step.handout}
          onCancel={() => setStep({ ...step, kind: "preview" })}
          onSave={(next) => {
            if (isEmptyHandout(next)) {
              setError(
                "Add at least one unit with topics (or one experiment) before you continue.",
              );
              return;
            }
            setError(null);
            void showPreview(next, step.notes);
          }}
        />
      </div>
    );

  if (step.kind === "preview")
    return (
      <div className="flex flex-col gap-3" data-testid="handout-check">
        <p className="font-semibold">Here&apos;s what we found. Does this look right?</p>
        {step.notes.map((n) => (
          <p key={n} className="text-muted">
            {n}
          </p>
        ))}
        <HandoutPreview handout={step.handout} />
        {summary && (
          <div className="rounded-xl bg-surface-2 px-3 py-2" data-testid="handout-summary">
            <p className="font-semibold">Compared with Prism:</p>
            {summary.length === 0 ? (
              <p>It matches what Prism has.</p>
            ) : (
              <ul className="list-disc pl-5">
                {summary.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <label className="flex flex-col gap-1" htmlFor={`${id}-batch`}>
          <span>Your batch (year you joined), optional</span>
          <select
            id={`${id}-batch`}
            className={`${field} w-fit`}
            value={batchYear ?? ""}
            onChange={(e) => setBatchYear(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Not sure</option>
            {Array.from({ length: 6 }, (_, k) => thisYear - k).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {!user && status !== "unavailable" && (
          <button type="button" className={`${btn} w-fit`} onClick={() => void signIn()}>
            Sign in to send it
          </button>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primary}
            disabled={sending || !user}
            onClick={() => void confirm(step.handout)}
          >
            {sending ? "Sending…" : "Confirm"}
          </button>
          <button type="button" className={btn} onClick={() => setStep({ ...step, kind: "edit" })}>
            Edit
          </button>
          <button type="button" className={btn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1" htmlFor={`${id}-file`}>
        <span className="font-semibold">Course handout for {subjectName}</span>
        <span className="text-muted">
          A PDF is best. The file stays on your device: only the units and topics you confirm are
          sent.
        </span>
        <input
          id={`${id}-file`}
          type="file"
          accept=".pdf,.docx,.txt,.odt"
          className="text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <button type="button" className={`${btn} w-fit`} onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
