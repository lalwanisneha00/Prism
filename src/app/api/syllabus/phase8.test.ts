import { describe, expect, it, vi } from "vitest";
import { findSubject } from "@/lib/subjects";
import { memoryAdminStore } from "@/lib/syllabusFix/adminStore";
import { memoryLessonFlagStore } from "@/lib/syllabusFix/lessonFlagStore";
import { applyOverlay, OverlaySchema } from "@/lib/syllabusFix/overlay";
import { memoryProposalStore } from "@/lib/syllabusFix/proposalStore";
import { memoryUsageStore } from "@/lib/syllabusFix/usageStore";

/*
 * Syllabus fix, Phase 8: the whole student correction loop through the real routes, in the order
 * students and the admin use them. Firebase is replaced by in-memory stores; every account is an
 * ICT semester 3 student (the class that takes Introduction to Artificial Intelligence).
 */

vi.mock("server-only", () => ({}));
vi.stubEnv("ADMIN_UID", "owner");

const store = memoryProposalStore();
const lessonStore = memoryLessonFlagStore();
const adminStore = memoryAdminStore(store, lessonStore);
const usage = memoryUsageStore();

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
vi.mock("@/lib/syllabusFix/lessonFlagStore", async (original) => ({
  ...(await original<typeof import("@/lib/syllabusFix/lessonFlagStore")>()),
  adminLessonFlagStore: () => lessonStore,
}));
vi.mock("@/lib/syllabusFix/adminStore", async (original) => ({
  ...(await original<typeof import("@/lib/syllabusFix/adminStore")>()),
  adminSyllabusStore: () => adminStore,
}));
vi.mock("@/lib/syllabusFix/usageStore", async (original) => ({
  ...(await original<typeof import("@/lib/syllabusFix/usageStore")>()),
  adminUsageStore: () => usage,
}));

const flagRoute = await import("@/app/api/syllabus/flag/route");
const promptRoute = await import("@/app/api/syllabus/prompt/route");
const voteRoute = await import("@/app/api/syllabus/vote/route");
const overlayRoute = await import("@/app/api/syllabus/overlay/route");
const handoutRoute = await import("@/app/api/syllabus/handout/route");
const adminRoute = await import("@/app/api/admin/syllabus/route");

const AI = "pdeu-introduction-to-artificial-intelligence-ict";
const TOPIC = "problem-formulation";
const CHAPTER = "introduction-to-ai-and-searching";

async function call(method: "GET" | "POST", route: unknown, uid?: string, body?: unknown) {
  const handler = (route as Record<string, (r: Request) => Promise<Response>>)[method];
  const res = await handler(
    new Request("http://localhost/api", {
      method,
      headers: {
        "content-type": "application/json",
        ...(uid ? { authorization: `Bearer good-${uid}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function liveCourse() {
  const overlay = OverlaySchema.parse(await (await overlayRoute.GET()).json());
  return applyOverlay(findSubject(AI)!, overlay);
}
const topicShown = (s: Awaited<ReturnType<typeof liveCourse>>) =>
  s.chapters.flatMap((c) => c.topics).find((t) => t.id === TOPIC)?.status !== "retired";

type View = {
  recent: { proposalId: string; reverted: boolean }[];
  conflicts: { key: string; items: { id: string }[] }[];
};

describe("flag → Agree prompt → goes live → admin reverts (three students)", () => {
  const flag = { type: "topic-not-in-syllabus", subject: AI, chapter: CHAPTER, topic: TOPIC };
  let proposalId = "";

  it("two students flag a topic; nothing changes yet", async () => {
    for (const uid of ["s1", "s2"]) {
      const r = await call("POST", flagRoute, uid, { flag, profile: {} });
      expect(r.body).toMatchObject({ ok: true, counted: true, status: "pending" });
    }
    proposalId = [...store.proposals.values()][0].id;
    expect(topicShown(await liveCourse())).toBe(true);
  });

  it("a classmate is asked to confirm, in plain words, and agrees: the fix goes live", async () => {
    const asked = await call("POST", promptRoute, "s3", { profile: {} });
    const prompt = asked.body.prompt as { proposalId: string; text: string };
    expect(prompt.proposalId).toBe(proposalId);
    expect(prompt.text).toMatch(/Problem Formulation/i);
    const vote = await call("POST", voteRoute, "s3", { proposalId, kind: "agree", profile: {} });
    expect(vote.body).toMatchObject({ counted: true, live: true, status: "applied" });
    expect(topicShown(await liveCourse())).toBe(false);
  });

  it("the admin sees the fix and reverts it; the topic is back for everyone", async () => {
    const view = (await call("GET", adminRoute, "owner")).body.view as View;
    expect(view.recent.map((r) => r.proposalId)).toContain(proposalId);
    const undo = await call("POST", adminRoute, "owner", { action: "revert", proposalId });
    expect(undo.body).toMatchObject({ ok: true, outcome: "reverted" });
    expect(topicShown(await liveCourse())).toBe(true);
    const after = (await call("GET", adminRoute, "owner")).body.view as View;
    expect(after.recent.find((r) => r.proposalId === proposalId)?.reverted).toBe(true);
  });
});

describe("two handouts that disagree land in the conflicts queue", () => {
  // The course as Prism lists it, with "Linear Regression" put in a different unit by each side.
  const units = (moveTo: number) => {
    const chapters = findSubject(AI)!.chapters.filter((c) => c.status !== "retired");
    const list = chapters.map((c, i) => ({
      order: i + 1,
      name: c.name,
      topics: c.topics
        .filter((t) => t.status !== "retired" && t.name !== "Linear Regression")
        .map((t) => t.name),
    }));
    list[moveTo].topics.push("Linear Regression");
    return list;
  };
  const handout = (moveTo: number) => ({
    code: null,
    title: "Introduction to Artificial Intelligence",
    courseType: "theory",
    units: units(moveTo),
    experiments: [],
  });
  const upload = (uid: string, moveTo: number) =>
    call("POST", handoutRoute, uid, { subject: AI, handout: handout(moveTo), profile: {} });

  it("keeps both sides waiting, then sends them to the admin instead of choosing", async () => {
    expect((await upload("h1", 2)).status).toBe(200); // Linear Regression → Neural Networks
    expect((await upload("h2", 3)).status).toBe(200); // Linear Regression → Reinforcement Learning
    const rivals = [...store.proposals.values()].filter(
      (p) => p.change.type === "topic under wrong unit",
    );
    expect(rivals).toHaveLength(2);
    expect(rivals.every((p) => p.status === "pending")).toBe(true);

    // A second student backs the first side: enough to go live, but the rival is strong too.
    await upload("h3", 2);
    const after = rivals.map((p) => store.proposals.get(p.id)?.status);
    expect(after).toEqual(["conflict", "conflict"]);
    // Neither side went live (other differences both handouts agree on may, as they should).
    const live = store.live.overlay.changes.filter((c) => !c.reverted).map((c) => c.proposalId);
    expect(live.some((id) => rivals.some((p) => p.id === id))).toBe(false);

    const view = (await call("GET", adminRoute, "owner")).body.view as View;
    const group = view.conflicts.find((g) => g.items.length === 2);
    expect(group?.items.map((i) => i.id).sort()).toEqual(rivals.map((p) => p.id).sort());
  });
});
