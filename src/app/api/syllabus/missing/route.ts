import { z } from "zod";
import { getAdmin } from "@/lib/firebase/admin";
import { findSubject, subjects } from "@/lib/subjects";
import { canonicalSubject } from "@/lib/syllabusFix/alias";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { MissingSubjectSchema, missingSubjectChange } from "@/lib/syllabusFix/flags";
import { findCandidates, type Candidate } from "@/lib/syllabusFix/missingSubject";
import { settleTouched } from "@/lib/syllabusFix/liveFixes";
import { adminProposalStore } from "@/lib/syllabusFix/proposalStore";
import { ProfileSchema, signedInStudent } from "@/lib/syllabusFix/studentAuth";
import { isRetired } from "@/lib/syllabusFix/tree";
import { adminUsageStore, overDailyLimit } from "@/lib/syllabusFix/usageStore";

/*
 * POST /api/syllabus/missing (syllabus fix, Phase 4): "My subject isn't here".
 * - `check: true`: which Prism courses it might be ("Is it this one?"). No sign-in, nothing stored.
 * - otherwise: needs sign-in. With `linkTo`, the existing course is suggested for the student's
 *   branch and semester (linked, never copied); without, a new course is suggested. Either way it
 *   is a proposal (1 point), applied in Phase 5 once enough students agree.
 */

const RequestSchema = z.object({
  missing: MissingSubjectSchema,
  check: z.boolean().optional(),
  profile: ProfileSchema,
});

type Reply =
  | { ok: true; candidates: Candidate[] }
  | { ok: true; counted: boolean; status: string; linked: boolean }
  | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
const fail = (kind: string, message: string, status: number) =>
  reply({ ok: false, kind, message }, status);

const listed = () =>
  subjects.filter(
    (s) => s.university === "pdeu" && !isRetired(s) && (s.offerings?.length ?? 0) > 0,
  );

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return fail("invalid-request", "Check the course name and semester, then try again.", 400);
  const { missing, check } = body.data;
  if (check)
    return reply({
      ok: true,
      candidates: findCandidates(missing, body.data.profile.branch, listed()),
    });

  const admin = await getAdmin();
  if (!admin) return fail("unavailable", "Suggesting subjects is not set up on this server.", 503);
  const student = await signedInStudent(req, admin, body.data.profile, "suggest a subject");
  if (!student.ok) return fail(student.kind, student.message, 401);
  const branch = student.profile.branch;
  if (!branch)
    return fail(
      "no-profile",
      "Choose your branch on My subjects first, so we know where you study.",
      400,
    );

  let existing: { id: string; name: string } | undefined;
  if (missing.linkTo) {
    const s = findSubject(canonicalSubject(missing.linkTo));
    if (!s || s.university !== "pdeu" || isRetired(s))
      return fail("not-found", "That course is not on Prism.", 404);
    if (s.offerings?.some((o) => o.branch === branch && o.semester === missing.semester))
      return fail("already-listed", `${s.name} is already in your semester's list.`, 409);
    existing = { id: s.id, name: s.name };
  }

  const limited = await overDailyLimit(adminUsageStore(admin.db), student.uid, "missing");
  if (limited) return limited;

  try {
    const store = adminProposalStore(admin.db);
    const at = new Date().toISOString();
    const saved = await store.submitFlag(
      {
        uid: student.uid,
        branch,
        semester: missing.semester,
        ...(student.profile.batchYear ? { batchYear: student.profile.batchYear } : {}),
        profileFrom: student.profileFrom,
        level: "missing-subject",
        flag: { ...missing, ...(existing ? { linkTo: existing.id } : {}) },
        at,
      },
      missingSubjectChange(missing, branch, existing),
      SYLLABUS_FIX_CONFIG.points.flag,
    );
    // Phase 5: linking an existing course can go live; a new course always waits for the admin.
    const live = saved.counted
      ? (await settleTouched(
          store,
          [{ id: saved.proposalId, points: Infinity, status: "pending" }],
          at,
        )) > 0
      : false;
    return reply({
      ok: true,
      counted: saved.counted,
      status: live ? "applied" : saved.status,
      linked: Boolean(existing),
    });
  } catch (err) {
    console.error("[api/syllabus/missing] save failed:", String(err).slice(0, 200));
    return fail("unavailable", "Could not save your suggestion. Try again in a minute.", 503);
  }
}
