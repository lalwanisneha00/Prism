"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { ACCEPT, FORMAT_NAMES } from "@/lib/extract/detect";
import { extractFile } from "@/lib/extract/extractFile";
import { ExtractError, hasText, unitName } from "@/lib/extract/types";
import { addNote, deleteNote, listLocalNotes, listRemoteOnlyNotes } from "@/lib/notes/store";
import type { NoteSummary, StoredNote } from "@/lib/storage/db";

type State =
  | { status: "loading" }
  | { status: "ready"; local: StoredNote[]; remote: NoteSummary[] }
  | { status: "error" };

type Upload =
  | { status: "idle" }
  | { status: "reading"; name: string; page: number; total: number }
  | { status: "done"; name: string; warnings: string[] }
  | { status: "failed"; message: string; howTo?: string };

/** Upload notes in any common format (read on this device), list them, and delete them. */
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
    setUpload({ status: "reading", name: file.name, page: 0, total: 0 });
    try {
      const doc = await extractFile(file, (page, total) =>
        setUpload({ status: "reading", name: file.name, page, total }),
      );
      if (!hasText(doc)) {
        throw new ExtractError(
          "empty",
          `No text could be found in ${file.name}: its content is in pictures (a photo, a scan or picture-only slides). Prism can't read text in pictures yet.`,
        );
      }
      await addNote(file, doc);
      setUpload({ status: "done", name: file.name, warnings: doc.warnings });
      setVersion((v) => v + 1);
    } catch (err) {
      setUpload(
        err instanceof ExtractError
          ? { status: "failed", message: err.message, howTo: err.howTo }
          : {
              status: "failed",
              message: "Something went wrong saving this file. Check that storage isn't blocked.",
            },
      );
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
          Add your notes, slides or syllabus
        </label>
        <input
          ref={input}
          id="notes-file"
          type="file"
          accept={ACCEPT}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-fg hover:file:bg-primary-hover disabled:opacity-60"
        />
        <p className="text-sm text-muted">
          🔒 The file is read in your browser and stays on this device. Only its name and a short
          summary sync to your account. Works with {FORMAT_NAMES}.
        </p>
        <p aria-live="polite" className="text-sm">
          {upload.status === "reading" &&
            (upload.total
              ? `Reading ${upload.name}: page ${upload.page} of ${upload.total}…`
              : `Reading ${upload.name}…`)}
          {upload.status === "done" && (
            <span className="font-semibold text-success">✓ {upload.name} is ready to use.</span>
          )}
        </p>
        {upload.status === "done" && upload.warnings.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-warning">
            {upload.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        {upload.status === "failed" && (
          <div role="alert" className="flex flex-col gap-1 text-sm">
            <p className="text-danger">{upload.message}</p>
            {upload.howTo && <p className="whitespace-pre-line text-muted">{upload.howTo}</p>}
          </div>
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
        No notes yet. Add a file above, then tick{" "}
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
                  {unitName(n.format, n.pages)} · {n.chunks.length}{" "}
                  {n.chunks.length === 1 ? "passage" : "passages"} · added{" "}
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
                    {n.pages} {n.pages === 1 ? "part" : "parts"} · upload it here too to use it on
                    this device.
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
