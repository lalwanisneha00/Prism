import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { exportBackup } from "@/lib/storage/backup";
import { resetDbForTests, SYNCED_COLLECTIONS } from "@/lib/storage/db";
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

  it("is never synced or exported", async () => {
    await saveApiKey({ provider: "openai", key: KEY, model: "gpt-4.1-mini" });
    expect(SYNCED_COLLECTIONS).not.toContain("apiKeys" as never);
    expect(JSON.stringify(await exportBackup())).not.toContain(KEY);
  });
});
