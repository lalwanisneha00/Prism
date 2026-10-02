import {
  SYNCED_COLLECTIONS,
  type OutboxEntry,
  type SyncedCollection,
  type SyncedRecords,
} from "@/lib/storage/db";

/*
 * Local-first sync (SPEC §9.3). The device copy is the main copy; this engine
 *  1. on sign-in, merges the cloud copy into it once per session (newest updatedAt wins),
 *  2. sends queued local changes (the outbox) to the cloud in batches,
 *  3. backs off on quota errors ("Sync paused") and when offline, never losing data.
 * It talks to two small adapters, so the same logic runs against IndexedDB + Firestore in
 * the app and against in-memory fakes in tests.
 */

export type SyncStatus = "synced" | "syncing" | "offline" | "paused" | "error";

export type AnyRecord = SyncedRecords[SyncedCollection];

export type LocalAdapter = {
  getAll<C extends SyncedCollection>(c: C): Promise<SyncedRecords[C][]>;
  get<C extends SyncedCollection>(c: C, id: string): Promise<SyncedRecords[C] | undefined>;
  /** Writes a record that came from the cloud (does not queue it for upload). */
  putFromRemote<C extends SyncedCollection>(c: C, record: SyncedRecords[C]): Promise<void>;
  /** Queues an existing local record for upload. */
  enqueue(c: SyncedCollection, id: string): Promise<void>;
  listOutbox(): Promise<OutboxEntry[]>;
  removeFromOutbox(entries: OutboxEntry[]): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  clearAll(): Promise<void>;
};

export type RemoteAdapter = {
  pullAll<C extends SyncedCollection>(c: C): Promise<SyncedRecords[C][]>;
  push(changes: { collection: SyncedCollection; record: AnyRecord }[]): Promise<void>;
};

/** Why a cloud call failed, in terms the engine can act on. */
export class RemoteError extends Error {
  constructor(
    public readonly kind: "quota" | "offline" | "permission" | "other",
    message: string,
  ) {
    super(message);
    this.name = "RemoteError";
  }
}

export type UsageCounts = { reads: number; writes: number };

export const BATCH_SIZE = 100;
export const QUOTA_PAUSE_MS = 10 * 60_000;

export type SyncEngineOptions = {
  uid: string;
  local: LocalAdapter;
  remote: RemoteAdapter;
  onStatus?: (status: SyncStatus) => void;
  isOnline?: () => boolean;
  now?: () => number;
  /** Remembers that this session already downloaded the cloud copy (sessionStorage in the app). */
  session?: { pulled(uid: string): boolean; markPulled(uid: string): void };
};

export function todayKey(now: number): string {
  return `usage:${new Date(now).toISOString().slice(0, 10)}`;
}

export class SyncEngine {
  private status: SyncStatus = "syncing";
  private pausedUntil = 0;
  private flushing: Promise<void> | null = null;
  private stopped = false;
  private readonly now: () => number;
  private readonly isOnline: () => boolean;

  constructor(private readonly opts: SyncEngineOptions) {
    this.now = opts.now ?? Date.now;
    this.isOnline = opts.isOnline ?? (() => true);
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  private setStatus(status: SyncStatus) {
    if (this.stopped) return;
    this.status = status;
    this.opts.onStatus?.(status);
  }

  /** Called once after sign-in. */
  async start(): Promise<void> {
    const { local, uid, session } = this.opts;
    const owner = await local.getMeta<string>("ownerUid");
    if (owner && owner !== uid) {
      // Another account used this device before: its data is safe in its own cloud copy.
      await local.clearAll();
      await local.setMeta("lastPull", null);
    }
    await local.setMeta("ownerUid", uid);

    if (!session?.pulled(uid)) {
      const ok = await this.pullAndMerge();
      if (ok) session?.markPulled(uid);
    }
    await this.flush();
  }

  stop() {
    this.stopped = true;
  }

  /** Downloads the cloud copy and merges it with the device copy (newest wins, per item). */
  async pullAndMerge(): Promise<boolean> {
    const { local, remote } = this.opts;
    if (!this.isOnline()) {
      this.setStatus("offline");
      return false;
    }
    this.setStatus("syncing");
    try {
      let reads = 0;
      for (const c of SYNCED_COLLECTIONS) {
        const remoteRecords = await remote.pullAll(c);
        reads += Math.max(1, remoteRecords.length);
        const localById = new Map((await local.getAll(c)).map((r) => [r.id, r]));
        for (const r of remoteRecords) {
          const l = localById.get(r.id);
          if (!l || r.updatedAt > l.updatedAt) await local.putFromRemote(c, r);
          else if (l.updatedAt > r.updatedAt) await local.enqueue(c, l.id);
          localById.delete(r.id);
        }
        // Whatever is only on this device (e.g. guest data before the first sign-in) goes up.
        for (const l of localById.values()) await local.enqueue(c, l.id);
      }
      await this.count({ reads, writes: 0 });
      await local.setMeta("lastPull", this.now());
      return true;
    } catch (err) {
      this.handleError(err);
      return false;
    }
  }

  /** Sends queued changes. Safe to call often: overlapping calls share one run. */
  flush(): Promise<void> {
    this.flushing ??= this.doFlush().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async doFlush(): Promise<void> {
    const { local, remote } = this.opts;
    if (this.now() < this.pausedUntil) return this.setStatus("paused");
    if (!this.isOnline()) return this.setStatus("offline");

    const outbox = await local.listOutbox();
    if (outbox.length === 0) return this.setStatus("synced");
    this.setStatus("syncing");

    try {
      for (let i = 0; i < outbox.length; i += BATCH_SIZE) {
        const chunk = outbox.slice(i, i + BATCH_SIZE);
        const changes: { collection: SyncedCollection; record: AnyRecord }[] = [];
        for (const entry of chunk) {
          const record = await local.get(entry.collection, entry.id);
          if (record) changes.push({ collection: entry.collection, record });
        }
        if (changes.length) await remote.push(changes);
        await local.removeFromOutbox(chunk);
        await this.count({ reads: 0, writes: changes.length });
      }
      // Changes made while uploading are picked up by the next run.
      const left = await local.listOutbox();
      this.setStatus(left.length ? "syncing" : "synced");
    } catch (err) {
      this.handleError(err);
    }
  }

  private handleError(err: unknown) {
    const kind = err instanceof RemoteError ? err.kind : "other";
    if (kind === "quota") {
      this.pausedUntil = this.now() + QUOTA_PAUSE_MS;
      this.setStatus("paused");
    } else if (kind === "offline") {
      this.setStatus("offline");
    } else {
      console.warn("[sync]", err);
      this.setStatus("error");
    }
  }

  /** Daily counts of cloud reads and writes made from this device (shown on /dev/usage). */
  private async count(delta: UsageCounts) {
    const key = todayKey(this.now());
    const current = (await this.opts.local.getMeta<UsageCounts>(key)) ?? { reads: 0, writes: 0 };
    await this.opts.local.setMeta(key, {
      reads: current.reads + delta.reads,
      writes: current.writes + delta.writes,
    });
  }
}
