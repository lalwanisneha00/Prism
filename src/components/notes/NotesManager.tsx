"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { extractPdfPages, PdfTextError } from "@/lib/notes/pdfText";
import {
  addNote,
  deleteNote,
  listLocalNotes,
  listRemoteOnlyNotes,
  MAX_NOTE_BYTES,
} from "@/lib/notes/store";
import type { NoteSummary, StoredNote } from "@/lib/storage/db";

type State =
  | { status: "loading" }
  | { status: "ready"; local: StoredNote[]; remote: NoteSummary[] }
  | { status: "error" };

type Upload =
  | { status: "idle" }
  | { status: "reading"; name: string; page: number; total: number }
  | { status: "done"; name: string }
  | { status: "failed"; message: string };

/** Upload PDFs (read on this device), list them, and delete them. */
export function NotesManager() {
  const { dataVersion } = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });
  const [upload, setUpload] = useState<Upload>({ status: "idle" });
  const [version, setVersion] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([listLocalNotes(), listRemoteOnlyNotes()])
      .then(([local, remote]) => setState({ status: "ready", local, remote }))
      .catch(() => setState({ status: "error" }));
  }, [dataVersion, version]);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return setUpload({ status: "failed", message: "Please choose a PDF file." });
    }
    if (file.size > MAX_NOTE_BYTES) {
      return setUpload({ status: "failed", message: "That PDF is over 30 MB. Try a smaller one." });
    }
    setUpload({ status: "reading", name: file.name, page: 0, total: 0 });
    try {
      const pages = await extractPdfPages(await file.arrayBuffer(), (page, total) =>
        setUpload({ status: "reading", name: file.name, page, total }),
      );
      await addNote(file, pages);
      setUpload({ status: "done", name: file.name });
      setVersion((v) => v + 1);
    } catch (err) {
      const message =
        err instanceof PdfTextError
          ? err.message
          : "Something went wrong saving this file. Check that storage isn't blocked.";
      setUpload({ status: "failed", message });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  async function remove(id: string) {
    await deleteNote(id).catch(() => undefined);
    setVersion((v) => v + 1);
  }

  const busy = upload.status === "reading";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-surface-2 p-5">
        <label htmlFor="notes-file" className="font-semibold">
          Add a PDF of your notes, slides or syllabus
        </label>
        <input
          ref={input}
          id="notes-file"
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-fg hover:file:bg-primary-hover disabled:opacity-60"
        />
        <p className="text-sm text-muted">
          🔒 The file is read in your browser and stays on this device. Only its name and a short
          summary sync to your account. Scanned pages (photos) can&apos;t be read yet.
        </p>
        <p aria-live="polite" className="text-sm">
          {upload.status === "reading" &&
            (upload.total
              ? `Reading ${upload.name}: page ${upload.page} of ${upload.total}…`
              : `Opening ${upload.name}…`)}
          {upload.status === "done" && (
            <span className="font-semibold text-success">✓ {upload.name} is ready to use.</span>
          )}
        </p>
        {upload.status === "failed" && (
          <p role="alert" className="text-sm text-danger">
            {upload.message}
          </p>
        )}
      </section>

      <NotesList state={state} onRemove={remove} />
    </div>
  );
}

function NotesList({ state, onRemove }: { state: State; onRemove: (id: string) => void }) {
  if (state.status === "loading") {
    return <div className="h-20 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-2xl border border-border bg-surface p-5">
        This browser is blocking storage (for example in private browsing), so notes can&apos;t be
        kept here.
      </p>
    );
  }
  if (state.local.length === 0 && state.remote.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-5 text-muted">
        No notes yet. Add a PDF above, then tick{" "}
        <span className="font-semibold">“Use my uploaded notes”</span> when you pick a topic.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {state.local.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.local.map((n) => (
            <li
              key={n.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">📒 {n.name}</p>
                <p className="text-sm text-muted">
                  {n.pages} {n.pages === 1 ? "page" : "pages"} · {n.chunks.length} passages · added{" "}
                  {new Date(n.addedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(n.id)}
                aria-label={`Delete ${n.name}`}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {state.remote.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">On your other devices</p>
          <ul className="flex flex-col gap-2">
            {state.remote.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{n.name}</p>
                  <p className="text-muted">
                    {n.pages} pages · upload it here too to use it on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(n.id)}
                  aria-label={`Forget ${n.name}`}
                  className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-surface-2"
                >
                  Forget
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
