import {
  getDb,
  SYNCED_COLLECTIONS,
  type OutboxEntry,
  type SyncedCollection,
  type SyncedRecords,
} from "@/lib/storage/db";

/*
 * The one way to change synced data. Every local write also drops a note in the outbox
 * ("this record changed"), like a letter waiting for the postman; the sync engine sends
 * them to the cloud when the student is signed in and online.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

/** Called after every local change (the sync engine uses it to schedule an upload). */
export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function putRecord<C extends SyncedCollection>(
  collection: C,
  record: SyncedRecords[C],
  { fromSync = false }: { fromSync?: boolean } = {},
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([collection, "outbox"], "readwrite");
  await tx.objectStore(collection).put(record as never);
  if (!fromSync) {
    const entry: OutboxEntry = {
      key: `${collection}/${record.id}`,
      collection,
      id: record.id,
      queuedAt: Date.now(),
    };
    await tx.objectStore("outbox").put(entry);
  }
  await tx.done;
  if (!fromSync) for (const l of listeners) l();
}

export async function getRecord<C extends SyncedCollection>(
  collection: C,
  id: string,
): Promise<SyncedRecords[C] | undefined> {
  return (await (await getDb()).get(collection, id)) as SyncedRecords[C] | undefined;
}

/** All records in a collection, tombstones included. */
export async function getAllRecords<C extends SyncedCollection>(
  collection: C,
): Promise<SyncedRecords[C][]> {
  return (await (await getDb()).getAll(collection)) as SyncedRecords[C][];
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  return (await getDb()).getAll("outbox");
}

/** Removes outbox entries that were sent, unless the record changed again meanwhile. */
export async function removeFromOutbox(sent: OutboxEntry[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  for (const entry of sent) {
    const current = await tx.store.get(entry.key);
    if (current && current.queuedAt <= entry.queuedAt) await tx.store.delete(entry.key);
  }
  await tx.done;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await getDb()).get("meta", key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await getDb()).put("meta", { key, value });
}

/** Wipes this device's copy (on sign-out, or when a different account signs in). */
export async function clearLocalData(): Promise<void> {
  const db = await getDb();
  const stores = [...SYNCED_COLLECTIONS, "notes", "outbox"] as const;
  const tx = db.transaction([...stores], "readwrite");
  await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
  await tx.done;
  for (const l of listeners) l();
}

/** Queues an existing record for upload without changing it. */
export async function enqueueRecord(collection: SyncedCollection, id: string): Promise<void> {
  const entry: OutboxEntry = { key: `${collection}/${id}`, collection, id, queuedAt: Date.now() };
  await (await getDb()).put("outbox", entry);
}
