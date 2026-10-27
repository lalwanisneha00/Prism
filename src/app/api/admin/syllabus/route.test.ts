import { describe, expect, it, vi } from "vitest";
import { memoryAdminStore } from "@/lib/syllabusFix/adminStore";
import { memoryLessonFlagStore } from "@/lib/syllabusFix/lessonFlagStore";
import { memoryProposalStore } from "@/lib/syllabusFix/proposalStore";
import { memoryUsageStore } from "@/lib/syllabusFix/usageStore";

vi.mock("server-only", () => ({}));
vi.stubEnv("ADMIN_UID", "owner, second-admin");

const store = memoryProposalStore();
const lessonStore = memoryLessonFlagStore();
const adminStore = memoryAdminStore(store, lessonStore);
const usage = memoryUsageStore();

// Tokens "good-<uid>" are valid; every student is ICT semester 3.
vi.mock("@/lib/firebase/admin", () => ({
  getAdmin: async () => ({
    auth: {
      verifyIdToken: async (token: string) => {
        if (!token.startsWith("good-")) throw new Error("bad token");
        return { uid: token.slice(5) };
      },
    },
    db: {
      collection: () => ({
        doc: () => ({
          collection: () => ({
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ branch: "ict", semester: 3 }) }),
            }),
          }),
        }),
      }),
    },
  }),
}));
vi.mock("@/lib/syllabusFix/proposalStore", async (original) => ({
  ...(await original<typeof import("@/lib/syllabusFix/proposalStore")>()),
  adminProposalStore: () => store,
}));
vi.mock("@/lib/syllabusFix/adminStore", async (original) => ({
  ...(await original<typeof import("@/lib/syllabusFix/adminStore")>()),
  adminSyllabusStore: () => adminStore,
}));
vi.mock("@/lib/syllabusFix/usageStore", async (original) => ({
  ...(await original<typeof import("@/lib/syllabusFix/usageStore")>()),
  adminUsageStore: () => usage,
}));

const adminRoute = await import("@/app/api/admin/syllabus/route");
const flagRoute = await import("@/app/api/syllabus/flag/route");

const AI = "pdeu-introduction-to-artificial-intelligence-ict";

const request = (method: "GET" | "POST", uid?: string, body?: unknown) =>
  new Request("http://localhost/api", {
    method,
    headers: {
      "content-type": "application/json",
      ...(uid ? { authorization: `Bearer good-${uid}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

async function json(res: Promise<Response>) {
  const r = await res;
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
}

const flag = (uid: string, topic = "intelligent-agents") =>
  json(
    flagRoute.POST(
      request("POST", uid, {
        flag: {
          type: "topic-not-in-syllabus",
          subject: AI,
          chapter: "introduction-to-ai-and-searching",
          topic,
        },
        profile: {},
      }),
    ),
  );

describe("/api/admin/syllabus", () => {
  it("lets only the admin accounts in", async () => {
    expect((await json(adminRoute.GET(request("GET")))).status).toBe(401);
    const student = await json(adminRoute.GET(request("GET", "u1")));
    expect(student).toMatchObject({ status: 403, body: { kind: "not-admin" } });
    expect((await json(adminRoute.GET(request("GET", "second-admin")))).status).toBe(200);
    const action = await json(
      adminRoute.POST(request("POST", "u1", { action: "revert", proposalId: "x" })),
    );
    expect(action.status).toBe(403);
  });

  it("shows a live fix in plain words and reverts it", async () => {
    for (const uid of ["u1", "u2", "u3"]) await flag(uid);
    const { body } = await json(adminRoute.GET(request("GET", "owner")));
    const view = body.view as {
      recent: { proposalId: string; text: string; reverted: boolean }[];
      health: { branch: string; courses: number }[];
      needsReview: unknown[];
    };
    expect(view.recent).toHaveLength(1);
    expect(view.recent[0].text).toMatch(/is not in the syllabus of Introduction to Artificial/);
    expect(view.health.find((h) => h.branch === "ict")?.courses).toBeGreaterThan(0);
    expect(view.needsReview.length).toBeGreaterThan(100);

    const id = view.recent[0].proposalId;
    const undo = await json(
      adminRoute.POST(request("POST", "owner", { action: "revert", proposalId: id })),
    );
    expect(undo.body).toMatchObject({ ok: true, outcome: "reverted" });
    const again = await json(
      adminRoute.POST(request("POST", "owner", { action: "revert", proposalId: id })),
    );
    expect(again.status).toBe(409);
    expect(store.trusts.get("u1")?.revertedFixes).toEqual([id]);
  });

  it("ticks import items and refuses unknown actions", async () => {
    const r = await json(
      adminRoute.POST(request("POST", "owner", { action: "check", itemId: "abc", checked: true })),
    );
    expect(r.body).toEqual({ ok: true });
    expect(adminStore.checked.abc).toBeDefined();
    expect(
      (await json(adminRoute.POST(request("POST", "owner", { action: "delete-all" })))).status,
    ).toBe(400);
  });
});

describe("daily limits", () => {
  it("stops a student's flags past the day's limit", async () => {
    usage.usage.set(`u9__${new Date().toISOString().slice(0, 10)}`, {
      uid: "u9",
      day: new Date().toISOString().slice(0, 10),
      counts: { flag: 20 },
    });
    const r = await flag("u9", "types-of-learning");
    expect(r).toMatchObject({ status: 429, body: { ok: false, kind: "rate-limited" } });
    expect((await flag("u8", "types-of-learning")).status).toBe(200);
  });
});
