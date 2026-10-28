import { z } from "zod";
import { getAdmin } from "@/lib/firebase/admin";
import { findExperiment } from "@/lib/labs/experiment";
import { labVideosFor, type VideoReply } from "@/lib/labs/labVideos";
import { adminVideoStore } from "@/lib/labs/videoStore";
import { ProfileSchema, signedInStudent } from "@/lib/syllabusFix/studentAuth";
import { adminUsageStore, overDailyLimit } from "@/lib/syllabusFix/usageStore";
import { afterVideoFlag, shownVideos, videoCacheId } from "@/lib/labs/videoStore";

/*
 * Lab videos (syllabus fix, Phase 7B).
 * GET  /api/labs/videos?subject=&topic= → 1 to 3 ranked YouTube videos for the experiment. The
 *      list is cached in Firestore, so YouTube is asked once per experiment, not per page view.
 * POST /api/labs/videos { subject, topic, videoId, profile } → "Video doesn't match this
 *      experiment" (sign-in). Enough students hide it, and the next best video takes its place.
 */

const json = (body: unknown, status = 200, cache = "no-store") =>
  Response.json(body, { status, headers: { "cache-control": cache } });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const found = findExperiment(
    url.searchParams.get("subject") ?? "",
    url.searchParams.get("topic") ?? "",
  );
  if (!found) return json({ status: "not-found" } satisfies VideoReply, 404);
  const admin = await getAdmin();
  const reply = await labVideosFor(found, {
    key: process.env.YOUTUBE_API_KEY,
    store: admin ? adminVideoStore(admin.db) : null,
  });
  // Shared answers may sit in the CDN for an hour; "no key" and failures are not cached.
  return json(reply, 200, reply.status === "ok" ? "public, s-maxage=3600" : "no-store");
}

const FlagSchema = z.object({
  subject: z.string().min(1).max(160),
  topic: z.string().min(1).max(160),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/),
  profile: ProfileSchema,
});

export async function POST(req: Request) {
  const body = FlagSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return json(
      { ok: false, kind: "invalid-request", message: "That report could not be read." },
      400,
    );
  const found = findExperiment(body.data.subject, body.data.topic);
  if (!found) return json({ ok: false, kind: "not-found", message: "Unknown experiment." }, 404);
  const admin = await getAdmin();
  if (!admin)
    return json(
      { ok: false, kind: "unavailable", message: "Reporting is not set up on this server." },
      503,
    );
  const student = await signedInStudent(req, admin, body.data.profile, "report a video");
  if (!student.ok) return json({ ok: false, kind: student.kind, message: student.message }, 401);
  const limited = await overDailyLimit(adminUsageStore(admin.db), student.uid, "lessonFlag");
  if (limited) return limited;
  try {
    let hidden = false;
    let counted = false;
    const cache = await adminVideoStore(admin.db).update(
      videoCacheId(found.subject.id, found.topic.id),
      (before) => {
        if (!before || !before.videos.some((v) => v.id === body.data.videoId)) return undefined;
        const next = afterVideoFlag(before, body.data.videoId, student.uid);
        hidden = next.hidden;
        counted = next.counted;
        return next.cache;
      },
    );
    if (!cache)
      return json({ ok: false, kind: "not-found", message: "That video is not listed here." }, 404);
    return json({ ok: true, counted, hidden, videos: shownVideos(cache) });
  } catch (err) {
    console.error("[api/labs/videos] flag failed:", String(err).slice(0, 200));
    return json(
      { ok: false, kind: "unavailable", message: "Could not save your report. Try again." },
      503,
    );
  }
}
