import type { SyncStatus } from "@/lib/sync/engine";

export const syncLabels: Record<SyncStatus, { text: string; dot: string; help: string }> = {
  synced: { text: "Synced ✓", dot: "bg-success", help: "Everything is saved to your account." },
  syncing: {
    text: "Syncing…",
    dot: "bg-primary animate-pulse",
    help: "Sending your latest changes.",
  },
  offline: {
    text: "Offline",
    dot: "bg-muted",
    help: "You're offline. Changes are saved on this device and will sync when you're back.",
  },
  paused: {
    text: "Sync paused",
    dot: "bg-warning",
    help: "Sync paused, your progress is safe on this device. We'll try again in a few minutes.",
  },
  error: {
    text: "Sync problem",
    dot: "bg-danger",
    help: "Couldn't reach your account. Your progress is safe on this device.",
  },
};

export function SyncBadge({ status }: { status: SyncStatus | null }) {
  const label = syncLabels[status ?? "syncing"];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold"
      title={label.help}
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${label.dot}`} />
      {label.text}
    </span>
  );
}
