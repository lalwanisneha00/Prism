import { describe, expect, it } from "vitest";
import { errorCopy, needsKey, type LessonErrorKind } from "@/lib/lessonEvents";

describe("errorCopy", () => {
  it("talks to students, never about server files or settings", () => {
    for (const copy of Object.values(errorCopy)) {
      expect(copy.message).not.toMatch(/\.env|GEMINI_API_KEY|restart/);
    }
  });

  it("points to Your API keys when the shared key is missing or rejected", () => {
    expect(errorCopy["not-configured"].message).toContain("Your API keys");
    expect(errorCopy.auth.message).toContain("Your API keys");
  });
});

describe("needsKey", () => {
  it("is true only when a student's own key would help", () => {
    const yes: LessonErrorKind[] = ["not-configured", "auth"];
    const no: LessonErrorKind[] = ["rate-limit", "unavailable", "offline", "invalid-request"];
    for (const k of yes) expect(needsKey(k)).toBe(true);
    for (const k of no) expect(needsKey(k)).toBe(false);
  });
});
