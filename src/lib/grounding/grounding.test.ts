import { describe, expect, it, vi } from "vitest";
import { groundSources, wikipediaTitleFromUrl } from "@/lib/grounding/groundSources";
import { trimExtract, USER_AGENT } from "@/lib/grounding/wikipedia";
import { sourcesForTopic } from "@/lib/sources";

describe("wikipediaTitleFromUrl", () => {
  it("decodes titles, including unicode and apostrophes", () => {
    expect(wikipediaTitleFromUrl("https://en.wikipedia.org/wiki/Gauss's_law")).toBe("Gauss's law");
    expect(wikipediaTitleFromUrl("https://en.wikipedia.org/wiki/Biot%E2%80%93Savart_law")).toBe(
      "Biot–Savart law",
    );
    expect(wikipediaTitleFromUrl("https://openstax.org/books/x")).toBeNull();
  });
});

describe("trimExtract", () => {
  it("keeps short text whole and cuts long text at a sentence", () => {
    expect(trimExtract("Short.")).toBe("Short.");
    const long = "A sentence here. ".repeat(500);
    const out = trimExtract(long, 1000);
    expect(out.length).toBeLessThanOrEqual(1003);
    expect(out.endsWith(". …")).toBe(true);
  });
});

describe("groundSources", () => {
  it("adds Wikipedia excerpts and leaves textbook links alone", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>)["user-agent"]).toBe(USER_AGENT);
      const title = new URL(String(url)).searchParams.get("titles");
      return Response.json({ query: { pages: [{ title, extract: `All about ${title}.` }] } });
    }) as unknown as typeof fetch;
    const grounded = await groundSources(sourcesForTopic("em", "lenzs-law"), { fetchImpl });
    const wiki = grounded.find((s) => s.publisher === "Wikipedia");
    const book = grounded.find((s) => s.publisher === "OpenStax");
    expect(wiki?.excerpt).toBe("All about Lenz's law.");
    expect(book?.excerpt).toBeUndefined();
  });

  it("still returns every source when Wikipedia is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    const sources = sourcesForTopic("em", "eddy-currents");
    const grounded = await groundSources(sources, { fetchImpl });
    expect(grounded.map((s) => s.id)).toEqual(sources.map((s) => s.id));
    expect(grounded.every((s) => !s.excerpt)).toBe(true);
  });
});
