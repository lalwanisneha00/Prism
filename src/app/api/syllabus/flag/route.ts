import { z } from "zod";
import { getAdmin } from "@/lib/firebase/admin";
import { findSubject, subjects } from "@/lib/subjects";
import { canonicalSubject } from "@/lib/syllabusFix/alias";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { flagToChange, SyllabusFlagSchema } from "@/lib/syllabusFix/flags";
import { settleTouched } from "@/lib/syllabusFix/liveFixes";
import { adminProposalStore } from "@/lib/syllabusFix/proposalStore";
import { ProfileSchema, signedInStudent } from "@/lib/syllabusFix/studentAuth";
import { placeFor, toPrismCourse } from "@/lib/syllabusFix/studentHandoutCompare";
import { isRetired } from "@/lib/syllabusFix/tree";

/*
 * POST /api/syllabus/flag (syllabus fix, Phase 4). A student's flag on a course, chapter or topic.
 * Needs sign-in. The flag is kept (`syllabusFlags`) and its change becomes (or adds 1 point to) a
 * proposal. Nothing in the syllabus changes here: Phase 5 applies a proposal once enough students
 * from the branch agree.
 */

const RequestSchema = z.object({ flag: SyllabusFlagSchema, profile: ProfileSchema });

type Reply =
  | { ok: true; counted: boolean; status: string; live: boolean }
  | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
const fail = (kind: string, message: string, status: number) =>
  reply({ ok: false, kind, message }, status);

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return fail("invalid-request", "That report could not be read. Try again.", 400);
  const { flag } = body.data;
  // A merged course's retired copy reports on its main copy (same chapters and topics).
  const subject = findSubject(canonicalSubject(flag.subject));
  if (!subject || subject.university !== "pdeu" || isRetired(subject))
    return fail("not-found", "This course is not on Prism.", 404);

  const admin = await getAdmin();
  if (!admin) return fail("unavailable", "Reporting is not set up on this server.", 503);
  const student = await signedInStudent(req, admin, body.data.profile, "report a problem");
  if (!student.ok) return fail(student.kind, student.message, 401);

  const course = toPrismCourse(subject);
  const place = placeFor(course, student.profile);
  // "Not in my semester / branch" only means something when we know the student's own.
  if (!place || (flag.type.startsWith("course-") && !place.fromProfile))
    return fail(
      "no-profile",
      "Choose your branch and semester on My subjects first, so we know where you study.",
      400,
    );
  const branchCourses = subjects
    .filter((s) => s.university === "pdeu" && s.offerings?.some((o) => o.branch === place.branch))
    .map((s) => ({ id: s.id, name: s.name }));
  const result = flagToChange({ ...flag, subject: subject.id }, course, place, branchCourses);
  if (!result.ok) return fail("invalid-flag", result.message, 400);

  try {
    const store = adminProposalStore(admin.db);
    const at = new Date().toISOString();
    const saved = await store.submitFlag(
      {
        uid: student.uid,
        branch: place.branch,
        semester: place.sem,
        ...(student.profile.batchYear ? { batchYear: student.profile.batchYear } : {}),
        profileFrom: student.profileFrom,
        level: flag.type.startsWith("course-")
          ? "course"
          : flag.type.startsWith("chapter-")
            ? "chapter"
            : "topic",
        flag: { ...flag },
        at,
      },
      result.change,
      SYLLABUS_FIX_CONFIG.points.flag,
    );
    // Phase 5: this flag may be the one that makes the change go live.
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
      live,
    });
  } catch (err) {
    console.error("[api/syllabus/flag] save failed:", String(err).slice(0, 200));
    return fail("unavailable", "Could not save your report. Try again in a minute.", 503);
  }
}
