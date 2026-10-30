import { z } from "zod";
import { getAdmin } from "@/lib/firebase/admin";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { forgetOverlay } from "@/lib/syllabusFix/liveFixes";
import { adminProposalStore } from "@/lib/syllabusFix/proposalStore";
import { ProfileSchema, signedInStudent } from "@/lib/syllabusFix/studentAuth";
import { adminUsageStore, overDailyLimit } from "@/lib/syllabusFix/usageStore";

/*
 * POST /api/syllabus/vote (syllabus fix, Phase 5): a student's answer to "N students say ...
 * Agree?". Agree = +1, Disagree = -1, Not sure = 0 (only remembered, so the prompt is not asked
 * again). Needs sign-in and the student's branch and semester; votes only count for students of the
 * proposal's branch and semester. A vote that reaches the rule makes the change go live.
 */

const RequestSchema = z.object({
  proposalId: z.string().min(1).max(200),
  kind: z.enum(["agree", "disagree", "unsure"]),
  profile: ProfileSchema,
});

type Reply =
  | { ok: true; counted: boolean; status: string; live: boolean }
  | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
const fail = (kind: string, message: string, status: number) =>
  reply({ ok: false, kind, message }, status);

const POINTS = {
  agree: SYLLABUS_FIX_CONFIG.points.agree,
  disagree: SYLLABUS_FIX_CONFIG.points.disagree,
  unsure: 0,
} as const;

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return fail("invalid-request", "That answer could not be read. Try again.", 400);
  const admin = await getAdmin();
  if (!admin) return fail("unavailable", "Voting is not set up on this server.", 503);
  const student = await signedInStudent(req, admin, body.data.profile, "answer");
  if (!student.ok) return fail(student.kind, student.message, 401);
  const { branch, semester, batchYear } = student.profile;
  if (!branch || !semester)
    return fail("no-profile", "Choose your branch and semester on My subjects first.", 400);

  const limited = await overDailyLimit(adminUsageStore(admin.db), student.uid, "vote");
  if (limited) return limited;

  try {
    const store = adminProposalStore(admin.db);
    const at = new Date().toISOString();
    const { kind, proposalId } = body.data;
    const vote = await store.castVote({
      proposalId,
      uid: student.uid,
      kind,
      points: POINTS[kind],
      branch,
      semester,
      ...(batchYear ? { batchYear } : {}),
      profileFrom: student.profileFrom,
      at,
    });
    if (vote.status === null) return fail("not-found", "That suggestion is no longer open.", 404);
    // A repeat Agree re-checks the rule too, so a proposal that should be live never stays stuck.
    const settled =
      kind === "agree" && vote.status === "pending" ? await store.settle(proposalId, at) : null;
    const live = settled?.verdict.action === "apply";
    if (live) forgetOverlay();
    return reply({ ok: true, counted: vote.counted, status: settled?.status ?? vote.status, live });
  } catch (err) {
    console.error("[api/syllabus/vote] save failed:", String(err).slice(0, 200));
    return fail("unavailable", "Could not save your answer. Try again in a minute.", 503);
  }
}
