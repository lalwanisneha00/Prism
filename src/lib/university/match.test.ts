import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { subjects } from "@/lib/subjects";
import {
  applyScope,
  hiddenCount,
  matchSubject,
  mergeScopes,
  nameSimilarity,
  scopeFor,
} from "@/lib/university/match";
import { parseUniversitySyllabus, type UniSubject } from "@/lib/university/parse";

const uni = parseUniversitySyllabus(
  readFileSync(path.join(process.cwd(), "test-fixtures", "university-syllabus-sample.txt"), "utf8"),
);
const find = (name: string) => uni.subjects.find((s) => s.name.includes(name))!;

describe("nameSimilarity", () => {
  it("ignores filler words and sequence numbers", () => {
    expect(nameSimilarity("Engineering Physics", "Applied Physics I")).toBe(1);
    expect(nameSimilarity("Engineering Mathematics II", "Engineering Mathematics")).toBe(1);
  });
  it("does not confuse neighbouring subjects", () => {
    expect(nameSimilarity("Environmental Science", "Environmental Engineering")).toBeLessThan(0.6);
    expect(nameSimilarity("Engineering Biology", "Molecular Biology")).toBeLessThan(0.6);
  });
});

describe("matchSubject", () => {
  it("finds built-in subjects by name", () => {
    expect(matchSubject(find("Applied Physics"), subjects).best?.subject.id).toBe(
      "pdeu-applied-physics",
    );
  });
  it("leaves subjects Prism does not teach as the student's own", () => {
    expect(
      matchSubject(
        { ...find("Indian Knowledge System"), name: "Underwater Basket Weaving", units: [] },
        subjects,
      ).best,
    ).toBeNull();
  });
});

describe("scope", () => {
  const physics = subjects.find((s) => s.id === "pdeu-applied-physics")!;

  it("hides chapters the university does not teach and keeps the ones it does", () => {
    const scope = scopeFor(physics, [find("Applied Physics")])!;
    expect(scope).toBeDefined();
    const kept = Object.keys(scope);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(physics.chapters.length);
    const scoped = applyScope(physics, scope);
    expect(scoped.chapters).toHaveLength(kept.length);
    expect(hiddenCount(physics, scope)).toBeGreaterThan(0);
  });

  it("changes nothing when the syllabus lists too little to say", () => {
    const thin: UniSubject = {
      name: "Applied Physics",
      outcomes: [],
      unclear: [],
      units: [{ name: "Unit 1", topics: ["Waves"] }],
    };
    expect(scopeFor(physics, [thin])).toBeUndefined();
    expect(applyScope(physics, undefined)).toBe(physics);
  });

  it("never leaves a prerequisite pointing at a hidden topic", () => {
    const scope = scopeFor(physics, [find("Applied Physics")])!;
    const scoped = applyScope(physics, scope);
    const ids = new Set(scoped.chapters.flatMap((c) => c.topics.map((t) => t.id)));
    for (const t of scoped.chapters.flatMap((c) => c.topics)) {
      for (const r of t.requires ?? []) expect(ids.has(r)).toBe(true);
    }
  });

  it("merges the scopes of two entries for the same subject", () => {
    const a = { c1: ["t1"] };
    const b = { c1: ["t2"], c2: ["t3"] };
    expect(mergeScopes(a, b)).toEqual({ c1: ["t1", "t2"], c2: ["t3"] });
    expect(mergeScopes(a, undefined)).toBeUndefined();
  });
});
