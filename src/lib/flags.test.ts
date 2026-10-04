import { describe, expect, it } from "vitest";
import { FLAGS } from "@/lib/flags";

describe("feature flags", () => {
  it("has community branches off by default", () => {
    expect(FLAGS.community).toBe(false);
  });
  it("is a plain object of booleans", () => {
    for (const v of Object.values(FLAGS)) expect(typeof v).toBe("boolean");
  });
});
