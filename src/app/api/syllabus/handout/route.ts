import { z } from "zod";
import { getAdmin } from "@/lib/firebase/admin";
import { findSubject, subjects } from "@/lib/subjects";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { settleTouched } from "@/lib/syllabusFix/liveFixes";
import { adminProposalStore } from "@/lib/syllabusFix/proposalStore";
import { ProfileSchema, signedInStudent } from "@/lib/syllabusFix/studentAuth";
import { isRetired } from "@/lib/syllabusFix/tree";
import { isEmptyHandout, StudentHandoutSchema } from "@/lib/syllabusFix/studentHandout";
import {
  compareStudentHandout,
  placeFor,
  summarizeChanges,
  toPrismCourse,
} from "@/lib/syllabusFix/studentHandoutCompare";

/*
 * POST /api/syllabus/handout (syllabus fix, Phase 3). A student's course handout, already read on
 * their device and checked by them, compared with Prism's course on the server.
 * - `dryRun: true`: only says what differs (no sign-in needed, nothing stored).
 * - otherwise: needs sign-in; each difference becomes (or adds 3 points to) a proposal. Nothing in
 *   the syllabus changes here: proposals go live only after enough students agree (Phase 5).
 */

const RequestSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  dryRun: z.boolean().optional(),
  handout: StudentHandoutSchema,
  profile: ProfileSchema,
});

type Reply =
  | {
      ok: true;
      summary: string[];
      changes: number;
      saved?: { proposals: number; counted: number; live: number };
    }
  | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
const fail = (kind: string, message: string, status: number) =>
  reply({ ok: false, kind, message }, status);

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return fail("invalid-request", "That handout could not be read. Try again.", 400);
  const { handout, dryRun } = body.data;
  const subject = findSubject(body.data.subject);
  if (!subject || subject.university !== "pdeu" || isRetired(subject))
    return fail("not-found", "This course is not on Prism.", 404);
  if (isEmptyHandout(handout))
    return fail("empty", "The handout has no units or experiments to compare.", 400);

  let profile = body.data.profile;
  let profileFrom: "cloud" | "device" = "device";
  let uid: string | null = null;
  const admin = dryRun ? null : await getAdmin();
  if (!dryRun) {
    if (!admin) return fail("unavailable", "Saving fixes is not set up on this server.", 503);
    const student = await signedInStudent(req, admin, profile, "send your handout");
    if (!student.ok) return fail(student.kind, student.message, 401);
    ({ uid, profile, profileFrom } = student);
  }

  const course = toPrismCourse(subject);
  const place = placeFor(course, profile);
  if (!place) return fail("not-found", "This course is not taught in any branch on Prism.", 404);
  const branchCourses = subjects
    .filter((s) => s.offerings?.some((o) => o.branch === place.branch))
    .map(toPrismCourse);
  const changes = compareStudentHandout(handout, course, branchCourses, place).slice(
    0,
    SYLLABUS_FIX_CONFIG.maxChangesPerHandout,
  );
  const summary = summarizeChanges(changes);
  if (dryRun || changes.length === 0 || !admin || !uid)
    return reply({ ok: true, summary, changes: changes.length });

  try {
    const store = adminProposalStore(admin.db);
    const at = new Date().toISOString();
    const saved = await store.submitHandout(
      {
        uid,
        subject: subject.id,
        branch: place.branch,
        semester: place.sem,
        ...(profile.batchYear ? { batchYear: profile.batchYear } : {}),
        profileFrom,
        handout,
        at,
      },
      changes,
      SYLLABUS_FIX_CONFIG.points.handout,
    );
    // Phase 5: changes this handout brought to the auto-apply rule go live now.
    const live = await settleTouched(store, saved.touched, at);
    return reply({
      ok: true,
      summary,
      changes: changes.length,
      saved: { proposals: saved.proposals, counted: saved.counted, live },
    });
  } catch (err) {
    console.error("[api/syllabus/handout] save failed:", String(err).slice(0, 200));
    return fail("unavailable", "Could not save your handout. Try again in a minute.", 503);
  }
}
