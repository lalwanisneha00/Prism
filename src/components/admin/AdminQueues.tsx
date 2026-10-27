"use client";

import type { ReactNode } from "react";
import type { RunAction } from "@/components/admin/AdminSyllabus";
import { AdminLessons } from "@/components/admin/AdminLessons";
import branchData from "@/data/branches.json";
import type { AdminView, ProposalView } from "@/lib/syllabusFix/adminView";

/*
 * The admin page's queues (syllabus fix, Phase 6), one folded section each. Every list says when
 * it is empty, so "nothing to do" is visible instead of a blank page.
 */

const branchShort = new Map(branchData.branches.map((b) => [b.id, b.short]));
const where = (branch: string, semester: number) =>
  `${branchShort.get(branch) ?? branch.toUpperCase()} sem ${semester}`;
const day = (iso: string) => iso.slice(0, 10);

export const btn =
  "rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50";
export const primaryBtn =
  "rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50";

export function Section({
  title,
  count,
  open = false,
  children,
}: {
  title: string;
  count: number;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-lg font-semibold">
        {title} <span className="text-sm font-normal text-muted">({count})</span>
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {count === 0 ? <p className="text-sm text-muted">Nothing here.</p> : children}
      </div>
    </details>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3 text-sm">
      {children}
    </div>
  );
}

function ProposalRow({
  p,
  busy,
  run,
  approveLabel = "Approve",
  showReject = true,
}: {
  p: ProposalView;
  busy: boolean;
  run: RunAction;
  approveLabel?: string;
  showReject?: boolean;
}) {
  return (
    <Row>
      <p className="font-medium">{p.text}</p>
      <p className="text-muted">
        {p.course} · {where(p.branch, p.semester)} · {p.points} points from {p.voters} student
        {p.voters === 1 ? "" : "s"} · {day(p.updatedAt)}
      </p>
      {!p.canGoLive && (
        <p className="text-muted">
          Approving keeps it for the next syllabus data update (it cannot go live on its own).
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className={primaryBtn}
          onClick={() => void run({ action: "approve", proposalId: p.id })}
        >
          {approveLabel}
        </button>
        {showReject && (
          <button
            type="button"
            disabled={busy}
            className={btn}
            onClick={() => void run({ action: "reject", proposalId: p.id })}
          >
            Reject
          </button>
        )}
      </div>
    </Row>
  );
}

export function AdminQueues({
  view,
  busy,
  run,
}: {
  view: AdminView;
  busy: boolean;
  run: RunAction;
}) {
  const live = view.recent.filter((r) => !r.reverted).length;
  const unchecked = view.needsReview.filter((i) => !i.checkedAt).length;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        A fix goes live with {view.rule.minPoints} points from {view.rule.minUsers} students of the
        same branch and semester. Changes here reach students within a few minutes.
      </p>

      <Section title="Recently applied fixes" count={view.recent.length} open={live > 0}>
        {view.recent.map((r) => (
          <Row key={r.proposalId}>
            <p className="font-medium">{r.text}</p>
            <p className="text-muted">
              {r.course} · {where(r.branch, r.semester)} · {r.supporters} supporter
              {r.supporters === 1 ? "" : "s"} · live since {day(r.appliedAt)}
            </p>
            {r.reverted ? (
              <p className="font-semibold text-muted">Reverted</p>
            ) : (
              <div>
                <button
                  type="button"
                  disabled={busy}
                  className={btn}
                  onClick={() => void run({ action: "revert", proposalId: r.proposalId })}
                >
                  Revert
                </button>
              </div>
            )}
          </Row>
        ))}
      </Section>

      <Section title="Conflicts" count={view.conflicts.length} open={view.conflicts.length > 0}>
        {view.conflicts.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              These suggestions disagree. Approve one side (the others are rejected) or reject.
            </p>
            {group.items.map((p) => (
              <ProposalRow key={p.id} p={p} busy={busy} run={run} approveLabel="This one" />
            ))}
          </div>
        ))}
      </Section>

      <Section
        title="Waiting for your decision"
        count={view.review.length}
        open={view.review.length > 0}
      >
        <p className="text-sm text-muted">
          These have enough points, but students cannot make this kind of change on their own.
        </p>
        {view.review.map((p) => (
          <ProposalRow key={p.id} p={p} busy={busy} run={run} />
        ))}
      </Section>

      <Section title="Close to going live" count={view.near.length}>
        {view.near.map((p) => (
          <Row key={p.id}>
            <p className="font-medium">{p.text}</p>
            <p className="text-muted">
              {p.course} · {where(p.branch, p.semester)} · {p.points} of {view.rule.minPoints}{" "}
              points, {p.voters} student{p.voters === 1 ? "" : "s"}
            </p>
          </Row>
        ))}
      </Section>

      <Section title="Accepted, waiting for a data update" count={view.accepted.length}>
        {view.accepted.map((p) => (
          <Row key={p.id}>
            <p className="font-medium">{p.text}</p>
            <p className="text-muted">
              {p.course} · {where(p.branch, p.semester)} · {day(p.updatedAt)}
            </p>
          </Row>
        ))}
      </Section>

      <AdminLessons view={view} busy={busy} run={run} />

      <Section title="Branch health" count={view.health.length}>
        <ul className="flex flex-col gap-2">
          {view.health.map((h) => (
            <li key={h.branch} className="flex flex-col gap-1 text-sm">
              <span>
                <b>{branchShort.get(h.branch) ?? h.branch}</b>: {h.verified} of {h.courses} courses
                verified ({h.percent}%)
              </span>
              <span aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full bg-primary" style={{ width: `${h.percent}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Paused students" count={view.paused.length}>
        <p className="text-sm text-muted">
          Their fixes were reverted too often, so their flags and votes no longer count. Their
          accounts work normally.
        </p>
        {view.paused.map((t) => (
          <Row key={t.uid}>
            <p>
              <code className="break-all">{t.uid}</code> · {t.reverts} reverted fix
              {t.reverts === 1 ? "" : "es"} · since {day(t.updatedAt)}
            </p>
            <div>
              <button
                type="button"
                disabled={busy}
                className={btn}
                onClick={() => void run({ action: "resume", uid: t.uid })}
              >
                Let their votes count again
              </button>
            </div>
          </Row>
        ))}
      </Section>

      <Section
        title={`Handout import items to check (${unchecked} left)`}
        count={view.needsReview.length}
      >
        <p className="text-sm text-muted">
          Things the handout import was not sure about. Tick one once you have looked at it.
        </p>
        {view.needsReview.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={Boolean(item.checkedAt)}
              disabled={busy}
              onChange={(e) =>
                void run({ action: "check", itemId: item.id, checked: e.target.checked })
              }
            />
            <span className="flex flex-col gap-1">
              <span className="font-medium">
                {where(item.branch, item.sem)} · {item.reason}
              </span>
              <span className="break-words text-muted">{item.detail}</span>
            </span>
          </label>
        ))}
      </Section>
    </div>
  );
}
