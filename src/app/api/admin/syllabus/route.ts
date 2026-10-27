import { z } from "zod";
import needsReviewData from "@/data/syllabus/needs-review.json";
import { getAdmin } from "@/lib/firebase/admin";
import { branches, findSubject, subjects } from "@/lib/subjects";
import { signedInAdmin } from "@/lib/syllabusFix/adminAuth";
import { adminSyllabusStore, type AdminResult } from "@/lib/syllabusFix/adminStore";
import { adminView, NeedsReviewSchema, type AdminView } from "@/lib/syllabusFix/adminView";
import { describeChange } from "@/lib/syllabusFix/changeNames";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { forgetOverlay } from "@/lib/syllabusFix/liveFixes";

/*
 * /api/admin/syllabus (syllabus fix, Phase 6): the admin dashboard. GET = every queue in one
 * reply; POST = one decision (revert a live fix, approve or reject a suggestion, settle a lesson,
 * lift a paused student, tick an import item). Only accounts in ADMIN_UID get past the check,
 * which runs here on the server for every request.
 */

const id = z.string().min(1).max(300);
const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("revert"), proposalId: id }),
  z.object({ action: z.enum(["approve", "reject"]), proposalId: id }),
  z.object({ action: z.enum(["lesson-fine", "lesson-regenerate", "lesson-flags"]), lessonKey: id }),
  z.object({ action: z.literal("resume"), uid: id }),
  z.object({ action: z.literal("check"), itemId: id, checked: z.boolean() }),
]);

export type AdminLessonFlag = { type: string; excerpt?: string; note?: string; at: string };

type Reply =
  | { ok: true; view?: AdminView; outcome?: string; flags?: AdminLessonFlag[] }
  | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
const fail = (kind: string, message: string, status: number) =>
  reply({ ok: false, kind, message }, status);

const needsReview = NeedsReviewSchema.parse(needsReviewData).items;

type Guard =
  { error: Response } | { admin: NonNullable<Awaited<ReturnType<typeof getAdmin>>>; uid: string };

async function guard(req: Request): Promise<Guard> {
  const admin = await getAdmin();
  if (!admin) return { error: fail("unavailable", "Firebase is not set up on this server.", 503) };
  const check = await signedInAdmin(req, admin);
  if (!check.ok) return { error: fail(check.kind, check.message, check.status) };
  return { admin, uid: check.uid };
}

export async function GET(req: Request) {
  const g = await guard(req);
  if ("error" in g) return g.error;
  try {
    const dashboard = await adminSyllabusStore(g.admin.db).dashboard();
    return reply({
      ok: true,
      view: adminView(dashboard, {
        find: findSubject,
        describe: describeChange,
        catalogue: subjects,
        branches: branches.map((b) => b.id),
        needsReview,
        rule: SYLLABUS_FIX_CONFIG.autoApply,
      }),
    });
  } catch (err) {
    console.error("[api/admin/syllabus] read failed:", String(err).slice(0, 200));
    return fail("unavailable", "Could not load the queues. Try again in a minute.", 503);
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function POST(req: Request) {
  const body = ActionSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("invalid-request", "That action could not be read.", 400);
  const g = await guard(req);
  if ("error" in g) return g.error;
  const store = adminSyllabusStore(g.admin.db);
  const at = new Date().toISOString();
  const admin = { uid: g.uid };
  const a = body.data;
  try {
    if (a.action === "lesson-flags") {
      const flags = (await store.lessonFlags(a.lessonKey)).map((f) => ({
        type: String(f.type),
        ...(str(f.excerpt) ? { excerpt: str(f.excerpt) } : {}),
        ...(str(f.note) ? { note: str(f.note) } : {}),
        at: String(f.at),
      }));
      return reply({ ok: true, flags });
    }
    let result: AdminResult;
    switch (a.action) {
      case "revert":
        result = await store.revert(a.proposalId, admin, at);
        break;
      case "approve":
      case "reject":
        result = await store.decide(a.proposalId, a.action, admin, at);
        break;
      case "lesson-fine":
      case "lesson-regenerate":
        result = await store.lessonAction(
          a.lessonKey,
          a.action === "lesson-fine" ? "fine" : "regenerate",
          at,
        );
        break;
      case "resume":
        result = await store.resume(a.uid, at);
        break;
      case "check":
        result = await store.markChecked(a.itemId, a.checked, at);
        break;
    }
    if (!result.ok) return fail("not-possible", result.error, 409);
    // This server shows the change at once; other servers and browsers within a few minutes.
    if (a.action === "revert" || a.action === "approve") forgetOverlay();
    return reply({ ok: true, ...(result.outcome ? { outcome: result.outcome } : {}) });
  } catch (err) {
    console.error("[api/admin/syllabus] action failed:", String(err).slice(0, 200));
    return fail("unavailable", "Could not save that. Try again in a minute.", 503);
  }
}
