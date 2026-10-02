import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OutboxEntry, RecentTopic, SyncedCollection } from "@/lib/storage/db";
import {
  QUOTA_PAUSE_MS,
  RemoteError,
  SyncEngine,
  todayKey,
  type AnyRecord,
  type LocalAdapter,
  type RemoteAdapter,
  type SyncStatus,
  type UsageCounts,
} from "@/lib/sync/engine";

/* In-memory stand-ins for IndexedDB and Firestore. */

function fakeLocal() {
  const data = new Map<string, Map<string, AnyRecord>>();
  const outbox = new Map<string, OutboxEntry>();
  const meta = new Map<string, unknown>();
  let clock = 0;
  const col = (c: string) => data.get(c) ?? data.set(c, new Map()).get(c)!;
  const local: LocalAdapter & {
    put(c: SyncedCollection, r: AnyRecord): void;
    outbox: typeof outbox;
    meta: typeof meta;
  } = {
    outbox,
    meta,
    put(c, r) {
      col(c).set(r.id, r);
      outbox.set(`${c}/${r.id}`, {
        key: `${c}/${r.id}`,
        collection: c,
        id: r.id,
        queuedAt: ++clock,
      });
    },
    getAll: async (c) => [...col(c).values()] as never,
    get: async (c, id) => col(c).get(id) as never,
    putFromRemote: async (c, r) => void col(c).set(r.id, r),
    enqueue: async (c, id) =>
      void outbox.set(`${c}/${id}`, { key: `${c}/${id}`, collection: c, id, queuedAt: ++clock }),
    listOutbox: async () => [...outbox.values()],
    removeFromOutbox: async (entries) => {
      for (const e of entries)
        if ((outbox.get(e.key)?.queuedAt ?? Infinity) <= e.queuedAt) outbox.delete(e.key);
    },
    getMeta: async <T>(k: string) => meta.get(k) as T | undefined,
    setMeta: async (k, v) => void meta.set(k, v),
    clearAll: async () => {
      data.clear();
      outbox.clear();
    },
  };
  return local;
}

function fakeRemote() {
  const data = new Map<string, Map<string, AnyRecord>>();
  const col = (c: string) => data.get(c) ?? data.set(c, new Map()).get(c)!;
  const remote: RemoteAdapter & { data: typeof data; fail?: RemoteError; pushes: number } = {
    data,
    pushes: 0,
    pullAll: async (c) => {
      if (remote.fail) throw remote.fail;
      return [...col(c).values()] as never;
    },
    push: async (changes) => {
      if (remote.fail) throw remote.fail;
      remote.pushes++;
      for (const { collection, record } of changes) col(collection).set(record.id, record);
    },
  };
  return remote;
}

const topic = (id: string, updatedAt: number, title = id): RecentTopic => ({
  id,
  updatedAt,
  deleted: false,
  subject: "em",
  chapter: "c",
  topic: id,
  level: "first-encounter",
  duration: 10,
  title,
  chapterName: "C",
  viewedAt: updatedAt,
});

let local: ReturnType<typeof fakeLocal>;
let remote: ReturnType<typeof fakeRemote>;
let statuses: SyncStatus[];
let clock: number;

function engine(uid = "alice", extra: Partial<ConstructorParameters<typeof SyncEngine>[0]> = {}) {
  return new SyncEngine({
    uid,
    local,
    remote,
    onStatus: (s) => statuses.push(s),
    now: () => clock,
    ...extra,
  });
}

beforeEach(() => {
  local = fakeLocal();
  remote = fakeRemote();
  statuses = [];
  clock = 1_000_000;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("first sign-in", () => {
  it("merges guest data into the account without duplicates", async () => {
    local.put("recentTopics", topic("gauss", 10));
    local.put("recentTopics", topic("lenz", 20));
    remote.data.set(
      "recentTopics",
      new Map([
        ["gauss", topic("gauss", 5)],
        ["ohm", topic("ohm", 7)],
      ]),
    );

    await engine().start();

    expect([...remote.data.get("recentTopics")!.keys()].sort()).toEqual(["gauss", "lenz", "ohm"]);
    expect((await local.getAll("recentTopics")).map((r) => r.id).sort()).toEqual([
      "gauss",
      "lenz",
      "ohm",
    ]);
    expect(remote.data.get("recentTopics")!.get("gauss")!.updatedAt).toBe(10); // device copy was newer
    expect(local.outbox.size).toBe(0);
    expect(statuses.at(-1)).toBe("synced");
  });

  it("takes the cloud version when it is newer", async () => {
    local.put("recentTopics", topic("gauss", 10, "old title"));
    remote.data.set("recentTopics", new Map([["gauss", topic("gauss", 99, "new title")]]));
    local.outbox.clear(); // pretend the old local change was already synced long ago

    await engine().start();
    expect((await local.get("recentTopics", "gauss"))?.title).toBe("new title");
  });
});

describe("accounts on a shared device", () => {
  it("clears the previous account's data when a different account signs in", async () => {
    local.put("recentTopics", topic("alice-only", 10));
    await engine("alice").start();
    remote.data.clear(); // bob's cloud is empty

    await engine("bob").start();
    expect(await local.getAll("recentTopics")).toEqual([]);
    expect(remote.data.get("recentTopics")?.size ?? 0).toBe(0); // nothing of alice's reached bob
  });

  it("keeps data when the same account signs in again", async () => {
    await engine("alice").start();
    local.put("recentTopics", topic("x", 50));
    await engine("alice").start();
    expect(await local.get("recentTopics", "x")).toBeDefined();
  });
});

describe("uploading", () => {
  it("downloads the cloud copy only once per session", async () => {
    const pulled = new Set<string>();
    const session = {
      pulled: (u: string) => pulled.has(u),
      markPulled: (u: string) => void pulled.add(u),
    };
    const spy = vi.spyOn(remote, "pullAll");
    await engine("alice", { session }).start();
    const firstReads = spy.mock.calls.length;
    await engine("alice", { session }).start();
    expect(spy.mock.calls.length).toBe(firstReads);
  });

  it("sends changes in batches of at most 100", async () => {
    for (let i = 0; i < 250; i++)
      local.put("quizAttempts", {
        ...topic(`q${i}`, i),
        lessonId: "l",
        score: 1,
        total: 2,
        at: i,
      } as never);
    await engine().flush();
    expect(remote.pushes).toBe(3);
    expect(local.outbox.size).toBe(0);
  });

  it("keeps a change that happened while it was being uploaded", async () => {
    local.put("recentTopics", topic("gauss", 1));
    const original = remote.push;
    remote.push = async (changes) => {
      local.put("recentTopics", topic("gauss", 2)); // edited mid-upload
      await original(changes);
    };
    await engine().flush();
    expect(local.outbox.has("recentTopics/gauss")).toBe(true);
  });

  it("syncs deletions as tombstones", async () => {
    local.put("recentTopics", { ...topic("gauss", 5), deleted: true });
    await engine().flush();
    expect(remote.data.get("recentTopics")!.get("gauss")!.deleted).toBe(true);
  });

  it("counts cloud reads and writes per day", async () => {
    local.put("recentTopics", topic("a", 1));
    local.put("recentTopics", topic("b", 1));
    await engine().start();
    const usage = local.meta.get(todayKey(clock)) as UsageCounts;
    expect(usage.writes).toBe(2);
    expect(usage.reads).toBeGreaterThan(0);
  });
});

describe("when things go wrong", () => {
  it("pauses for 10 minutes on a quota error, keeping every change", async () => {
    local.put("recentTopics", topic("gauss", 1));
    remote.fail = new RemoteError("quota", "resource-exhausted");
    const e = engine();
    await e.flush();
    expect(e.getStatus()).toBe("paused");
    expect(local.outbox.size).toBe(1);

    remote.fail = undefined;
    clock += 60_000;
    await e.flush();
    expect(e.getStatus()).toBe("paused"); // still resting

    clock += QUOTA_PAUSE_MS;
    await e.flush();
    expect(e.getStatus()).toBe("synced");
    expect(local.outbox.size).toBe(0);
  });

  it("reports offline without trying the network", async () => {
    local.put("recentTopics", topic("gauss", 1));
    const spy = vi.spyOn(remote, "push");
    const e = engine("alice", { isOnline: () => false });
    await e.start();
    expect(e.getStatus()).toBe("offline");
    expect(spy).not.toHaveBeenCalled();
    expect(local.outbox.size).toBe(1);
  });

  it("shows an error for unexpected failures but loses nothing", async () => {
    local.put("recentTopics", topic("gauss", 1));
    remote.fail = new RemoteError("permission", "denied");
    const e = engine();
    await e.flush();
    expect(e.getStatus()).toBe("error");
    expect(local.outbox.size).toBe(1);
  });
});
