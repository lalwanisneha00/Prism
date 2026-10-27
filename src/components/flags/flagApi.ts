import { getSettings } from "@/lib/storage/progress";
import type { Candidate } from "@/lib/syllabusFix/missingSubject";

/*
 * Sending a flag from the app (syllabus fix, Phase 4). The routes check sign-in and read the
 * student's synced profile; the device's profile is sent as a fallback.
 */

export type Profile = { branch?: string; semester?: number; batchYear?: number };

export type FlagReply =
  | {
      ok: true;
      counted?: boolean;
      status?: string;
      replaced?: boolean;
      linked?: boolean;
      candidates?: Candidate[];
      /** Phase 5: this report made the fix go live. */
      live?: boolean;
      /** Phase 5, lesson flags: ok, needs_regeneration or review. */
      state?: string;
      /** Phase 5, "Agree?" prompts: the suggestion to ask about, or null. */
      prompt?: { proposalId: string; text: string; supporters: number } | null;
    }
  | { ok: false; kind: string; message: string };

export async function deviceProfile(): Promise<Profile> {
  const s = await getSettings().catch(() => undefined);
  return {
    ...(s?.branch ? { branch: s.branch } : {}),
    ...(s?.semester ? { semester: s.semester } : {}),
    ...(s?.batchYear ? { batchYear: s.batchYear } : {}),
  };
}

export async function postFlag(url: string, body: unknown, token?: string): Promise<FlagReply> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as FlagReply | null;
    if (data && typeof data === "object" && "ok" in data) return data;
    if (res.status === 429)
      return { ok: false, kind: "rate-limited", message: "Too many reports today. Try tomorrow." };
    return { ok: false, kind: "unavailable", message: "Prism could not be reached. Try again." };
  } catch {
    return { ok: false, kind: "offline", message: "You seem to be offline. Try again later." };
  }
}

/** The thank-you line after a syllabus flag is saved. */
export function thanksFor(reply: { counted?: boolean; status?: string; live?: boolean }): string {
  if (reply.live) return "Thanks! Enough students agreed, so this fix is now live for everyone.";
  if (reply.status === "applied") return "Thanks! This was already fixed.";
  if (reply.status === "rejected" || reply.status === "conflict" || reply.status === "review")
    return "Thanks! This one is already being reviewed.";
  if (!reply.counted) return "You reported this already. Thanks!";
  return "Thanks! Your report is counted. It goes live once another student from your branch agrees.";
}

/** The thank-you line after a lesson flag is saved. */
export function lessonThanksFor(reply: { replaced?: boolean; state?: string }): string {
  if (reply.state === "needs_regeneration")
    return "Thanks! Enough students reported problems, so this lesson will be rewritten with your notes the next time someone opens it.";
  if (reply.state === "review")
    return "Thanks! Students reported issues here, so it is being reviewed.";
  if (reply.replaced) return "Thanks! Your earlier report on this lesson was updated.";
  return "Thanks! Your report is saved. When enough students report a lesson, it is rewritten.";
}
