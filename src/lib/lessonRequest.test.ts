import { describe, expect, it } from "vitest";
import { lessonHref, validateLessonRequest } from "@/lib/lessonRequest";

const valid = {
  subject: "em",
  chapter: "electrostatics",
  topic: "gauss-law",
  level: "first-encounter",
  duration: "10",
};

describe("validateLessonRequest", () => {
  it("accepts a complete, valid request", () => {
    const result = validateLessonRequest(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.topic.name).toBe("Gauss's law");
    expect(result.request.level.name).toBe("First Encounter");
    expect(result.request.duration).toBe(10);
  });

  it("reports every missing field at once", () => {
    const result = validateLessonRequest({ subject: "em" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["chapter", "duration", "level", "topic"]);
  });

  it("rejects a topic from a different chapter", () => {
    const result = validateLessonRequest({ ...valid, topic: "faradays-law" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.topic).toMatch(/isn't in the chosen chapter/);
  });

  it("rejects levels that are not switched on yet", () => {
    const result = validateLessonRequest({ ...valid, level: "deep-dive" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.level).toMatch(/isn't available yet/);
  });

  it("rejects unknown subjects and odd durations", () => {
    const result = validateLessonRequest({ ...valid, subject: "chemistry", duration: "7" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.subject).toBeDefined();
    expect(result.errors.duration).toMatch(/5, 10, 15/);
  });

  it("uses the first value when a URL repeats a parameter", () => {
    const result = validateLessonRequest({ ...valid, topic: ["gauss-law", "electric-flux"] });
    expect(result.ok && result.request.topic.id).toBe("gauss-law");
  });
});

describe("lessonHref", () => {
  it("round-trips through the validator", () => {
    const result = validateLessonRequest(valid);
    if (!result.ok) throw new Error("expected valid");
    const params = Object.fromEntries(new URL(lessonHref(result.request), "http://x").searchParams);
    expect(validateLessonRequest(params).ok).toBe(true);
  });
});
