import { describe, expect, it, vi } from "vitest";
import { memoryProposalStore } from "@/lib/syllabusFix/proposalStore";

vi.mock("server-only", () => ({}));

const store = memoryProposalStore();
const settings = new Map<string, Record<string, unknown>>([["u1", { branch: "ict", semester: 3 }]]);

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

const { POST } = await import("@/app/api/syllabus/handout/route");

const SUBJECT = "pdeu-introduction-to-artificial-intelligence-ict";
const handout = {
  code: null,
  title: "Introduction to Artificial Intelligence",
  courseType: "theory",
  units: [
    {
      order: 1,
      name: "Introduction To AI And Searching",
      topics: ["AI Problems", "Intelligent Agents", "Quantum annealing"],
    },
  ],
  experiments: [],
};

async function post(body: unknown, token?: string) {
  const res = await POST(
    new Request("http://localhost/api/syllabus/handout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("POST /api/syllabus/handout", () => {
  it("compares without storing on a dry run (no sign-in needed)", async () => {
    const r = await post({ subject: SUBJECT, dryRun: true, handout, profile: {} });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.summary).toContain("1 topic missing");
    expect(store.proposals.size).toBe(0);
  });

  it("refuses bad input, unknown courses and empty handouts", async () => {
    expect((await post({ subject: SUBJECT })).status).toBe(400);
    expect((await post({ subject: "nope", dryRun: true, handout, profile: {} })).status).toBe(404);
    const empty = { ...handout, units: [{ order: 1, name: "U", topics: [] }] };
    expect(
      (await post({ subject: SUBJECT, dryRun: true, handout: empty, profile: {} })).status,
    ).toBe(400);
  });

  it("needs a valid sign-in to save", async () => {
    expect((await post({ subject: SUBJECT, handout, profile: {} })).status).toBe(401);
    expect((await post({ subject: SUBJECT, handout, profile: {} }, "bad")).status).toBe(401);
  });

  it("saves each difference as a proposal worth 3 points, profile from the cloud", async () => {
    const r = await post(
      { subject: SUBJECT, handout, profile: { branch: "ce", semester: 5 } },
      "good-u1",
    );
    expect(r.status).toBe(200);
    expect(r.body.saved).toMatchObject({ counted: r.body.changes });
    const proposals = [...store.proposals.values()];
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.every((p) => p.points === 3 && p.branch === "ict" && p.semester === 3)).toBe(
      true,
    );
    const [vote] = [...store.votes.values()];
    expect(vote).toMatchObject({ uid: "u1", kind: "handout", profileFrom: "cloud" });
  });
});
