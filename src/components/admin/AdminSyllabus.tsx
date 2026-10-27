"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import {
  loadAdminView,
  outcomeText,
  sendAdminAction,
  type AdminAction,
} from "@/components/admin/adminApi";
import { AdminQueues } from "@/components/admin/AdminQueues";
import type { AdminLessonFlag } from "@/app/api/admin/syllabus/route";
import type { AdminView } from "@/lib/syllabusFix/adminView";

/*
 * The admin dashboard (syllabus fix, Phase 6). Signs in, loads every queue in one request and
 * sends one decision at a time. Whether the account is the admin is decided by the server; this
 * component only shows what the server answers.
 */

type Load =
  | { state: "loading" }
  | { state: "ready"; view: AdminView }
  | { state: "error"; kind: string; message: string };

export type RunAction = (action: AdminAction) => Promise<AdminLessonFlag[] | undefined>;

async function fetchQueues(user: { getIdToken: () => Promise<string> }): Promise<Load> {
  const token = await user.getIdToken().catch(() => undefined);
  if (!token) return { state: "error", kind: "signed-out", message: "Sign in again." };
  const r = await loadAdminView(token);
  if (!r.ok) return { state: "error", kind: r.kind, message: r.message };
  return r.view
    ? { state: "ready", view: r.view }
    : { state: "error", kind: "unavailable", message: "The server sent no data." };
}

export function AdminSyllabus() {
  const { status, user, signIn } = useAuth();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    if (user) setLoad(await fetchQueues(user));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let current = true;
    void fetchQueues(user).then((next) => {
      if (current) setLoad(next);
    });
    return () => {
      current = false;
    };
  }, [user]);

  const run: RunAction = async (action) => {
    if (!user) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken().catch(() => undefined);
      if (!token) return void setNotice({ ok: false, text: "Sign in again." });
      const r = await sendAdminAction(token, action);
      if (!r.ok) return void setNotice({ ok: false, text: r.message });
      if (action.action === "lesson-flags") return r.flags ?? [];
      setNotice({ ok: true, text: outcomeText(action.action, r.outcome) });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") return <p className="text-muted">Checking your sign-in...</p>;
  if (status === "unavailable")
    return <Problem text="Sign-in is not set up on this copy of Prism." />;
  if (status === "signed-out" || !user)
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted">Sign in with the admin account to see the queues.</p>
        <button
          type="button"
          onClick={() => void signIn()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
        >
          Sign in with Google
        </button>
      </div>
    );
  if (load.state === "loading") return <p className="text-muted">Loading the queues...</p>;
  if (load.state === "error")
    return (
      <div className="flex flex-col items-start gap-3">
        <Problem text={load.message} />
        {load.kind !== "not-admin" && (
          <button
            type="button"
            onClick={() => {
              setLoad({ state: "loading" });
              void refresh();
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            Try again
          </button>
        )}
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className={`rounded-xl border p-3 text-sm ${notice.ok ? "border-success/40 bg-success/10" : "border-danger/40 bg-danger/10 text-danger"}`}
        >
          {notice.text}
        </p>
      )}
      <AdminQueues view={load.view} busy={busy} run={run} />
    </div>
  );
}

function Problem({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">
      {text}
    </p>
  );
}
