import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { exportBackup } from "@/lib/storage/backup";
import { getDb, resetDbForTests } from "@/lib/storage/db";
import { getSettings } from "@/lib/storage/progress";
import {
  getActiveKey,
  listApiKeys,
  maskKey,
  removeApiKey,
  saveApiKey,
  setActiveKey,
} from "@/lib/byok/store";

const KEY = "sk-abcdefghijklmnop1234";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

describe("API key store", () => {
  it("saves a key, makes the first one active, and masks it for display", async () => {
    await saveApiKey({ provider: "openai", key: KEY, model: "gpt-4.1-mini" });
    expect((await getActiveKey())?.id).toBe("openai");
    await saveApiKey({ provider: "groq", key: `${KEY}x`, model: "openai/gpt-oss-120b" });
    expect((await getActiveKey())?.id).toBe("openai");
    await setActiveKey("groq");
    expect((await getActiveKey())?.id).toBe("groq");
    expect(maskKey(KEY)).toBe("••••1234");
  });

  it("removes a key and can switch back to the shared key", async () => {
    await saveApiKey({ provider: "openai", key: KEY, model: "gpt-4.1-mini" });
    await setActiveKey(null);
    expect(await getActiveKey()).toBeNull();
    await removeApiKey("openai");
    expect(await listApiKeys()).toEqual([]);
  });

  it("refuses nonsense", async () => {
    await expect(saveApiKey({ provider: "nope", key: KEY, model: "m" })).rejects.toThrow();
    await expect(saveApiKey({ provider: "openai", key: "short", model: "m" })).rejects.toThrow();
    await expect(
      saveApiKey({ provider: "openai", key: KEY, model: "bad model;" }),
    ).rejects.toThrow();
  });

  it("is never exported, but follows the account through the settings", async () => {
    await saveApiKey({ provider: "openai", key: KEY, model: "gpt-4.1-mini" });
    expect(JSON.stringify(await exportBackup())).not.toContain(KEY);
    // The copy in the account settings is what another device restores from.
    expect((await getSettings())?.apiKeys?.[0]?.key).toBe(KEY);
  });
  it("restores the account's keys on a device that has none", async () => {
    await saveApiKey({ provider: "openai", key: KEY, model: "gpt-4.1-mini" });
    // A fresh device: the settings came down from the account, the key store is empty.
    const db = await getDb();
    await db.clear("apiKeys");
    expect((await getActiveKey())?.key).toBe(KEY);
    expect(await listApiKeys()).toHaveLength(1);
  });
});
