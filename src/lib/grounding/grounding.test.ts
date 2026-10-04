import { searchedSources } from "@/lib/sources";
import { searchWikipedia } from "@/lib/grounding/wikipedia";
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

  it("drops a Wikipedia source whose article no longer exists", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ query: { pages: [{ title: "Gone", missing: true }] } }),
    ) as unknown as typeof fetch;
    const sources = sourcesForTopic("em", "motional-emf");
    const grounded = await groundSources(sources, { fetchImpl });
    expect(grounded.some((s) => s.publisher === "Wikipedia")).toBe(false);
    expect(grounded.length).toBe(sources.filter((s) => s.publisher !== "Wikipedia").length);
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

describe("searching Wikipedia for a student's own subject", () => {
  const reply = (titles: string[]) =>
    (async () =>
      new Response(
        JSON.stringify({ query: { search: titles.map((title) => ({ title })) } }),
      )) as unknown as typeof fetch;

  it("returns the best titles, skipping disambiguation pages", async () => {
    const titles = await searchWikipedia("Upanishads Indian Knowledge System", 2, {
      fetchImpl: reply(["Upanishads (disambiguation)", "Upanishads", "Vedanta"]),
    });
    expect(titles).toEqual(["Upanishads", "Vedanta"]);
  });

  it("returns nothing when Wikipedia can't be reached", async () => {
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await searchWikipedia("x", 2, { fetchImpl: failing })).toEqual([]);
  });

  it("turns search results into citable Wikipedia sources, retrying with the topic alone", async () => {
    const calls: string[] = [];
    const sources = await searchedSources("Tridosha theory", "Ayurveda basics", async (q) => {
      calls.push(q);
      return calls.length === 1 ? [] : ["Dosha"];
    });
    expect(calls).toEqual(["Tridosha theory Ayurveda basics", "Tridosha theory"]);
    expect(sources).toEqual([
      expect.objectContaining({
        id: "wikipedia-dosha",
        url: "https://en.wikipedia.org/wiki/Dosha",
      }),
    ]);
  });
});
