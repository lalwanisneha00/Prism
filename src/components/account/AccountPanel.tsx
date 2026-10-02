"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { SyncBadge, syncLabels } from "@/components/account/SyncBadge";
import { exportBackup, importBackup } from "@/lib/storage/backup";

const card = "flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:p-6";
const button =
  "w-fit rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

export function AccountPanel() {
  const { status, user, sync, signIn, signOut, deleteAccount, syncNow } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      {status === "signed-in" && user ? (
        <section className={card} aria-labelledby="profile-title">
          <h2 id="profile-title" className="text-lg font-bold">
            Your account
          </h2>
          <div className="flex items-center gap-3">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element -- small Google profile photo
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="size-12 rounded-full"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold">{user.displayName}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SyncBadge status={sync} />
            <span className="text-sm text-muted">{syncLabels[sync ?? "syncing"].help}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={syncNow}>
              Sync now
            </button>
            <button type="button" className={button} onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
          <p className="text-xs text-muted">
            Signing out removes your data from this device; it stays safe in your account.
          </p>
        </section>
      ) : (
        <section className={card} aria-labelledby="guest-title">
          <h2 id="guest-title" className="text-lg font-bold">
            You&apos;re using Prism as a guest
          </h2>
          <p className="text-muted">
            Everything you save stays on this device. Sign in with Google to keep your saved
            lessons, quiz scores and progress in sync across your laptop and phone. What you already
            have here is added to your account when you sign in.
          </p>
          {status === "signed-out" && (
            <button
              type="button"
              onClick={signIn}
              className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
            >
              Sign in with Google
            </button>
          )}
          {status === "unavailable" && (
            <p className="text-sm text-muted">
              Accounts aren&apos;t switched on for this copy of Prism.
            </p>
          )}
        </section>
      )}

      <BackupCard />

      <section className={card} aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="text-lg font-bold">
          Privacy in short
        </h2>
        <p className="text-muted">
          We store only what you study: saved lessons, recent topics, quiz scores, audio positions
          and settings. No ads, no tracking, nothing sold. Uploaded files will stay on your device.{" "}
          <Link href="/privacy" className="font-semibold text-primary underline underline-offset-2">
            Read the privacy note
          </Link>
        </p>
      </section>

      {status === "signed-in" && <DeleteAccountCard onDelete={deleteAccount} />}
    </div>
  );
}

function BackupCard() {
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 1)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prism-backup-${backup.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Backup downloaded. Keep the file somewhere safe.");
    } catch {
      setMessage("Couldn't create the backup on this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    setBusy(true);
    try {
      const result = await importBackup(JSON.parse(await chosen.text()));
      setMessage(
        `Backup imported: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped (already newer here or not valid).`,
      );
    } catch (err) {
      setMessage(
        err instanceof Error && err.message.includes("Prism")
          ? err.message
          : "That file couldn't be read as a Prism backup.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card} aria-labelledby="backup-title">
      <h2 id="backup-title" className="text-lg font-bold">
        Backup
      </h2>
      <p className="text-muted">
        Download everything saved on this device as one file, or bring a backup back. Importing
        keeps whichever copy of each item is newer, so nothing is duplicated.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={download} disabled={busy}>
          ⬇ Download backup
        </button>
        <button
          type="button"
          className={button}
          onClick={() => file.current?.click()}
          disabled={busy}
        >
          ⬆ Import backup
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={restore}
        />
      </div>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}

function DeleteAccountCard({
  onDelete,
}: {
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });

  return (
    <section className={`${card} border-danger/40`} aria-labelledby="delete-title">
      <h2 id="delete-title" className="text-lg font-bold text-danger">
        Delete my account and data
      </h2>
      <p className="text-muted">
        This permanently deletes your account and everything synced to it: saved lessons, recent
        topics, quiz scores, audio positions and settings. It also clears them from this device. It
        can&apos;t be undone. Download a backup first if you might want your data later.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Type <span className="font-mono font-semibold">DELETE</span> to confirm
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-48 rounded-xl border border-border bg-surface px-3 py-2"
          autoComplete="off"
        />
      </label>
      <button
        type="button"
        disabled={confirm !== "DELETE" || state.busy}
        onClick={async () => {
          setState({ busy: true });
          const result = await onDelete();
          setState({ busy: false, error: result.ok ? undefined : result.error });
        }}
        className="w-fit rounded-full bg-danger px-5 py-2.5 font-semibold text-white disabled:opacity-40"
      >
        {state.busy ? "Deleting…" : "Delete everything"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </section>
  );
}
