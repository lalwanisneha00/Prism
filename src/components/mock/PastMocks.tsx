"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { UndoToast } from "@/components/UndoToast";
import { formatClock } from "@/lib/mock/clock";
import {
  deleteMockResults,
  listMockResults,
  restoreMockResults,
  scoreText,
} from "@/lib/mock/results";
import type { MockResult } from "@/lib/storage/db";

const dateText = (at: number) =>
  new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const pill = "min-h-9 rounded-full border border-border px-3 py-1 font-semibold";

/** The "…" menu on one mock: Delete, or start choosing several. */
function MockMenu({
  title,
  onDelete,
  onSelect,
}: {
  title: string;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item =
    "flex min-h-11 w-full items-center px-3 text-left text-sm font-medium hover:bg-surface-2";
  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        aria-label={`More for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2"
      >
        <Icon name="more" className="size-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-11 right-0 z-20 w-48 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className={`${item} text-danger`}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              onSelect();
            }}
          >
            Select several…
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Past mocks with score, scope, date and time taken: view the paper or its answer sheet, retake
 * the same scope as a new paper, or delete (one, or several in Select mode), with Undo.
 */
export function PastMocks({
  version,
  canOpen,
  onView,
  onRetake,
}: {
  /** Bumped after a new result is saved. */
  version: number;
  canOpen: (r: MockResult) => boolean;
  onView: (r: MockResult, show: "paper" | "answers") => void;
  onRetake: (r: MockResult) => void;
}) {
  const dataVersion = useDataVersion();
  const [list, setList] = useState<MockResult[] | null>(null);
  const [reload, setReload] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [undo, setUndo] = useState<string[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    listMockResults()
      .then((r) => alive && setList(r))
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, [dataVersion, version, reload]);

  async function remove(ids: string[]) {
    setConfirm(null);
    setError(false);
    try {
      await deleteMockResults(ids);
      setList((l) => l?.filter((r) => !ids.includes(r.id)) ?? l);
      setUndo(ids);
      setSelecting(false);
      setChosen(new Set());
    } catch {
      setError(true);
    }
  }

  async function bringBack(ids: string[]) {
    setUndo(null);
    try {
      await restoreMockResults(ids);
    } catch {
      setError(true);
    }
    setReload((n) => n + 1);
  }

  const closeToast = useCallback(() => setUndo(null), []);

  const toggle = (id: string) =>
    setChosen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const shown = list?.slice(0, 20) ?? [];

  return (
    <section
      aria-labelledby="past-mocks-title"
      className="flex flex-col gap-3"
      data-testid="past-mocks"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="past-mocks-title" className="text-xl font-bold">
          Past mocks
        </h2>
        {shown.length > 0 &&
          (selecting ? (
            <span className="flex flex-wrap gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setSelecting(false);
                  setChosen(new Set());
                }}
                className={pill}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={chosen.size === 0}
                onClick={() => setConfirm([...chosen])}
                className="min-h-9 rounded-full bg-danger px-3 py-1 font-semibold text-bg disabled:opacity-50"
              >
                Delete {chosen.size || ""} selected
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setSelecting(true)} className={`${pill} text-sm`}>
              Select
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          That didn&rsquo;t work on this device. Please try again.
        </p>
      )}
      {list === null ? (
        <div className="h-16 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">No mocks yet. Your results will show here.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((r) => {
            const open = canOpen(r);
            const scope =
              r.scope?.label ?? (r.chapter === "multiple" ? "Several chapters" : "One chapter");
            return (
              <li
                key={r.id}
                data-testid="past-mock"
                className={`flex items-start gap-2 rounded-xl border bg-surface p-3 text-sm ${
                  chosen.has(r.id) ? "border-primary" : "border-border"
                }`}
              >
                {selecting && (
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.title}`}
                    checked={chosen.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-semibold break-words">{r.title}</span>
                    <span className="block text-xs break-words text-muted">
                      {scope} · {dateText(r.at)} ·{" "}
                      {r.timeTakenSec ? `took ${formatClock(r.timeTakenSec)}` : `${r.minutes} min`}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular-nums">{scoreText(r)}</span>
                    {!selecting && open && r.paper && (
                      <>
                        <button type="button" onClick={() => onView(r, "paper")} className={pill}>
                          View paper
                        </button>
                        <button type="button" onClick={() => onView(r, "answers")} className={pill}>
                          View answer sheet
                        </button>
                      </>
                    )}
                    {!selecting && open && (
                      <button type="button" onClick={() => onRetake(r)} className={pill}>
                        Retake as a new paper
                      </button>
                    )}
                  </span>
                </div>
                {!selecting && (
                  <MockMenu
                    title={r.title}
                    onDelete={() => setConfirm([r.id])}
                    onSelect={() => {
                      setSelecting(true);
                      setChosen(new Set([r.id]));
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm && confirm.length > 1 ? `Delete ${confirm.length} mocks?` : "Delete this mock?"
        }
        body={
          confirm && confirm.length > 1
            ? "This removes their papers, answer sheets and your scores."
            : "This removes the paper, answer sheet and your score."
        }
        confirmLabel="Delete"
        onConfirm={() => confirm && void remove(confirm)}
        onCancel={() => setConfirm(null)}
      />
      {undo && (
        <UndoToast
          key={undo.join()}
          message={undo.length > 1 ? `${undo.length} mocks deleted.` : "Mock deleted."}
          onUndo={() => void bringBack(undo)}
          onDone={closeToast}
        />
      )}
    </section>
  );
}
