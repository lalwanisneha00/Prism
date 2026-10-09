"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { useVisibleCustomSubjects } from "@/components/custom/useVisibleCustomSubjects";
import { MaterialCard } from "@/components/notes/MaterialCard";
import { SubjectFilter } from "@/components/notes/SubjectFilter";
import { UploadBox } from "@/components/notes/UploadBox";
import { kindLabel } from "@/lib/notes/kinds";
import { deleteNote, listLocalNotes, listRemoteOnlyNotes } from "@/lib/notes/store";
import type { NoteSummary, StoredNote } from "@/lib/storage/db";
import { isCustomId, toSubject } from "@/lib/custom/customSubject";
import { toPayload } from "@/lib/custom/store";
import { subjects as builtIn, type Subject } from "@/lib/subjects";

type State =
  | { status: "loading" }
  | { status: "ready"; local: StoredNote[]; remote: NoteSummary[] }
  | { status: "error" };

/** "My materials": upload files, filter them by subject, re-tag, preview and delete them. */
export function MaterialsManager({ initialSubject = "" }: { initialSubject?: string }) {
  const { dataVersion } = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const custom = useVisibleCustomSubjects();
  // Built-in subjects and the student's own ("Other subjects", V3 · Step 4).
  // A subject saved with just its name (no units yet) can take uploads too: the outline can come from them.
  const own = custom.records.map(
    (r) =>
      custom.subjects.find((s) => s.id === r.id) ??
      toSubject({ ...toPayload(r, false), chapters: [] } as never),
  );
  const subjects = [...builtIn, ...own];
  const [filter, setFilter] = useState(
    builtIn.some((s) => s.id === initialSubject) || isCustomId(initialSubject)
      ? initialSubject
      : "",
  );

  useEffect(() => {
    Promise.all([listLocalNotes(), listRemoteOnlyNotes()])
      .then(([local, remote]) => setState({ status: "ready", local, remote }))
      .catch(() => setState({ status: "error" }));
  }, [dataVersion, version]);

  const replace = (note: StoredNote) =>
    setState((s) =>
      s.status === "ready" ? { ...s, local: s.local.map((n) => (n.id === note.id ? note : n)) } : s,
    );

  async function remove(id: string) {
    await deleteNote(id).catch(() => undefined);
    setVersion((v) => v + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <UploadBox
        subjects={subjects}
        subject={filter}
        onSubjectChange={setFilter}
        onAdded={() => setVersion((v) => v + 1)}
      />
      <SubjectFilter subjects={subjects} value={filter} onChange={setFilter} />
      <MaterialsList
        state={state}
        filter={filter}
        subjects={subjects}
        onChange={replace}
        onRemove={remove}
      />
    </div>
  );
}

function MaterialsList({
  state,
  filter,
  subjects,
  onChange,
  onRemove,
}: {
  state: State;
  filter: string;
  subjects: readonly Subject[];
  onChange: (note: StoredNote) => void;
  onRemove: (id: string) => void;
}) {
  if (state.status === "loading") {
    return <div className="h-20 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-2xl border border-border bg-surface p-5">
        This browser is blocking storage (for example in private browsing), so materials can&apos;t
        be kept here.
      </p>
    );
  }
  // A file for "any subject" shows under every subject.
  const matches = (subject?: string) => !filter || !subject || subject === filter;
  const local = state.local.filter((n) => matches(n.subject));
  const remote = state.remote.filter((n) => matches(n.subject));
  if (local.length === 0 && remote.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-5 text-muted">
        No materials {filter ? "for this subject " : ""}yet. Add files above, then tick{" "}
        <span className="font-semibold">“Use my uploaded notes”</span> when you pick a topic.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {local.length > 0 && (
        <ul className="flex flex-col gap-3" data-testid="materials-list">
          {local.map((n) => (
            <MaterialCard
              key={n.id}
              note={n}
              subjects={subjects}
              onChange={onChange}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
      {remote.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">On your other devices</p>
          <ul className="flex flex-col gap-2">
            {remote.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold break-words">{n.name}</p>
                  <p className="text-muted">
                    {n.kind ? `${kindLabel[n.kind]} · ` : ""}upload it here too to use it on this
                    device.
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
