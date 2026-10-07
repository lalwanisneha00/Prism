import { findProvider, looksLikeKey, validModel } from "@/lib/byok/catalogue";
import { announceKeysChanged } from "@/lib/byok/events";
import { getDb, type StoredApiKey } from "@/lib/storage/db";
import { getSettings, updateSettings } from "@/lib/storage/progress";

/*
 * The student's own API keys. They are used from this browser's IndexedDB, and a copy is kept in
 * the student's own private account settings (readable only by them, by the database rules) so a
 * key added on one device is there on every device they sign in on. The copy is never part of a
 * downloaded backup, and signing out removes the keys from the device.
 */

const sameKeys = (a: StoredApiKey[], b: StoredApiKey[]) => {
  const norm = (list: StoredApiKey[]) =>
    JSON.stringify(
      [...list]
        .sort((x, y) => x.id.localeCompare(y.id))
        .map((k) => [k.id, k.key, k.model, k.active]),
    );
  return norm(a) === norm(b);
};

async function readLocal(): Promise<StoredApiKey[]> {
  const db = await getDb();
  return db.getAll("apiKeys");
}

/** Copies the keys on this device into the account settings (synced when signed in). */
async function mirrorToAccount(): Promise<void> {
  try {
    await updateSettings({ apiKeys: await readLocal() });
  } catch {
    // The key still works on this device; syncing is a convenience.
  }
}

/**
 * Brings this device and the account in line. Keys in the account (added on another device) are
 * restored here; keys that only exist here (added while signed out) are added to the account.
 */
async function reconcile(): Promise<StoredApiKey[]> {
  const local = await readLocal();
  let remote: StoredApiKey[] | undefined;
  try {
    remote = (await getSettings())?.apiKeys;
  } catch {
    return local;
  }
  if (remote && !sameKeys(local, remote)) {
    const db = await getDb();
    const tx = db.transaction("apiKeys", "readwrite");
    await tx.store.clear();
    for (const k of remote) await tx.store.put(k);
    await tx.done;
    return remote;
  }
  if (!remote && local.length > 0) void mirrorToAccount();
  return local;
}

export async function listApiKeys(): Promise<StoredApiKey[]> {
  return reconcile();
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
  await mirrorToAccount();
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
  await mirrorToAccount();
  announceKeysChanged();
}

export async function removeApiKey(provider: string): Promise<void> {
  const db = await getDb();
  await db.delete("apiKeys", provider);
  await mirrorToAccount();
  announceKeysChanged();
}

/** Shows only the end of a key ("…a1b2"), so it can be recognised without being exposed. */
export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `••••${key.slice(-4)}`;
}
