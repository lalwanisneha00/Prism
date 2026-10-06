import { findProvider, looksLikeKey, validModel } from "@/lib/byok/catalogue";
import { announceKeysChanged } from "@/lib/byok/events";
import { getDb, type StoredApiKey } from "@/lib/storage/db";

/*
 * The student's own API keys live in this browser's IndexedDB and nowhere else: they are not
 * a synced collection, so they never reach Firestore, backups, exports or shared links.
 */

export async function listApiKeys(): Promise<StoredApiKey[]> {
  const db = await getDb();
  return db.getAll("apiKeys");
}

export async function getActiveKey(): Promise<StoredApiKey | null> {
  return (await listApiKeys()).find((k) => k.active) ?? null;
}

/** Saves (or replaces) the key for a provider. The first key saved becomes the active one. */
export async function saveApiKey(
  input: { provider: string; key: string; model: string },
  now = Date.now(),
): Promise<StoredApiKey> {
  const info = findProvider(input.provider);
  const key = input.key.trim();
  if (!info) throw new Error("Unknown provider.");
  if (!looksLikeKey(key)) throw new Error("That doesn't look like an API key.");
  if (!validModel(input.model)) throw new Error("That model name isn't valid.");
  const db = await getDb();
  const all = await db.getAll("apiKeys");
  const previous = all.find((k) => k.id === info.id);
  const record: StoredApiKey = {
    id: info.id,
    key,
    model: input.model,
    active: previous?.active ?? !all.some((k) => k.active),
    savedAt: now,
  };
  await db.put("apiKeys", record);
  announceKeysChanged();
  return record;
}

/** Makes one provider's key the active one (or none, with null). */
export async function setActiveKey(provider: string | null): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("apiKeys", "readwrite");
  for (const k of await tx.store.getAll()) {
    const active = k.id === provider;
    if (k.active !== active) await tx.store.put({ ...k, active });
  }
  await tx.done;
  announceKeysChanged();
}

export async function removeApiKey(provider: string): Promise<void> {
  const db = await getDb();
  await db.delete("apiKeys", provider);
  announceKeysChanged();
}

/** Shows only the end of a key ("…a1b2"), so it can be recognised without being exposed. */
export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `••••${key.slice(-4)}`;
}
