import { describe, expect, it } from "vitest";
import { chapterHref, parsePlan, validateChapterRequest } from "@/lib/chapter/request";

const base = { subject: "em", chapter: "electrostatics", level: "first-encounter", minutes: "45" };

describe("chapter lesson requests", () => {
  it("accepts a whole chapter (no topics listed)", () => {
    const r = validateChapterRequest(base);
    expect(r.ok && r.request.whole).toBe(true);
    expect(r.ok && r.request.topics.length).toBeGreaterThan(2);
  });

  it("accepts chosen topics, keeping chapter order", () => {
    const whole = validateChapterRequest(base);
    if (!whole.ok) throw new Error("expected ok");
    const [a, b] = whole.request.topics;
    const r = validateChapterRequest({ ...base, topics: `${b.id},${a.id}`, notes: "1" });
    expect(r.ok && r.request.topics.map((t) => t.id)).toEqual([a.id, b.id]);
    expect(r.ok && r.request.notes).toBe(true);
  });

  it("rejects unknown topics, levels and odd durations", () => {
    expect(validateChapterRequest({ ...base, topics: "nope" }).ok).toBe(false);
    expect(validateChapterRequest({ ...base, level: "genius" }).ok).toBe(false);
    expect(validateChapterRequest({ ...base, minutes: "2" }).ok).toBe(false);
    expect(validateChapterRequest({ ...base, minutes: "45.5" }).ok).toBe(false);
    expect(validateChapterRequest({ ...base, subject: "law" }).ok).toBe(false);
  });

  it("round-trips through the URL, including an adjusted plan", () => {
    const href = chapterHref("/chapter/lesson", {
      subject: "em",
      chapter: "electrostatics",
      topics: ["gauss-law", "electric-flux"],
      level: "exam-prep",
      minutes: 30,
      plan: { "gauss-law": 20, "electric-flux": 10 },
      notes: true,
    });
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    const r = validateChapterRequest(params);
    expect(r.ok && r.request.plan).toEqual({ "gauss-law": 20, "electric-flux": 10 });
  });

  it("ignores malformed plan entries", () => {
    const topics = [{ id: "a", name: "A" }];
    expect(parsePlan("a:12,b:5,a:x,", topics)).toEqual({ a: 12 });
    expect(parsePlan("", topics)).toBeUndefined();
  });
});
