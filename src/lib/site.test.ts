import { describe, expect, it } from "vitest";
import { site } from "@/lib/site";

describe("site config", () => {
  it("has a name and tagline", () => {
    expect(site.name).toBe("Prism");
    expect(site.tagline.length).toBeGreaterThan(0);
  });
});
