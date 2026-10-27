import { z } from "zod";
import { getAdmin } from "@/lib/firebase/admin";
import { findSubject } from "@/lib/subjects";
import { LessonFlagSchema } from "@/lib/syllabusFix/flags";
import { adminLessonFlagStore, lessonFlagRecord } from "@/lib/syllabusFix/lessonFlagStore";
import { ProfileSchema, signedInStudent } from "@/lib/syllabusFix/studentAuth";

/*
 * POST /api/lesson/flag (syllabus fix, Phase 4): "something is wrong in this lesson". Needs
 * sign-in; any student who read the lesson may flag it (no branch check). One flag per student per
 * lesson version (the server uses the version students see now). Phase 5: enough flags from
 * different students mark it for one rebuild with their reports; a rebuilt lesson flagged as much
 * again goes to the admin instead (`state`: ok, needs_regeneration or review).
 */

const RequestSchema = z.object({ flag: LessonFlagSchema, profile: ProfileSchema });

type Reply =
  { ok: true; replaced: boolean; state: string } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
const fail = (kind: string, message: string, status: number) =>
  reply({ ok: false, kind, message }, status);

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return fail("invalid-request", "That report could not be read. Try again.", 400);
  const { flag } = body.data;
  // Prism's own subjects only: a student's own subject has no shared lesson to fix.
  const subject = findSubject(flag.subject);
  const known = subject?.chapters.some((c) => c.topics.some((t) => t.id === flag.topic));
  if (!known) return fail("not-found", "Reports are for Prism's own lessons.", 404);

  const admin = await getAdmin();
  if (!admin) return fail("unavailable", "Reporting is not set up on this server.", 503);
  const student = await signedInStudent(req, admin, body.data.profile, "report a problem");
  if (!student.ok) return fail(student.kind, student.message, 401);

  try {
    const saved = await adminLessonFlagStore(admin.db).submit(
      lessonFlagRecord(flag, student.uid, student.profile, new Date().toISOString()),
    );
    return reply({ ok: true, replaced: saved.replaced, state: saved.state });
  } catch (err) {
    console.error("[api/lesson/flag] save failed:", String(err).slice(0, 200));
    return fail("unavailable", "Could not save your report. Try again in a minute.", 503);
  }
}
