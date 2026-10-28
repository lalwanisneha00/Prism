import { describe, expect, it, vi } from "vitest";
import { labVideosFor } from "@/lib/labs/labVideos";
import {
  afterVideoFlag,
  cacheFrom,
  memoryVideoStore,
  needsSearch,
  shownVideos,
} from "@/lib/labs/videoStore";
import {
  isTrustedChannel,
  parseIsoDuration,
  rankVideos,
  searchVideos,
  videoQuery,
  type Video,
} from "@/lib/labs/youtube";
import { findExperiment } from "@/lib/labs/experiment";
import { labSubjects } from "@/lib/subjects";

const video = (id: string, over: Partial<Video> = {}): Video => ({
  id,
  title: `Video ${id}`,
  channel: "Someone",
  duration: 600,
  views: 1000,
  likes: 10,
  rank: 5,
  trusted: false,
  ...over,
});

describe("YouTube helpers", () => {
  it("reads ISO durations", () => {
    expect(parseIsoDuration("PT12M5S")).toBe(725);
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("P0D")).toBe(0);
    expect(parseIsoDuration("junk")).toBe(0);
  });

  it("knows the trusted channels (case does not matter)", () => {
    expect(isTrustedChannel("nptel")).toBe(true);
    expect(isTrustedChannel("Random Uploads")).toBe(false);
  });

  it("ranks trusted channels first, then popularity, and prefers short videos", () => {
    const ranked = rankVideos([
      video("popular1", { views: 5_000_000, likes: 90_000, rank: 0 }),
      video("trusted1", { trusted: true, views: 2000, likes: 20 }),
      video("long1234", { views: 5_000_000, likes: 90_000, rank: 0, duration: 3 * 3600 }),
    ]);
    expect(ranked.map((v) => v.id)).toEqual(["trusted1", "popular1", "long1234"]);
  });

  it("builds a plain search query", () => {
    expect(videoQuery("To determine the focal length of a convex lens", "Physics Lab")).toBe(
      "determine the focal length of a convex lens experiment lab",
    );
    expect(videoQuery("Implement a stack in Python", "Programming Lab")).toMatch(/tutorial$/);
  });

  it("searches, then reads durations and counts", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      calls.push(url);
      return url.includes("/search")
        ? Response.json({ items: [{ id: { videoId: "abcdef123" } }] })
        : Response.json({
            items: [
              {
                id: "abcdef123",
                snippet: { title: "Lens lab", channelTitle: "NPTEL", channelId: "c1" },
                contentDetails: { duration: "PT8M" },
                statistics: { viewCount: "1200", likeCount: "30" },
              },
            ],
          });
    });
    const found = await searchVideos("KEY", "lens", fetcher);
    expect(found).toEqual([
      expect.objectContaining({ id: "abcdef123", duration: 480, trusted: true, views: 1200 }),
    ]);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("key=KEY");
  });
});

describe("video cache and flags", () => {
  const now = new Date("2026-10-28T00:00:00Z");
  const ids = { subject: "lab", topic: "exp", query: "q" };
  const many = ["aaaaaa1", "bbbbbb2", "cccccc3", "dddddd4", "eeeeee5"].map((id, i) =>
    video(id, { views: 10 ** (6 - i) }),
  );

  it("shows the best three", () => {
    expect(shownVideos(cacheFrom(undefined, many, ids, now)).map((v) => v.id)).toEqual([
      "aaaaaa1",
      "bbbbbb2",
      "cccccc3",
    ]);
  });

  it("hides a video after three different students flag it, and the next one takes its place", () => {
    let cache = cacheFrom(undefined, many, ids, now);
    for (const uid of ["u1", "u1", "u2"]) cache = afterVideoFlag(cache, "aaaaaa1", uid).cache;
    expect(cache.flags.aaaaaa1).toEqual(["u1", "u2"]);
    expect(shownVideos(cache)[0].id).toBe("aaaaaa1");
    const last = afterVideoFlag(cache, "aaaaaa1", "u3");
    expect(last.hidden).toBe(true);
    expect(shownVideos(last.cache).map((v) => v.id)).toEqual(["bbbbbb2", "cccccc3", "dddddd4"]);
  });

  it("searches again only when old or emptied", () => {
    const cache = cacheFrom(undefined, many, ids, now);
    expect(needsSearch(cache, now)).toBe(false);
    expect(needsSearch(cache, new Date("2027-10-28T00:00:00Z"))).toBe(true);
    expect(needsSearch({ ...cache, hidden: many.map((v) => v.id) }, now)).toBe(true);
    // A new search keeps hidden videos hidden.
    const again = cacheFrom({ ...cache, hidden: ["aaaaaa1"] }, many, ids, now);
    expect(shownVideos(again).map((v) => v.id)).not.toContain("aaaaaa1");
  });
});

describe("labVideosFor", () => {
  const lab = labSubjects.find((s) => s.chapters.some((c) => c.topics.length > 0))!;
  const exp = findExperiment(lab.id, lab.chapters.find((c) => c.topics.length)!.topics[0].id)!;
  const youtube = () =>
    vi.fn(async (url: string) =>
      url.includes("/search")
        ? Response.json({ items: [{ id: { videoId: "abcdef123" } }] })
        : Response.json({
            items: [
              {
                id: "abcdef123",
                snippet: { title: "Demo", channelTitle: "NPTEL", channelId: "c1" },
                contentDetails: { duration: "PT8M" },
                statistics: {},
              },
            ],
          }),
    );

  it("calls YouTube once, then serves the cache (second page view makes no API call)", async () => {
    const store = memoryVideoStore();
    const fetcher = youtube();
    const first = await labVideosFor(exp, { key: "KEY", store, fetcher });
    const second = await labVideosFor(exp, { key: "KEY", store, fetcher });
    expect(first).toEqual(second);
    expect(first.status === "ok" && first.videos[0].id).toBe("abcdef123");
    expect(fetcher).toHaveBeenCalledTimes(2); // search + details, for the first view only
  });

  it("says when no key is set, and never searches without a cache to keep the result", async () => {
    expect(await labVideosFor(exp, { store: memoryVideoStore() })).toEqual({ status: "no-key" });
    const fetcher = youtube();
    expect(await labVideosFor(exp, { key: "KEY", store: null, fetcher })).toEqual({
      status: "unavailable",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
