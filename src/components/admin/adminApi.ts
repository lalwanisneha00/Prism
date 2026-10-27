import type { AdminLessonFlag } from "@/app/api/admin/syllabus/route";
import type { AdminView } from "@/lib/syllabusFix/adminView";

/*
 * Talking to /api/admin/syllabus from the admin page (syllabus fix, Phase 6). The server checks
 * the sign-in and ADMIN_UID on every request; this file only sends the token and reads replies.
 */

export type AdminAction =
  | { action: "revert"; proposalId: string }
  | { action: "approve" | "reject"; proposalId: string }
  | { action: "lesson-fine" | "lesson-regenerate" | "lesson-flags"; lessonKey: string }
  | { action: "resume"; uid: string }
  | { action: "check"; itemId: string; checked: boolean };

export type AdminReply =
  | { ok: true; view?: AdminView; outcome?: string; flags?: AdminLessonFlag[] }
  | { ok: false; kind: string; message: string };

async function send(token: string, init?: RequestInit): Promise<AdminReply> {
  try {
    const res = await fetch("/api/admin/syllabus", {
      ...init,
      headers: { ...init?.headers, authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as AdminReply | null;
    if (data && typeof data === "object" && "ok" in data) return data;
    if (res.status === 429)
      return { ok: false, kind: "rate-limited", message: "Too many requests. Wait a minute." };
    return { ok: false, kind: "unavailable", message: "Prism could not be reached. Try again." };
  } catch {
    return { ok: false, kind: "offline", message: "You seem to be offline. Try again later." };
  }
}

export const loadAdminView = (token: string) => send(token);

export const sendAdminAction = (token: string, action: AdminAction) =>
  send(token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(action),
  });

/** What the admin sees after a decision. */
export function outcomeText(action: AdminAction["action"], outcome?: string): string {
  if (action === "revert") return "Reverted. Students see the old syllabus within a few minutes.";
  if (outcome === "live") return "Approved. The fix is live within a few minutes.";
  if (outcome === "accepted")
    return "Accepted. This kind of change waits for the next syllabus data update.";
  if (action === "reject") return "Rejected.";
  if (action === "lesson-fine") return "Marked as fine. Its flags were cleared.";
  if (action === "lesson-regenerate") return "It will be rewritten the next time someone opens it.";
  if (action === "resume") return "This student's votes count again.";
  return "Saved.";
}
