import { getAdmin } from "@/lib/firebase/admin";
import { describeChange } from "@/lib/syllabusFix/changeNames";
import { contributionsOf, type Contribution } from "@/lib/syllabusFix/credits";
import { liveOverlay } from "@/lib/syllabusFix/liveFixes";
import { adminProposalStore } from "@/lib/syllabusFix/proposalStore";
import { signedInStudent } from "@/lib/syllabusFix/studentAuth";

/*
 * GET /api/syllabus/contributions (syllabus fix, Phase 7): the live fixes the signed-in student
 * helped with, newest first, for "Your fix went live" and the count on the account page. One read
 * of their credits record; the live fixes come from the server's five-minute copy.
 */

type Reply = { ok: true; fixes: Contribution[] } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "private, no-store" } });

export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return reply({ ok: true, fixes: [] });
  const student = await signedInStudent(req, admin, {}, "see your fixes");
  if (!student.ok) return reply({ ok: false, kind: student.kind, message: student.message }, 401);
  try {
    const store = adminProposalStore(admin.db);
    const [credits, overlay] = await Promise.all([store.credits(student.uid), liveOverlay(store)]);
    return reply({ ok: true, fixes: contributionsOf(credits, overlay, describeChange) });
  } catch (err) {
    console.error("[api/syllabus/contributions] read failed:", String(err).slice(0, 200));
    return reply(
      { ok: false, kind: "unavailable", message: "Could not load your fixes now." },
      503,
    );
  }
}
