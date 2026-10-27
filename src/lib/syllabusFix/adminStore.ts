import type { Firestore } from "firebase-admin/firestore";
import { findSubject } from "@/lib/subjects";
import { resumeTrust, TrustSchema, type Trust } from "@/lib/syllabusFix/abuse";
import { lessonAfterAdmin, planDecision, planRevert } from "@/lib/syllabusFix/adminActions";
import { HistoryEntrySchema, type HistoryEntry } from "@/lib/syllabusFix/history";
import {
  LessonQualitySchema,
  LessonStatusSchema,
  type LessonQuality,
  type LessonStatus,
} from "@/lib/syllabusFix/lessonReview";
import type { LessonFlagRecord, memoryLessonFlagStore } from "@/lib/syllabusFix/lessonFlagStore";
import {
  EMPTY_OVERLAY,
  OverlaySchema,
  type AppliedChange,
  type Overlay,
} from "@/lib/syllabusFix/overlay";
import { ProposalSchema, VoteSchema, type Proposal } from "@/lib/syllabusFix/proposals";
import type { memoryProposalStore } from "@/lib/syllabusFix/proposalStore";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";

/*
 * What the admin page reads and changes (syllabus fix, Phase 6). Server-only: the routes check the
 * admin's sign-in first, and the Firestore rules deny every browser anyway. Reads stay small
 * (equality filters, limits), so one visit to the admin page costs a few hundred reads at most.
 * `syllabusAdmin/needsReview` remembers which Phase 2 import items the admin has checked.
 */

export type AdminDashboard = {
  overlay: Overlay;
  /** Live fixes (and reverted ones), newest first. */
  recent: AppliedChange[];
  conflicts: Proposal[];
  review: Proposal[];
  accepted: Proposal[];
  pending: Proposal[];
  lessons: LessonStatus[];
  quality: LessonQuality[];
  paused: Trust[];
  /** Import item id → when the admin marked it checked. */
  checked: Record<string, string>;
};

export type AdminResult = { ok: true; outcome?: string } | { ok: false; error: string };

type Admin = { uid: string };

export interface AdminSyllabusStore {
  dashboard(): Promise<AdminDashboard>;
  revert(proposalId: string, admin: Admin, at: string): Promise<AdminResult>;
  decide(
    proposalId: string,
    action: "approve" | "reject",
    admin: Admin,
    at: string,
  ): Promise<AdminResult>;
  lessonAction(lessonKey: string, action: "fine" | "regenerate", at: string): Promise<AdminResult>;
  /** The flags on a lesson's current version. */
  lessonFlags(lessonKey: string): Promise<LessonFlagRecord[]>;
  resume(uid: string, at: string): Promise<AdminResult>;
  markChecked(itemId: string, checked: boolean, at: string): Promise<AdminResult>;
}

const LIMIT = 200;
const fail = (error: string): AdminResult => ({ ok: false, error });

const parsedAll = <T>(docs: { data(): unknown }[], parse: (d: unknown) => T | undefined): T[] =>
  docs.flatMap((d) => {
    const v = parse(d.data());
    return v === undefined ? [] : [v];
  });

const recentOf = (overlay: Overlay) =>
  [...overlay.changes]
    .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1))
    .slice(0, SYLLABUS_FIX_CONFIG.admin.recentFixes);

/** The `checked` map of `syllabusAdmin/needsReview` (anything malformed is left out). */
function checkedOf(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object" || !("checked" in data)) return {};
  const checked = (data as { checked: unknown }).checked;
  if (!checked || typeof checked !== "object") return {};
  return Object.fromEntries(
    Object.entries(checked).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
}

export function adminSyllabusStore(db: Firestore): AdminSyllabusStore {
  const proposalsCol = db.collection("syllabusProposals");
  const overlayRef = db.collection("syllabusOverlay").doc("current");
  const historyCol = db.collection("syllabusHistory");
  const trustCol = db.collection("syllabusTrust");
  const statusCol = db.collection("lessonStatus");
  const checkedRef = db.collection("syllabusAdmin").doc("needsReview");
  const byStatus = (status: Proposal["status"]) =>
    proposalsCol.where("status", "==", status).limit(LIMIT).get();
  const proposals = (snap: { docs: { data(): unknown }[] }) =>
    parsedAll(snap.docs, (d) => ProposalSchema.safeParse(d).data);

  return {
    async dashboard() {
      const [overlaySnap, conflicts, review, accepted, pending, lessons, quality, paused, checked] =
        await Promise.all([
          overlayRef.get(),
          byStatus("conflict"),
          byStatus("review"),
          byStatus("accepted"),
          byStatus("pending"),
          statusCol.where("state", "==", "review").limit(LIMIT).get(),
          db.collection("lessonQuality").where("warning", "==", true).limit(LIMIT).get(),
          trustCol.where("paused", "==", true).limit(LIMIT).get(),
          checkedRef.get(),
        ]);
      const overlay = OverlaySchema.safeParse(overlaySnap.data()).data ?? EMPTY_OVERLAY;
      return {
        overlay,
        recent: recentOf(overlay),
        conflicts: proposals(conflicts),
        review: proposals(review),
        accepted: proposals(accepted),
        pending: proposals(pending),
        lessons: parsedAll(lessons.docs, (d) => LessonStatusSchema.safeParse(d).data),
        quality: parsedAll(quality.docs, (d) => LessonQualitySchema.safeParse(d).data),
        paused: parsedAll(paused.docs, (d) => TrustSchema.safeParse(d).data),
        checked: checkedOf(checked.data()),
      };
    },
    async revert(pid, admin, at) {
      const ref = proposalsCol.doc(pid);
      return db.runTransaction(async (tx) => {
        const [snap, overlaySnap] = await tx.getAll(ref, overlayRef);
        const proposal = ProposalSchema.safeParse(snap.data()).data;
        if (!proposal) return fail("That suggestion was not found.");
        const [votes, history] = await Promise.all([
          tx.get(ref.collection("votes")),
          tx.get(historyCol.where("cause", "==", `proposal ${pid}`)),
        ]);
        const voteList = parsedAll(votes.docs, (d) => VoteSchema.safeParse(d).data);
        const uids = [...new Set(voteList.map((v) => v.uid))];
        const trustSnaps = uids.length ? await tx.getAll(...uids.map((u) => trustCol.doc(u))) : [];
        const trusts = new Map(
          parsedAll(trustSnaps, (d) => TrustSchema.safeParse(d).data).map((t) => [t.uid, t]),
        );
        const plan = planRevert({
          proposal,
          overlay: OverlaySchema.safeParse(overlaySnap.data()).data ?? EMPTY_OVERLAY,
          history: parsedAll(history.docs, (d) => HistoryEntrySchema.safeParse(d).data),
          votes: voteList,
          trusts,
          admin,
          at,
        });
        if ("error" in plan) return fail(plan.error);
        tx.set(ref, plan.proposal);
        tx.set(overlayRef, plan.overlay);
        for (const h of plan.history) tx.set(historyCol.doc(h.id), h);
        for (const t of plan.trusts) tx.set(trustCol.doc(t.uid), t);
        return { ok: true as const, outcome: "reverted" };
      });
    },
    async decide(pid, action, admin, at) {
      const ref = proposalsCol.doc(pid);
      return db.runTransaction(async (tx) => {
        const [snap, overlaySnap] = await tx.getAll(ref, overlayRef);
        const proposal = ProposalSchema.safeParse(snap.data()).data;
        if (!proposal) return fail("That suggestion was not found.");
        const rivals = proposal.targetKey
          ? proposals(await tx.get(proposalsCol.where("targetKey", "==", proposal.targetKey)))
          : [];
        const plan = planDecision({
          proposal,
          action,
          rivals,
          overlay: OverlaySchema.safeParse(overlaySnap.data()).data ?? EMPTY_OVERLAY,
          course: findSubject(proposal.subject),
          admin,
          at,
        });
        if ("error" in plan) return fail(plan.error);
        for (const p of plan.proposals) tx.set(proposalsCol.doc(p.id), p);
        if (plan.overlay) tx.set(overlayRef, plan.overlay);
        for (const h of plan.history) tx.set(historyCol.doc(h.id), h);
        return { ok: true as const, outcome: plan.outcome };
      });
    },
    async lessonAction(lessonKey, action, at) {
      const ref = statusCol.doc(lessonKey);
      return db.runTransaction(async (tx) => {
        const status = LessonStatusSchema.safeParse((await tx.get(ref)).data()).data;
        if (!status) return fail("That lesson has no reports.");
        tx.set(ref, lessonAfterAdmin(status, action, at));
        return { ok: true as const, outcome: action };
      });
    },
    async lessonFlags(lessonKey) {
      const status = LessonStatusSchema.safeParse(
        (await statusCol.doc(lessonKey).get()).data(),
      ).data;
      if (!status) return [];
      const snap = await db
        .collection("lessonFlags")
        .where("lessonKey", "==", lessonKey)
        .where("version", "==", status.version)
        .limit(50)
        .get();
      return snap.docs.map((d) => d.data() as LessonFlagRecord);
    },
    async resume(uid, at) {
      const ref = trustCol.doc(uid);
      return db.runTransaction(async (tx) => {
        const trust = TrustSchema.safeParse((await tx.get(ref)).data()).data;
        if (!trust) return fail("That student has no record.");
        tx.set(ref, resumeTrust(trust, at));
        return { ok: true as const };
      });
    },
    async markChecked(itemId, checked, at) {
      await db.runTransaction(async (tx) => {
        const now = checkedOf((await tx.get(checkedRef)).data());
        if (checked) now[itemId] = at;
        else delete now[itemId];
        tx.set(checkedRef, { checked: now, updatedAt: at });
      });
      return { ok: true };
    },
  };
}

/** In memory, on top of the in-memory proposal and lesson stores (tests). */
export function memoryAdminStore(
  ps: ReturnType<typeof memoryProposalStore>,
  ls: ReturnType<typeof memoryLessonFlagStore>,
): AdminSyllabusStore & { checked: Record<string, string> } {
  const checked: Record<string, string> = {};
  const all = () => [...ps.proposals.values()];
  const votesOf = (pid: string) =>
    [...ps.votes].filter(([k]) => k.startsWith(`${pid}/`)).map(([, v]) => v);
  const writeHistory = (entries: readonly HistoryEntry[]) => {
    for (const h of entries) {
      const i = ps.live.history.findIndex((x) => x.id === h.id);
      if (i >= 0) ps.live.history[i] = h;
      else ps.live.history.push(h);
    }
  };
  return {
    checked,
    async dashboard() {
      const with_ = (s: Proposal["status"]) => all().filter((p) => p.status === s);
      return {
        overlay: ps.live.overlay,
        recent: recentOf(ps.live.overlay),
        conflicts: with_("conflict"),
        review: with_("review"),
        accepted: with_("accepted"),
        pending: with_("pending"),
        lessons: [...ls.statuses.values()].filter((s) => s.state === "review"),
        quality: [...ls.quality.values()].filter((q) => q.warning),
        paused: [...ps.trusts.values()].filter((t) => t.paused),
        checked: { ...checked },
      };
    },
    async revert(pid, admin, at) {
      const proposal = ps.proposals.get(pid);
      if (!proposal) return fail("That suggestion was not found.");
      const plan = planRevert({
        proposal,
        overlay: ps.live.overlay,
        history: ps.live.history.filter((h) => h.cause === `proposal ${pid}`),
        votes: votesOf(pid),
        trusts: ps.trusts,
        admin,
        at,
      });
      if ("error" in plan) return fail(plan.error);
      ps.proposals.set(pid, plan.proposal);
      ps.live.overlay = plan.overlay;
      writeHistory(plan.history);
      for (const t of plan.trusts) ps.trusts.set(t.uid, t);
      return { ok: true, outcome: "reverted" };
    },
    async decide(pid, action, admin, at) {
      const proposal = ps.proposals.get(pid);
      if (!proposal) return fail("That suggestion was not found.");
      const plan = planDecision({
        proposal,
        action,
        rivals: proposal.targetKey ? all().filter((p) => p.targetKey === proposal.targetKey) : [],
        overlay: ps.live.overlay,
        course: findSubject(proposal.subject),
        admin,
        at,
      });
      if ("error" in plan) return fail(plan.error);
      for (const p of plan.proposals) ps.proposals.set(p.id, p);
      if (plan.overlay) ps.live.overlay = plan.overlay;
      writeHistory(plan.history);
      return { ok: true, outcome: plan.outcome };
    },
    async lessonAction(lessonKey, action, at) {
      const status = ls.statuses.get(lessonKey);
      if (!status) return fail("That lesson has no reports.");
      ls.statuses.set(lessonKey, lessonAfterAdmin(status, action, at));
      return { ok: true, outcome: action };
    },
    async lessonFlags(lessonKey) {
      const status = ls.statuses.get(lessonKey);
      return [...ls.flags.values()].filter(
        (f) => f.lessonKey === lessonKey && f.version === status?.version,
      );
    },
    async resume(uid, at) {
      const trust = ps.trusts.get(uid);
      if (!trust) return fail("That student has no record.");
      ps.trusts.set(uid, resumeTrust(trust, at));
      return { ok: true };
    },
    async markChecked(itemId, on, at) {
      if (on) checked[itemId] = at;
      else delete checked[itemId];
      return { ok: true };
    },
  };
}
