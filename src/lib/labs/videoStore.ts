import type { Firestore } from "firebase-admin/firestore";
import { z } from "zod";
import { LAB_CONFIG } from "@/lib/labs/config";
import { rankVideos, VideoSchema, type Video } from "@/lib/labs/youtube";

/*
 * The video cache (syllabus fix, Phase 7B): Firestore `labVideos/{subject}__{topic}`, written only
 * by the server. It keeps the ranked list, the students who flagged each video ("Video doesn't
 * match this experiment"), and which videos are hidden. Pure planning first, storage after.
 */

export const VideoCacheSchema = z.object({
  subject: z.string(),
  topic: z.string(),
  query: z.string(),
  videos: z.array(VideoSchema),
  /** Video id → uids of students who said it does not match. */
  flags: z.record(z.string(), z.array(z.string())).default({}),
  hidden: z.array(z.string()).default([]),
  fetchedAt: z.string(),
});
export type VideoCache = z.infer<typeof VideoCacheSchema>;

export const videoCacheId = (subject: string, topic: string) => `${subject}__${topic}`;

/** The videos students see now: the best ones nobody has hidden. */
export function shownVideos(cache: VideoCache): Video[] {
  const hidden = new Set(cache.hidden);
  return cache.videos.filter((v) => !hidden.has(v.id)).slice(0, LAB_CONFIG.videos.shown);
}

/** A cache needs a new search when it is old, or flags hid every video it had. */
export function needsSearch(cache: VideoCache | undefined, now: Date): boolean {
  if (!cache) return true;
  const age = now.getTime() - Date.parse(cache.fetchedAt);
  return age > LAB_CONFIG.videos.refreshDays * 86_400_000 || shownVideos(cache).length === 0;
}

/** A fresh search result as a cache, keeping the old flags and hidden videos. */
export function cacheFrom(
  before: VideoCache | undefined,
  found: readonly Video[],
  ids: { subject: string; topic: string; query: string },
  now: Date,
): VideoCache {
  const hidden = new Set(before?.hidden ?? []);
  const ranked = rankVideos(found);
  // Hidden videos stay listed (so they stay hidden); new ones fill the rest.
  const kept = [
    ...ranked.filter((v) => !hidden.has(v.id)).slice(0, LAB_CONFIG.videos.kept),
    ...(before?.videos ?? []).filter((v) => hidden.has(v.id)),
  ];
  return {
    ...ids,
    videos: kept,
    flags: before?.flags ?? {},
    hidden: [...hidden],
    fetchedAt: now.toISOString(),
  };
}

/** One student's flag. Returns the new cache and whether the video is now hidden. */
export function afterVideoFlag(
  cache: VideoCache,
  videoId: string,
  uid: string,
): { cache: VideoCache; hidden: boolean; counted: boolean } {
  const by = cache.flags[videoId] ?? [];
  if (by.includes(uid)) return { cache, hidden: cache.hidden.includes(videoId), counted: false };
  const flaggedBy = [...by, uid];
  const hide = flaggedBy.length >= LAB_CONFIG.videos.hideAfterFlags;
  return {
    cache: {
      ...cache,
      flags: { ...cache.flags, [videoId]: flaggedBy },
      hidden: hide && !cache.hidden.includes(videoId) ? [...cache.hidden, videoId] : cache.hidden,
    },
    hidden: hide,
    counted: true,
  };
}

export interface VideoStore {
  get(id: string): Promise<VideoCache | undefined>;
  set(id: string, cache: VideoCache): Promise<void>;
  /** Reads, changes and writes one cache in a transaction. */
  update(
    id: string,
    change: (cache: VideoCache | undefined) => VideoCache | undefined,
  ): Promise<VideoCache | undefined>;
}

export function adminVideoStore(db: Firestore): VideoStore {
  const col = db.collection("labVideos");
  const read = (data: unknown) => {
    const parsed = VideoCacheSchema.safeParse(data);
    return parsed.success ? parsed.data : undefined;
  };
  return {
    async get(id) {
      return read((await col.doc(id).get()).data());
    },
    async set(id, cache) {
      await col.doc(id).set(cache);
    },
    async update(id, change) {
      return db.runTransaction(async (tx) => {
        const ref = col.doc(id);
        const next = change(read((await tx.get(ref)).data()));
        if (next) tx.set(ref, next);
        return next;
      });
    },
  };
}

export function memoryVideoStore(): VideoStore & { docs: Map<string, VideoCache> } {
  const docs = new Map<string, VideoCache>();
  return {
    docs,
    async get(id) {
      return docs.get(id);
    },
    async set(id, cache) {
      docs.set(id, cache);
    },
    async update(id, change) {
      const next = change(docs.get(id));
      if (next) docs.set(id, next);
      return next;
    },
  };
}
