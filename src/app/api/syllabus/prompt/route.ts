import { getAdmin } from "@/lib/firebase/admin";
import { z } from "zod";
import { findSubject } from "@/lib/subjects";
import { LiveChangeSchema } from "@/lib/syllabusFix/overlay";
import { adminProposalStore } from "@/lib/syllabusFix/proposalStore";
import { ProfileSchema, signedInStudent } from "@/lib/syllabusFix/studentAuth";
import { plainChange, type ChangeNames } from "@/lib/syllabusFix/voting";

/*
 * POST /api/syllabus/prompt (syllabus fix, Phase 5): one pending suggestion for the student's own
 * branch and semester that they have not answered yet, as a sentence for the "Agree?" prompt.
 * The app asks at most once per visit. Needs sign-in (so we know what they already answered).
 */

const RequestSchema = z.object({ profile: ProfileSchema });

export type SyllabusPrompt = { proposalId: string; text: string; supporters: number };

type Reply =
  { ok: true; prompt: SyllabusPrompt | null } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
const fail = (kind: string, message: string, status: number) =>
  reply({ ok: false, kind, message }, status);

/** Names of what a change is about, from the syllabus. */
function namesOf(change: z.infer<typeof LiveChangeSchema>): ChangeNames {
  const subject = findSubject(change.prism?.subject ?? change.to?.subject ?? "");
  const chapter = subject?.chapters.find((c) => c.id === change.prism?.chapter);
  const topic = chapter?.topics.find((t) => t.id === change.prism?.topic);
  const to = subject?.chapters.find((c) => c.id === (change.to?.chapter ?? change.prism?.chapter));
  return {
    ...(subject ? { course: subject.name } : {}),
    ...(chapter ? { chapter: chapter.name } : to ? { chapter: to.name } : {}),
    ...(topic ? { topic: topic.name } : {}),
    ...(to ? { toChapter: to.name } : {}),
  };
}

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("invalid-request", "That request could not be read.", 400);
  const admin = await getAdmin();
  if (!admin) return reply({ ok: true, prompt: null });
  const student = await signedInStudent(req, admin, body.data.profile, "answer");
  if (!student.ok) return fail(student.kind, student.message, 401);
  const { branch, semester } = student.profile;
  if (!branch || !semester) return reply({ ok: true, prompt: null });

  try {
    const store = adminProposalStore(admin.db);
    // Suggestions someone backs, strongest first; never the student's own (they voted on it).
    const pending = (await store.pendingFor(branch, semester, 20))
      .filter((p) => p.points > 0 && p.voters > 0)
      .sort((a, b) => b.points - a.points);
    const answered = await store.votedOn(
      student.uid,
      pending.map((p) => p.id),
    );
    for (const p of pending) {
      if (answered.has(p.id)) continue;
      const change = LiveChangeSchema.safeParse(p.change);
      if (!change.success) continue;
      return reply({
        ok: true,
        prompt: {
          proposalId: p.id,
          text: plainChange(change.data, namesOf(change.data)),
          supporters: p.voters,
        },
      });
    }
    return reply({ ok: true, prompt: null });
  } catch (err) {
    console.error("[api/syllabus/prompt] read failed:", String(err).slice(0, 200));
    return fail("unavailable", "Could not load suggestions right now.", 503);
  }
}
