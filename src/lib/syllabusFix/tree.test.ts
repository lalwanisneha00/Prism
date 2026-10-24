import { describe, expect, it } from "vitest";
import { DEFAULT_META, isRetired, resolveMeta } from "@/lib/syllabusFix/tree";

describe("resolveMeta", () => {
  it("falls back to the defaults when nothing is written", () => {
    expect(resolveMeta({}, {}, {})).toEqual(DEFAULT_META);
  });

  it("inherits source and confidence from the nearest parent that has them", () => {
    const course = { source: "admin_handout", confidence: "verified" } as const;
    const chapter = { confidence: "pending" } as const;
    expect(resolveMeta(course, chapter, {})).toMatchObject({
      source: "admin_handout",
      confidence: "pending",
    });
    expect(resolveMeta(course, chapter, { source: "student_fix" }).source).toBe("student_fix");
  });

  it("retires everything under a retired course or chapter", () => {
    expect(resolveMeta({ status: "retired" }, {}, { status: "active" }).status).toBe("retired");
    expect(resolveMeta({}, { status: "retired" }).status).toBe("retired");
    expect(resolveMeta({}, {}, {}).status).toBe("active");
  });

  it("never inherits the vote count", () => {
    expect(resolveMeta({ verifiedByCount: 5 }, {}, {}).verifiedByCount).toBe(0);
    expect(resolveMeta({ verifiedByCount: 5 }).verifiedByCount).toBe(5);
    expect(resolveMeta({}, { verifiedByCount: 2 }).verifiedByCount).toBe(2);
  });

  it("isRetired only for an explicit retired status", () => {
    expect(isRetired({ status: "retired" })).toBe(true);
    expect(isRetired({})).toBe(false);
    expect(isRetired(undefined)).toBe(false);
  });
});
