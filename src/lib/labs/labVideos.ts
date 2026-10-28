import type { Experiment } from "@/lib/labs/experiment";
import {
  cacheFrom,
  needsSearch,
  shownVideos,
  videoCacheId,
  type VideoStore,
} from "@/lib/labs/videoStore";
import { searchVideos, videoQuery, type Video } from "@/lib/labs/youtube";

/*
 * The videos of one experiment (syllabus fix, Phase 7B): from the cache when it has them, else one
 * YouTube search that is then cached. Without a YouTube key (or without Firestore to cache in)
 * the page simply shows no videos, so the free daily quota is never spent on every page view.
 */

export type VideoReply =
  | { status: "ok"; videos: Video[] }
  | { status: "no-key" }
  | { status: "unavailable" }
  | { status: "not-found" };

type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

export async function labVideosFor(
  { subject, topic }: Pick<Experiment, "subject" | "topic">,
  deps: { key?: string; store: VideoStore | null; fetcher?: Fetch; now?: Date },
): Promise<VideoReply> {
  const id = videoCacheId(subject.id, topic.id);
  const now = deps.now ?? new Date();
  const cached = deps.store ? await deps.store.get(id).catch(() => undefined) : undefined;
  if (cached && !needsSearch(cached, now)) return { status: "ok", videos: shownVideos(cached) };
  if (!deps.key)
    return cached ? { status: "ok", videos: shownVideos(cached) } : { status: "no-key" };
  // No cache to keep the result in: don't search at all (each search costs 100 quota units).
  if (!deps.store) return { status: "unavailable" };
  const query = videoQuery(topic.name, subject.name);
  try {
    const found = await searchVideos(deps.key, query, deps.fetcher);
    const cache = cacheFrom(cached, found, { subject: subject.id, topic: topic.id, query }, now);
    await deps.store.set(id, cache);
    return { status: "ok", videos: shownVideos(cache) };
  } catch (err) {
    console.warn("[labs/videos] search failed:", String(err).slice(0, 200));
    return cached ? { status: "ok", videos: shownVideos(cached) } : { status: "unavailable" };
  }
}
