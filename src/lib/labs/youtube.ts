import { z } from "zod";
import trusted from "@/data/labs/trustedChannels.json";
import { LAB_CONFIG } from "@/lib/labs/config";

/*
 * Lab videos from the free YouTube Data API v3 (syllabus fix, Phase 7B). The AI never writes video
 * links: we search, rank (trusted channels first, then likes, views and relevance, short videos
 * preferred) and cache the result per experiment, so the API is called once per experiment.
 * Server only (the key is YOUTUBE_API_KEY).
 */

export const VideoSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/),
  title: z.string().min(1).max(200),
  channel: z.string().min(1).max(120),
  channelId: z.string().max(60).optional(),
  /** Seconds. */
  duration: z.number().int().min(0),
  views: z.number().int().min(0),
  likes: z.number().int().min(0),
  /** Position in YouTube's own relevance order (0 = most relevant). */
  rank: z.number().int().min(0),
  trusted: z.boolean(),
});
export type Video = z.infer<typeof VideoSchema>;

/** "PT1H2M3S" → 3723 seconds (0 when it cannot be read). */
export function parseIsoDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

const trustedNames = new Set(trusted.channels.map((c) => c.name.toLowerCase()));
const trustedIds = new Set(
  trusted.channels.flatMap((c) => ("channelId" in c && c.channelId ? [String(c.channelId)] : [])),
);

export function isTrustedChannel(name: string, id?: string): boolean {
  return trustedNames.has(name.toLowerCase()) || (id !== undefined && trustedIds.has(id));
}

/** What we search for: the experiment in plain words, plus "experiment" or "lab". */
export function videoQuery(experiment: string, course: string): string {
  const cleaned = experiment
    .replace(/^(to|aim:?)\s+/i, "")
    .replace(/\b(part|max)\s*[-–]?\s*[a-z0-9]+\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
  const isSoftware = /\b(program|software|matlab|simulink|python|aspen|implement|code)\b/i.test(
    `${experiment} ${course}`,
  );
  return `${cleaned} ${isSoftware ? "tutorial" : "experiment lab"}`;
}

/** A video's score: higher is better. Pure, so the order is easy to test and tune. */
export function videoScore(v: Video): number {
  const minutes = v.duration / 60;
  const length =
    minutes < 1 ? -15 : minutes <= LAB_CONFIG.videos.preferMaxMinutes ? 6 : minutes <= 40 ? 0 : -10;
  return (
    (v.trusted ? 100 : 0) +
    Math.log10(v.likes + 1) * 4 +
    Math.log10(v.views + 1) * 2 +
    Math.max(0, 15 - v.rank) +
    length
  );
}

export function rankVideos(videos: readonly Video[]): Video[] {
  return [...videos].sort((a, b) => videoScore(b) - videoScore(a));
}

type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

const API = "https://www.googleapis.com/youtube/v3";

/** Search, then read durations and counts. Two calls: about 101 quota units per experiment. */
export async function searchVideos(
  key: string,
  query: string,
  fetcher: Fetch = fetch,
  signal?: AbortSignal,
): Promise<Video[]> {
  const search = new URL(`${API}/search`);
  search.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(LAB_CONFIG.videos.searchResults),
    q: query,
    safeSearch: "strict",
    videoEmbeddable: "true",
    relevanceLanguage: "en",
    key,
  }).toString();
  const found = await fetcher(search.toString(), { signal });
  if (!found.ok) throw new Error(`youtube search ${found.status}`);
  const items = z
    .object({ items: z.array(z.object({ id: z.object({ videoId: z.string() }) })).default([]) })
    .parse(await found.json()).items;
  const ids = items.map((i) => i.id.videoId);
  if (ids.length === 0) return [];
  const details = new URL(`${API}/videos`);
  details.search = new URLSearchParams({
    part: "snippet,contentDetails,statistics",
    id: ids.join(","),
    key,
  }).toString();
  const res = await fetcher(details.toString(), { signal });
  if (!res.ok) throw new Error(`youtube videos ${res.status}`);
  const VideoItem = z.object({
    id: z.string(),
    snippet: z.object({ title: z.string(), channelTitle: z.string(), channelId: z.string() }),
    contentDetails: z.object({ duration: z.string() }),
    statistics: z
      .object({ viewCount: z.string().optional(), likeCount: z.string().optional() })
      .default({}),
  });
  const list = z.object({ items: z.array(VideoItem).default([]) }).parse(await res.json()).items;
  return list.flatMap((v) => {
    const video = VideoSchema.safeParse({
      id: v.id,
      title: v.snippet.title.slice(0, 200),
      channel: v.snippet.channelTitle.slice(0, 120) || "YouTube",
      channelId: v.snippet.channelId,
      duration: parseIsoDuration(v.contentDetails.duration),
      views: Number(v.statistics.viewCount ?? 0) || 0,
      likes: Number(v.statistics.likeCount ?? 0) || 0,
      rank: Math.max(0, ids.indexOf(v.id)),
      trusted: isTrustedChannel(v.snippet.channelTitle, v.snippet.channelId),
    });
    return video.success ? [video.data] : [];
  });
}
