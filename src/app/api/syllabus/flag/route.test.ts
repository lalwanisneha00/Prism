import { describe, expect, it, vi } from "vitest";
import { memoryLessonFlagStore } from "@/lib/syllabusFix/lessonFlagStore";
import { memoryProposalStore } from "@/lib/syllabusFix/proposalStore";

vi.mock("server-only", () => ({}));

const store = memoryProposalStore();
const lessonStore = memoryLessonFlagStore();
const settings = new Map<string, Record<string, unknown>>([
  ["u1", { branch: "ict", semester: 3 }],
  ["u2", { branch: "ict", semester: 3 }],
]);

// A stand-in for Firebase: tokens "good-<uid>" are valid; settings come from the map above.
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
        doc: (uid: string) => ({
          collection: () => ({
            doc: () => ({
              get: async () => ({ exists: settings.has(uid), data: () => settings.get(uid) }),
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

const flagRoute = await import("@/app/api/syllabus/flag/route");
const missingRoute = await import("@/app/api/syllabus/missing/route");
const lessonRoute = await import("@/app/api/lesson/flag/route");

const AI = "pdeu-introduction-to-artificial-intelligence-ict";

async function call(
  route: { POST: (r: Request) => Promise<Response> },
  body: unknown,
  uid?: string,
) {
  const res = await route.POST(
    new Request("http://localhost/api", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(uid ? { authorization: `Bearer ${uid === "bad" ? "bad" : `good-${uid}`}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const notInSyllabus = {
  type: "topic-not-in-syllabus",
  subject: AI,
  chapter: "introduction-to-ai-and-searching",
  topic: "intelligent-agents",
};

describe("POST /api/syllabus/flag", () => {
  it("needs sign-in and a valid flag", async () => {
    expect((await call(flagRoute, { flag: notInSyllabus, profile: {} })).status).toBe(401);
    expect((await call(flagRoute, { flag: notInSyllabus, profile: {} }, "bad")).status).toBe(401);
    expect((await call(flagRoute, { flag: { type: "x" }, profile: {} }, "u1")).status).toBe(400);
    expect(
      (await call(flagRoute, { flag: { ...notInSyllabus, subject: "nope" }, profile: {} }, "u1"))
        .status,
    ).toBe(404);
    const wrong = { ...notInSyllabus, topic: "not-a-topic" };
    expect((await call(flagRoute, { flag: wrong, profile: {} }, "u1")).status).toBe(400);
  });

  it("adds 1 point per student, once each, for the student's branch and semester", async () => {
    const one = await call(flagRoute, { flag: notInSyllabus, profile: {} }, "u1");
    expect(one.body).toMatchObject({ ok: true, counted: true, status: "pending" });
    const again = await call(flagRoute, { flag: notInSyllabus, profile: {} }, "u1");
    expect(again.body).toMatchObject({ ok: true, counted: false });
    await call(flagRoute, { flag: notInSyllabus, profile: {} }, "u2");
    const [p] = [...store.proposals.values()];
    expect(p).toMatchObject({ points: 2, voters: 2, branch: "ict", semester: 3 });
    expect(store.flags.size).toBe(2);
    expect([...store.votes.values()][0]).toMatchObject({ kind: "flag", profileFrom: "cloud" });
  });

  it("asks for the branch and semester before a course flag", async () => {
    const flag = { type: "course-not-in-branch", subject: AI };
    const r = await call(flagRoute, { flag, profile: {} }, "u9");
    expect(r.status).toBe(400);
    expect(r.body.kind).toBe("no-profile");
    const ok = await call(flagRoute, { flag, profile: { branch: "ict", semester: 3 } }, "u9");
    expect(ok.status).toBe(200);
  });
});

describe("POST /api/syllabus/missing", () => {
  it("offers existing courses before a new one (no sign-in to check)", async () => {
    const r = await call(missingRoute, {
      check: true,
      missing: { name: "Introduction to Artificial Intelligence", semester: 5 },
      profile: { branch: "ict" },
    });
    expect(r.status).toBe(200);
    const ids = (r.body.candidates as { id: string }[]).map((c) => c.id);
    expect(ids).toContain(AI);
  });

  it("links the course the student picked, refuses one already listed", async () => {
    const listed = await call(
      missingRoute,
      { missing: { name: "AI", semester: 3, linkTo: AI }, profile: {} },
      "u1",
    );
    expect(listed.status).toBe(409);
    const linked = await call(
      missingRoute,
      { missing: { name: "AI", semester: 5, linkTo: AI }, profile: {} },
      "u1",
    );
    expect(linked.body).toMatchObject({ ok: true, linked: true, counted: true });
    const fresh = await call(
      missingRoute,
      { missing: { name: "Quantum Computing", semester: 5 }, profile: {} },
      "u1",
    );
    expect(fresh.body).toMatchObject({ ok: true, linked: false });
    const types = [...store.proposals.values()].map((p) => p.type);
    expect(types).toEqual(
      expect.arrayContaining(["course missing from branch/semester", "new course"]),
    );
  });
});

describe("POST /api/lesson/flag", () => {
  const flag = {
    subject: AI,
    topic: "intelligent-agents",
    level: "college",
    durationMin: 15,
    type: "wrong-fact",
    excerpt: "Agents never sense",
  };

  it("keeps one flag per student per lesson version", async () => {
    expect((await call(lessonRoute, { flag, profile: {} })).status).toBe(401);
    expect(
      (await call(lessonRoute, { flag: { ...flag, topic: "x" }, profile: {} }, "u1")).status,
    ).toBe(404);
    const a = await call(lessonRoute, { flag, profile: {} }, "u1");
    expect(a.body).toMatchObject({ ok: true, replaced: false });
    const b = await call(lessonRoute, { flag: { ...flag, type: "confusing" }, profile: {} }, "u1");
    expect(b.body).toMatchObject({ ok: true, replaced: true });
    expect(lessonStore.flags.size).toBe(1);
    expect([...lessonStore.flags.values()][0]).toMatchObject({
      type: "confusing",
      lessonKey: `${AI}_intelligent-agents_college_15`,
      branch: "ict",
    });
  });
});
