import { getAdmin } from "@/lib/firebase/admin";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { liveOverlay } from "@/lib/syllabusFix/liveFixes";
import { adminProposalStore } from "@/lib/syllabusFix/proposalStore";

/*
 * GET /api/syllabus/overlay (syllabus fix, Phase 5): the syllabus fixes students voted through,
 * which the app lays over its built-in syllabus. Public (it is the same for everyone) and cached
 * by the CDN for a few minutes, so it costs about one Firestore read per five minutes.
 */

export async function GET() {
  const admin = await getAdmin();
  const overlay = await liveOverlay(admin ? adminProposalStore(admin.db) : null);
  const ttl = SYLLABUS_FIX_CONFIG.overlayCacheSeconds;
  return Response.json(overlay, {
    headers: {
      "cache-control": `public, max-age=60, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
    },
  });
}
