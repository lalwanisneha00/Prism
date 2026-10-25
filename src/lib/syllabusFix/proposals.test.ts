import { describe, expect, it } from "vitest";
import type { Change } from "./handoutMatch";
import { memoryProposalStore, type HandoutSubmission } from "./proposalStore";
import { proposalId } from "./proposals";
import { compareStudentHandout, summarizeChanges, toPrismCourse } from "./studentHandoutCompare";
import type { StudentHandout } from "./studentHandout";

const course = toPrismCourse({
  id: "pdeu-ai-ict",
  name: "Introduction to Artificial Intelligence",
  offerings: [{ branch: "ict", semester: 3 }],
  chapters: [
    {
      id: "intro",
      name: "Introduction to AI",
      topics: [
        { id: "agents", name: "Intelligent agents" },
        { id: "problems", name: "AI problems" },
        { id: "old", name: "History of chess computers", status: "retired" },
      ],
    },
    {
      id: "search",
      name: "Searching",
      topics: [{ id: "uninformed", name: "Uninformed search" }],
    },
  ],
});

const handout: StudentHandout = {
  code: "24IC204T",
  title: "Introduction to Artificial Intelligence",
  courseType: "theory",
  units: [
    { order: 1, name: "Introduction to AI", topics: ["Intelligent agents", "AI problems"] },
    { order: 2, name: "Searching", topics: ["Uninformed search", "Heuristic search"] },
  ],
  experiments: [],
};

describe("compareStudentHandout", () => {
  it("finds a missing topic and leaves retired ones out", () => {
    const changes = compareStudentHandout(handout, course, [course], {
      branch: "ict",
      sem: 3,
      fromProfile: true,
    });
    expect(changes.map((c) => c.type)).toEqual(["topic missing"]);
    expect(changes[0].handout?.topic).toBe("Heuristic search");
    expect(summarizeChanges(changes)).toEqual(["1 topic missing"]);
  });

  it("notes a course listed in another semester for the student's branch", () => {
    const changes = compareStudentHandout(handout, course, [course], {
      branch: "ict",
      sem: 4,
      fromProfile: true,
    });
    expect(changes[0]).toMatchObject({ type: "course in wrong semester", to: { semester: 4 } });
    expect(summarizeChanges(changes)[0]).toMatch(/different semester/);
  });
});

describe("proposalId", () => {
  const change: Change = {
    type: "topic missing",
    branch: "ict",
    sem: 3,
    detail: "Add topic",
    handout: { course: "AI", code: null, unit: "Searching", topic: "Heuristic Search" },
    to: { subject: "pdeu-ai-ict", chapter: "search" },
  };
  it("is the same for the same change, whatever the wording or pages", () => {
    const again = {
      ...change,
      detail: "other words",
      handout: { ...change.handout!, topic: "heuristic search.", pages: "3" },
    };
    expect(proposalId(again)).toBe(proposalId(change));
    expect(proposalId(change)).toMatch(/^pdeu-ai-ict__[0-9a-f]{8}$/);
  });
  it("differs for a different topic", () => {
    expect(
      proposalId({ ...change, handout: { ...change.handout!, topic: "Game playing" } }),
    ).not.toBe(proposalId(change));
  });
});

describe("memoryProposalStore", () => {
  const changes = compareStudentHandout(handout, course, [course], {
    branch: "ict",
    sem: 3,
    fromProfile: true,
  });
  const submission = (uid: string): HandoutSubmission => ({
    uid,
    subject: course.id,
    branch: "ict",
    semester: 3,
    profileFrom: "cloud",
    handout,
    at: "2026-10-25T10:00:00.000Z",
  });

  it("adds 3 points per student, once per student", async () => {
    const store = memoryProposalStore();
    await store.submitHandout(submission("a"), changes, 3);
    const again = await store.submitHandout(submission("a"), changes, 3);
    expect(again.counted).toBe(0);
    await store.submitHandout(submission("b"), changes, 3);
    const [p] = [...store.proposals.values()];
    expect(p).toMatchObject({ points: 6, voters: 2, status: "pending", type: "topic missing" });
    expect(store.handouts.size).toBe(3);
  });

  it("does not reopen a settled proposal", async () => {
    const store = memoryProposalStore();
    await store.submitHandout(submission("a"), changes, 3);
    const [p] = [...store.proposals.values()];
    store.proposals.set(p.id, { ...p, status: "applied" });
    const r = await store.submitHandout(submission("b"), changes, 3);
    expect(r.proposals).toBe(0);
    expect(store.proposals.get(p.id)?.points).toBe(3);
  });
});
